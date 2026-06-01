import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import * as cheerio from "cheerio";
import TurndownService from "turndown";
import { execSync } from "child_process";
import { logger } from "./logger";

const turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });

// ─── Browser singleton ────────────────────────────────────────────────────────
let _browser: Browser | null = null;
let _launchPromise: Promise<Browser> | null = null;

const CHROMIUM_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--disable-software-rasterizer",
  "--disable-extensions",
  "--disable-background-networking",
  "--disable-default-apps",
  "--disable-sync",
  "--mute-audio",
  "--no-first-run",
  "--disable-blink-features=AutomationControlled",
  "--disable-infobars",
  "--ignore-certificate-errors",
  "--hide-scrollbars",
];

/** Resolve the system Chromium executable (from Nix) if available. */
function resolveChromiumPath(): string | undefined {
  // Prefer env override
  const envPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || process.env.CHROME_PATH;
  if (envPath) return envPath;
  try {
    const found = execSync("which chromium 2>/dev/null || which chromium-browser 2>/dev/null || which google-chrome 2>/dev/null", { encoding: "utf8" }).trim().split("\n")[0];
    if (found) return found;
  } catch { /* ignore */ }
  return undefined;
}

const SYSTEM_CHROMIUM = resolveChromiumPath();

async function getBrowser(): Promise<Browser> {
  if (_browser && _browser.isConnected()) return _browser;
  if (_launchPromise) return _launchPromise;

  const launchOpts: Parameters<typeof chromium.launch>[0] = {
    headless: true,
    args: CHROMIUM_ARGS,
    ...(SYSTEM_CHROMIUM ? { executablePath: SYSTEM_CHROMIUM } : {}),
  };

  _launchPromise = chromium
    .launch(launchOpts)
    .then((b) => {
      _browser = b;
      b.on("disconnected", () => {
        _browser = null;
        _launchPromise = null;
        logger.warn("Playwright browser disconnected — will relaunch on next request");
      });
      logger.info("Playwright Chromium launched");
      return b;
    })
    .catch((err) => {
      _launchPromise = null;
      throw err;
    });

  return _launchPromise;
}

// ─── Stealth injection ────────────────────────────────────────────────────────
const STEALTH_SCRIPT = `
  (() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [
      { name: 'Chrome PDF Plugin' }, { name: 'Chrome PDF Viewer' }, { name: 'Native Client' }
    ]});
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    window.chrome = {
      runtime: {},
      loadTimes: function(){},
      csi: function(){},
      app: {},
    };
    const origPQ = window.navigator.permissions.query;
    window.navigator.permissions.query = (p) =>
      p.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission })
        : origPQ(p);
  })();
`;

// ─── User agents ──────────────────────────────────────────────────────────────
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
];
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomUA = () => USER_AGENTS[rand(0, USER_AGENTS.length - 1)];

// ─── Platform detection ───────────────────────────────────────────────────────
export type Platform =
  | "chatgpt"
  | "claude"
  | "gemini"
  | "perplexity"
  | "deepseek"
  | "grok"
  | "mistral"
  | "copilot"
  | "generic";

export function detectPlatform(url: string): Platform {
  if (url.includes("chatgpt.com") || url.includes("chat.openai.com")) return "chatgpt";
  if (url.includes("claude.ai")) return "claude";
  if (url.includes("gemini.google.com") || url.includes("aistudio.google.com")) return "gemini";
  if (url.includes("perplexity.ai")) return "perplexity";
  if (url.includes("deepseek.com")) return "deepseek";
  if (url.includes("grok.com") || url.includes("x.com/i/grok")) return "grok";
  if (url.includes("mistral.ai") || url.includes("chat.mistral.ai")) return "mistral";
  if (url.includes("copilot.microsoft.com") || url.includes("bing.com/chat")) return "copilot";
  return "generic";
}

// ─── Per-platform wait strategies ────────────────────────────────────────────
interface PlatformConfig {
  waitForSelector: string;
  waitTimeMs: number;
  scrollToLoad: boolean;
  extract: (page: Page) => Promise<RawMessage[]>;
}

interface RawMessage {
  role: "user" | "assistant";
  content: string;
  content_html: string;
}

const CONFIGS: Record<Platform, PlatformConfig> = {
  chatgpt: {
    waitForSelector: '[data-message-author-role]',
    waitTimeMs: 5000,
    scrollToLoad: true,
    extract: async (page) => {
      return page.evaluate(() => {
        const els = Array.from(document.querySelectorAll<HTMLElement>('[data-message-author-role]'));
        return els.map((el) => {
          const role = (el.getAttribute('data-message-author-role') === 'user' ? 'user' : 'assistant') as 'user' | 'assistant';
          const mdEl = el.querySelector('.markdown, .prose') || el;
          mdEl.querySelectorAll('button, svg, [aria-hidden], .sr-only').forEach((n) => n.remove());
          return { role, content: mdEl.textContent?.trim() ?? '', content_html: mdEl.innerHTML };
        }).filter((m) => m.content.length > 1);
      });
    },
  },

  claude: {
    waitForSelector: '.font-claude-message, .font-user-message, [data-testid="human-turn"], [data-testid="ai-turn"]',
    waitTimeMs: 6000,
    scrollToLoad: true,
    extract: async (page) => {
      return page.evaluate(() => {
        const selectors = [
          '[data-testid="human-turn"]',
          '[data-testid="ai-turn"]',
          '.font-user-message',
          '.font-claude-message',
          '.human-turn',
          '.ai-turn',
        ];
        const all = selectors.flatMap((s) => Array.from(document.querySelectorAll<HTMLElement>(s)));
        const unique = [...new Map(all.map((el) => [el, el])).keys()];
        return unique.map((el) => {
          const cls = el.className || '';
          const testId = el.getAttribute('data-testid') || '';
          const role: 'user' | 'assistant' =
            cls.includes('font-user-message') || testId.includes('human') || cls.includes('human-turn')
              ? 'user'
              : 'assistant';
          el.querySelectorAll('button, svg, [aria-hidden], .sr-only').forEach((n) => n.remove());
          return { role, content: el.textContent?.trim() ?? '', content_html: el.innerHTML };
        }).filter((m) => m.content.length > 1);
      });
    },
  },

  gemini: {
    waitForSelector: 'user-query, model-response, .user-query-container',
    waitTimeMs: 6000,
    scrollToLoad: true,
    extract: async (page) => {
      return page.evaluate(() => {
        const userEls = Array.from(document.querySelectorAll<HTMLElement>('user-query, .user-query-container, .query-text'));
        const aiEls = Array.from(document.querySelectorAll<HTMLElement>('model-response, .response-container, .model-response'));
        const msgs: Array<{ role: 'user' | 'assistant'; el: HTMLElement; order: number }> = [];
        userEls.forEach((el) => {
          const rect = el.getBoundingClientRect();
          msgs.push({ role: 'user', el, order: rect.top + window.scrollY + el.offsetTop });
        });
        aiEls.forEach((el) => {
          const rect = el.getBoundingClientRect();
          msgs.push({ role: 'assistant', el, order: rect.top + window.scrollY + el.offsetTop });
        });
        msgs.sort((a, b) => a.order - b.order);
        return msgs.map(({ role, el }) => {
          const inner = el.querySelector('p, .response-content, markdown-viewer, .formatted-text') || el;
          inner.querySelectorAll('button, svg, [aria-hidden], .sr-only, mat-icon').forEach((n) => n.remove());
          return { role, content: inner.textContent?.trim() ?? '', content_html: inner.innerHTML };
        }).filter((m) => m.content.length > 1);
      });
    },
  },

  perplexity: {
    waitForSelector: '[data-testid="query-text"], [class*="UserMessage"], .prose',
    waitTimeMs: 5000,
    scrollToLoad: true,
    extract: async (page) => {
      return page.evaluate(() => {
        const results: Array<{ role: 'user' | 'assistant'; content: string; content_html: string }> = [];
        // User messages
        const userEls = Array.from(document.querySelectorAll<HTMLElement>(
          '[data-testid="query-text"], [class*="UserMessage"], [class*="user-message"]'
        ));
        userEls.forEach((el) => {
          if (el.closest('nav, header, footer, aside')) return;
          el.querySelectorAll('button, svg, [aria-hidden]').forEach((n) => n.remove());
          const content = el.textContent?.trim() ?? '';
          if (content.length > 1) results.push({ role: 'user', content, content_html: el.innerHTML });
        });
        // AI messages
        const aiEls = Array.from(document.querySelectorAll<HTMLElement>(
          '[class*="AnswerLayout"], [class*="AnswerSection"], [class*="answer-content"], .prose'
        ));
        aiEls.forEach((el) => {
          if (el.closest('nav, header, footer, aside')) return;
          el.querySelectorAll('button, svg, [aria-hidden], [class*="source"]').forEach((n) => n.remove());
          const content = el.textContent?.trim() ?? '';
          if (content.length > 1) results.push({ role: 'assistant', content, content_html: el.innerHTML });
        });
        return results;
      });
    },
  },

  deepseek: {
    waitForSelector: '[data-role="user"], [data-role="assistant"], .ds-markdown, [class*="messageItem"]',
    waitTimeMs: 4000,
    scrollToLoad: false,
    extract: async (page) => {
      return page.evaluate(() => {
        // Try data-role first
        let els = Array.from(document.querySelectorAll<HTMLElement>('[data-role="user"], [data-role="assistant"]'));
        if (els.length === 0) {
          // Fallback: look for message containers with ds-markdown
          const containers = Array.from(document.querySelectorAll<HTMLElement>('[class*="messageItem"], [class*="message-item"], [class*="chat-message"]'));
          els = containers;
        }
        return els.map((el) => {
          const dataRole = el.getAttribute('data-role');
          const cls = (el.getAttribute('class') || '').toLowerCase();
          let role: 'user' | 'assistant' = 'assistant';
          if (dataRole === 'user' || cls.includes('user') || cls.includes('human')) role = 'user';
          const inner = el.querySelector('.ds-markdown, .markdown, .prose') || el;
          inner.querySelectorAll('button, svg, [aria-hidden], .copy-btn').forEach((n) => n.remove());
          return { role, content: inner.textContent?.trim() ?? '', content_html: inner.innerHTML };
        }).filter((m) => m.content.length > 1);
      });
    },
  },

  grok: {
    waitForSelector: '[class*="message"], article',
    waitTimeMs: 5000,
    scrollToLoad: false,
    extract: async (page) => {
      return page.evaluate(() => {
        const els = Array.from(document.querySelectorAll<HTMLElement>(
          '[class*="UserMessage"], [class*="BotMessage"], [class*="HumanMessage"], [class*="AssistantMessage"], article'
        ));
        return els.map((el) => {
          const cls = (el.getAttribute('class') || '').toLowerCase();
          const role: 'user' | 'assistant' =
            cls.includes('user') || cls.includes('human') ? 'user' : 'assistant';
          el.querySelectorAll('button, svg, [aria-hidden]').forEach((n) => n.remove());
          return { role, content: el.textContent?.trim() ?? '', content_html: el.innerHTML };
        }).filter((m) => m.content.length > 1);
      });
    },
  },

  mistral: {
    waitForSelector: '[class*="UserBubble"], [class*="BotBubble"], [class*="message"], .prose',
    waitTimeMs: 4000,
    scrollToLoad: false,
    extract: async (page) => {
      return page.evaluate(() => {
        const els = Array.from(document.querySelectorAll<HTMLElement>(
          '[class*="UserBubble"], [class*="BotBubble"], [class*="human"], [class*="assistant"], [class*="user-message"], [class*="bot-message"]'
        ));
        return els.map((el) => {
          const cls = (el.getAttribute('class') || '').toLowerCase();
          const role: 'user' | 'assistant' = cls.includes('user') || cls.includes('human') ? 'user' : 'assistant';
          el.querySelectorAll('button, svg, [aria-hidden]').forEach((n) => n.remove());
          return { role, content: el.textContent?.trim() ?? '', content_html: el.innerHTML };
        }).filter((m) => m.content.length > 1);
      });
    },
  },

  copilot: {
    waitForSelector: '[data-testid*="message"], [class*="message"]',
    waitTimeMs: 5000,
    scrollToLoad: false,
    extract: async (page) => {
      return page.evaluate(() => {
        const els = Array.from(document.querySelectorAll<HTMLElement>(
          '[data-testid*="user-message"], [data-testid*="assistant-message"], [class*="UserMessage"], [class*="BotMessage"]'
        ));
        return els.map((el) => {
          const testId = el.getAttribute('data-testid') || '';
          const cls = (el.getAttribute('class') || '').toLowerCase();
          const role: 'user' | 'assistant' =
            testId.includes('user') || cls.includes('user') ? 'user' : 'assistant';
          el.querySelectorAll('button, svg, [aria-hidden]').forEach((n) => n.remove());
          return { role, content: el.textContent?.trim() ?? '', content_html: el.innerHTML };
        }).filter((m) => m.content.length > 1);
      });
    },
  },

  generic: {
    waitForSelector: '[data-message-author-role], article, .message, .prose, .markdown',
    waitTimeMs: 4000,
    scrollToLoad: true,
    extract: async (page) => {
      return page.evaluate(() => {
        const selectors = [
          '[data-message-author-role]',
          '[data-role="user"]', '[data-role="assistant"]',
          '.human-turn', '.ai-turn',
          '.font-user-message', '.font-claude-message',
          'user-query', 'model-response',
          '[class*="UserMessage"]', '[class*="AssistantMessage"]',
          '[class*="HumanTurn"]', '[class*="AssistantTurn"]',
          'article',
          '.message',
        ];
        const seen = new Set<HTMLElement>();
        const msgs: Array<{ role: 'user' | 'assistant'; el: HTMLElement }> = [];
        for (const sel of selectors) {
          document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
            if (seen.has(el) || el.closest('nav, header, footer, aside')) return;
            seen.add(el);
            const role = (() => {
              const dataRole = el.getAttribute('data-message-author-role') || el.getAttribute('data-role') || '';
              const cls = (el.getAttribute('class') || '').toLowerCase();
              if (dataRole === 'user' || cls.includes('user') || cls.includes('human')) return 'user' as const;
              return 'assistant' as const;
            })();
            msgs.push({ role, el });
          });
          if (msgs.length > 0) break;
        }
        return msgs.map(({ role, el }) => {
          el.querySelectorAll('button, svg, [aria-hidden], .sr-only').forEach((n) => n.remove());
          return { role, content: el.textContent?.trim() ?? '', content_html: el.innerHTML };
        }).filter((m) => m.content.length > 1);
      });
    },
  },
};

// ─── Dead-state detection ─────────────────────────────────────────────────────
function checkDeadState(html: string, url: string): void {
  if (
    html.includes("Can't load shared conversation") ||
    html.includes("This conversation may have been deleted") ||
    html.includes("The conversation you requested could not be found") ||
    html.includes("404 Not Found") ||
    html.includes("Page not found")
  ) {
    throw new Error("CHAT_DELETED");
  }
  if (
    html.includes("Just a moment") ||
    html.includes("cf-browser-verification") ||
    html.includes("Enable JavaScript and cookies to continue") ||
    html.includes("Checking if the site connection is secure")
  ) {
    throw new Error("CLOUDFLARE_BLOCKED");
  }
}

// ─── Deduplication ────────────────────────────────────────────────────────────
function dedup(msgs: RawMessage[]): RawMessage[] {
  const result: RawMessage[] = [];
  for (const m of msgs) {
    const prev = result[result.length - 1];
    if (prev && prev.role === m.role && prev.content.slice(0, 80) === m.content.slice(0, 80)) continue;
    result.push(m);
  }
  // Trim leading non-user messages for cleaner output
  while (result.length > 0 && result[0].role !== "user") result.shift();
  return result;
}

// ─── Public API ───────────────────────────────────────────────────────────────
export interface ScrapedResult {
  title: string;
  messages: RawMessage[];
  platform: Platform;
}

export async function scrapeWithPlaywright(
  url: string,
  timeoutMs = 45000
): Promise<ScrapedResult> {
  const platform = detectPlatform(url);
  const config = CONFIGS[platform];
  const ua = randomUA();

  let context: BrowserContext | null = null;

  const abortTimer = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("EXTRACTION_TIMEOUT")), timeoutMs)
  );

  const scrape = async (): Promise<ScrapedResult> => {
    const b = await getBrowser();

    context = await b.newContext({
      userAgent: ua,
      viewport: { width: rand(1280, 1440), height: rand(768, 900) },
      locale: "en-US",
      timezoneId: "America/New_York",
      extraHTTPHeaders: {
        "Accept-Language": "en-US,en;q=0.9",
        "sec-ch-ua": '"Chromium";v="131", "Google Chrome";v="131", "Not_A Brand";v="24"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
      },
    });

    const page: Page = await context.newPage();

    // Inject stealth before any navigation
    await page.addInitScript(STEALTH_SCRIPT);

    // Block images/fonts/media to speed up load — we only need the DOM
    await page.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (["image", "media", "font", "websocket"].includes(type)) return route.abort();
      return route.continue();
    });

    // Navigate
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    const status = response?.status() ?? 200;
    if (status === 404) throw new Error("CHAT_DELETED");

    // Detect login redirect
    const finalUrl = page.url();
    if (
      finalUrl.includes("/login") ||
      finalUrl.includes("/signin") ||
      finalUrl.includes("auth.") ||
      finalUrl.includes("accounts.google.com") ||
      finalUrl.includes("/auth/")
    ) {
      throw new Error("LOGIN_REQUIRED");
    }

    // Wait for the platform's key selector
    try {
      await page.waitForSelector(config.waitForSelector, {
        timeout: config.waitTimeMs,
        state: "attached",
      });
    } catch {
      // Selector may not appear — check dead state and continue
    }

    // Extra settle time for React/Next.js hydration
    await page.waitForTimeout(1500);

    // Scroll to trigger lazy-loaded messages
    if (config.scrollToLoad) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 3));
      await page.waitForTimeout(600);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 2 / 3));
      await page.waitForTimeout(600);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(800);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(400);
    }

    // Check for dead/blocked states in final HTML
    const html = await page.content();
    checkDeadState(html, url);

    const title = await page.title();
    let messages = await config.extract(page);

    // If platform-specific extractor got nothing, try generic
    if (messages.length === 0 && platform !== "generic") {
      logger.warn({ platform, url }, "Platform extractor returned 0 messages — trying generic");
      messages = await CONFIGS.generic.extract(page);
    }

    return { title: title || "Extracted Chat", messages: dedup(messages), platform };
  };

  try {
    return await Promise.race([scrape(), abortTimer]);
  } finally {
    if (context) await context.close().catch(() => {});
  }
}

// ─── Warm up browser on module load ──────────────────────────────────────────
getBrowser().catch((err) =>
  logger.warn({ err: err.message }, "Could not pre-warm Playwright browser")
);

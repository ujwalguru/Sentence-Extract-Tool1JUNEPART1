import { Router, type Request, type Response } from "express";
import path from "path";
import fs from "fs";
import * as cheerio from "cheerio";
import { convert } from "html-to-text";
import crypto from "crypto";
import TurndownService from "turndown";
import axios from "axios";
import { spawn } from "child_process";

const router = Router();

const ALLOWED_TAGS = new Set([
  "pre", "code", "table", "thead", "tbody", "tr", "th", "td",
  "ul", "ol", "li", "strong", "em", "blockquote",
  "h1", "h2", "h3", "h4", "h5", "h6", "p", "br", "span", "div", "a",
]);

function cleanHtml($: cheerio.CheerioAPI, el: any): string {
  let output = "";
  function walk(node: any) {
    if (node.type === "text") {
      output += (node.data as string)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    } else if (node.type === "tag") {
      const tagName = (node.name as string).toLowerCase();
      const isAllowed = ALLOWED_TAGS.has(tagName);
      if (isAllowed) {
        if (tagName === "a" && node.attribs && node.attribs.href) {
          const href = (node.attribs.href as string).replace(/"/g, "&quot;");
          output += `<${tagName} href="${href}">`;
        } else {
          output += `<${tagName}>`;
        }
      }
      $(node).contents().each((_: number, child: any) => walk(child));
      if (isAllowed) output += `</${tagName}>`;
    }
  }
  $(el).contents().each((_: number, child: any) => walk(child));
  return output.trim();
}

const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

const storageDir = path.join(process.cwd(), "storage", "images");
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

setInterval(() => {
  try {
    const now = Date.now();
    const files = fs.readdirSync(storageDir);
    let deleted = 0;
    files.forEach((file) => {
      const filePath = path.join(storageDir, file);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > 7 * 60 * 1000) {
        fs.unlinkSync(filePath);
        deleted++;
      }
    });
    if (deleted > 0) console.log(`Cleaned up ${deleted} old images from storage`);
  } catch (err) {
    console.error("Failed to clean up old images:", err);
  }
}, 60 * 1000);

const SCRAPER_SCRIPT = path.join(process.cwd(), "scraper", "extract_chat.py");
const PYTHON_BIN = process.env.PYTHON_BIN || "python3";

function extractChatViaScraping(url: string): Promise<{ title: string; messages: any[] }> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      proc.kill();
      reject(new Error("EXTRACTION_TIMEOUT"));
    }, 40000);

    const workspacePyLibs = `/home/runner/workspace/.pythonlibs/lib/python3.11/site-packages`;
    const existingPythonPath = process.env.PYTHONPATH || "";
    const pythonPath = existingPythonPath.includes(workspacePyLibs)
      ? existingPythonPath
      : `${workspacePyLibs}:${existingPythonPath}`;

    const proc = spawn(PYTHON_BIN, [SCRAPER_SCRIPT, url], {
      env: { ...process.env, PYTHONPATH: pythonPath },
    });

    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

    proc.on("close", () => {
      clearTimeout(timeout);
      try {
        const lastLine = stdout.trim().split("\n").filter(Boolean).pop() || "";
        const result = JSON.parse(lastLine);
        if (result.error === "CHAT_DELETED") return reject(new Error("CHAT_DELETED"));
        if (result.error === "LOGIN_REQUIRED") {
          // Carry suggestion through so the route can surface it
          const err: any = new Error("LOGIN_REQUIRED");
          err.suggestion = result.suggestion || result.message;
          return reject(err);
        }
        if (result.error === "PARSING_FAILED") return resolve({ title: result.title || "Extracted Chat", messages: [] });
        if (result.error) return reject(new Error(result.message || result.error));
        resolve({ title: result.title || "Extracted Chat", messages: result.messages || [] });
      } catch {
        reject(new Error("Scrapling parser returned invalid JSON"));
      }
    });

    proc.on("error", (err: Error) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function extractChatViaAxios(url: string) {
  let data = "";
  const browserlessToken = process.env.BROWSERLESS_TOKEN || "2UUaQFRvjHXBtgr795905758f6356784b8fd41eb7bf39d987";

  try {
    const response = await axios.post(
      `https://chrome.browserless.io/content?token=${browserlessToken}`,
      {
        url,
        elements: [{ selector: "[data-message-author-role]" }],
        stealth: true,
        gotoOptions: { waitUntil: "networkidle2", timeout: 30000 },
      },
      {
        headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
        timeout: 35000,
      }
    );
    data = response.data;
    if (data.includes("404<!-- --> <!-- -->Not Found") || data.includes("<title>404 Not Found</title>")) {
      throw new Error("CHAT_DELETED");
    }
  } catch (error: any) {
    if (error.message && error.message.includes("CHAT_DELETED")) throw error;
    try {
      const proxyUrl = "https://r.jina.ai/" + url;
      const response = await axios.get(proxyUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "X-Return-Format": "html" },
        timeout: 20000,
      });
      data = response.data;
    } catch {
      try {
        const proxyUrl = "https://api.allorigins.win/raw?url=" + encodeURIComponent(url);
        const response = await axios.get(proxyUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
          timeout: 20000,
        });
        data = response.data;
      } catch {
        const response = await axios.get(url, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
          timeout: 20000,
        });
        data = response.data;
      }
    }
  }

  const $ = cheerio.load(data);
  const title = $("title").text() || "Extracted Chat";
  const messages: any[] = [];

  $("[data-message-author-role]").each((_i: number, el: any) => {
    let role = $(el).attr("data-message-author-role");
    if (role !== "user" && role !== "assistant") role = "assistant";
    let target = $(el).find(".markdown");
    if (target.length === 0) target = $(el) as any;
    else target = target.first();
    const contentHtml = cleanHtml($, target);
    messages.push({ role, content_html: contentHtml });
  });

  return { title, messages };
}

function extractJsonObject(text: string, prefix: string): string | null {
  const index = text.indexOf(prefix);
  if (index === -1) return null;
  let startIndex = index + prefix.length;
  while (startIndex < text.length && /\s/.test(text[startIndex])) startIndex++;
  if (text[startIndex] !== "{" && text[startIndex] !== "[") return null;
  const isArray = text[startIndex] === "[";
  const openChar = isArray ? "[" : "{";
  const closeChar = isArray ? "]" : "}";
  let openCount = 0;
  let insideString = false;
  let escapeNext = false;
  for (let i = startIndex; i < text.length; i++) {
    const char = text[i];
    if (escapeNext) { escapeNext = false; continue; }
    if (char === "\\") { escapeNext = true; continue; }
    if (char === '"') { insideString = !insideString; continue; }
    if (!insideString) {
      if (char === openChar) openCount++;
      else if (char === closeChar) openCount--;
      if (openCount === 0) return text.substring(startIndex, i + 1);
    }
  }
  return null;
}

function extractAllJsonObjects(text: string): any[] {
  const results: any[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{" || text[i] === "[") {
      let j = i;
      let insideString = false;
      let escapeNext = false;
      let openCount = 0;
      const openChar = text[i];
      const closeChar = openChar === "{" ? "}" : "]";
      let found = false;
      for (; j < text.length; j++) {
        const char = text[j];
        if (escapeNext) { escapeNext = false; continue; }
        if (char === "\\") { escapeNext = true; continue; }
        if (char === '"') { insideString = !insideString; continue; }
        if (!insideString) {
          if (char === openChar) openCount++;
          else if (char === closeChar) openCount--;
          if (openCount === 0) { found = true; break; }
        }
      }
      if (found) {
        const jsonStr = text.substring(i, j + 1);
        if (jsonStr.length > 50 && (jsonStr.includes('"role"') || jsonStr.includes('"parts"') || jsonStr.includes('"human"'))) {
          try { results.push(JSON.parse(jsonStr)); } catch {}
        }
        i = j;
      }
    }
  }
  return results;
}

function extractMessagesFromHtml(html: string) {
  const $ = cheerio.load(html);
  const messages: { role: string; content: string; timestamp?: string; imagesUrls?: string[] }[] = [];
  let title = $("title").text() || "Extracted Chat";
  let isDeadLink = false;
  let deadLinkMessage = "Could not extract structured messages from this HTML file.";

  if (
    title.includes("404") ||
    title.includes("Unhandled Thrown Response") ||
    title.includes("Page not found") ||
    html.includes("Can't load shared conversation") ||
    html.includes("This conversation may have been deleted") ||
    html.includes("The conversation you requested could not be found")
  ) {
    isDeadLink = true;
    deadLinkMessage = "This ChatGPT share link is invalid, completely private, or has been deleted by the author.";
  }

  // 1. Try __NEXT_DATA__
  const nextData = $("#__NEXT_DATA__").html();
  if (nextData) {
    try {
      const jsonData = JSON.parse(nextData);
      const searchMessages = (obj: any) => {
        if (!obj) return;
        if (Array.isArray(obj)) { obj.forEach(searchMessages); return; }
        if (typeof obj === "object") {
          let timestamp: string | undefined;
          if (obj.create_time) {
            const ts = typeof obj.create_time === "number" ? obj.create_time : parseFloat(obj.create_time);
            if (!isNaN(ts)) timestamp = new Date(ts > 1e11 ? ts : ts * 1000).toISOString();
          } else if (obj.createdAt || obj.created_at || obj.timestamp) {
            const ts = obj.createdAt || obj.created_at || obj.timestamp;
            timestamp = typeof ts === "number" ? new Date(ts > 1e11 ? ts : ts * 1000).toISOString() : new Date(ts).toISOString();
          }
          if (timestamp === "Invalid Date") timestamp = undefined;
          if (obj.role && obj.content && typeof obj.content === "object" && obj.content.parts) {
            messages.push({ role: obj.role, content: obj.content.parts.join("\n"), timestamp });
          } else {
            Object.values(obj).forEach(searchMessages);
          }
        }
      };
      searchMessages(jsonData);
    } catch {}
  }

  // 2. React Router streaming format
  if (messages.length === 0) {
    const scripts = $("script").map((_: number, el: any) => $(el).html()).get();
    for (const text of scripts) {
      if (text && text.includes("streamController.enqueue")) {
        const regex = /enqueue\(\s*new\s*Uint8Array\(\s*\[(.*?)]\s*\)\s*\)|enqueue\(\s*new\s*TextEncoder\(\)\.encode\(\s*"((?:[^"\\]|\\.)*)"\s*\)\s*\)|enqueue\(\s*"((?:[^"\\]|\\.)*)"\s*\)/g;
        let match;
        while ((match = regex.exec(text)) !== null) {
          try {
            let unescaped = "";
            if (match[1]) {
              const bytes = match[1].split(",").map((n: string) => parseInt(n.trim(), 10));
              unescaped = Buffer.from(bytes).toString("utf-8");
            } else if (match[2]) {
              unescaped = match[2].replace(/\\"/g, '"').replace(/\\\\/g, "\\");
            } else if (match[3]) {
              unescaped = match[3].replace(/\\"/g, '"').replace(/\\\\/g, "\\");
            }
            if (unescaped) {
              const jsonData = JSON.parse(unescaped);
              const searchMessages = (obj: any) => {
                if (!obj) return;
                if (Array.isArray(obj)) { obj.forEach(searchMessages); return; }
                if (typeof obj === "object") {
                  if (obj.role && obj.content && typeof obj.content.parts !== "undefined") {
                    messages.push({ role: obj.role, content: Array.isArray(obj.content.parts) ? obj.content.parts.join("\n") : String(obj.content.parts) });
                  } else if (obj.author?.role && obj.content?.parts) {
                    messages.push({ role: obj.author.role, content: Array.isArray(obj.content.parts) ? obj.content.parts.join("\n") : String(obj.content.parts) });
                  } else {
                    Object.values(obj).forEach(searchMessages);
                  }
                }
              };
              searchMessages(jsonData);
            }
          } catch {}
        }
      }
    }
  }

  // 3. Remix Context / generic JSON in scripts
  if (messages.length === 0) {
    $("script").each((_: number, el: any) => {
      const text = $(el).html();
      if (!text) return;
      if (text.includes("__remixContext") || text.includes("__INITIAL_STATE__") || text.includes("human") || text.includes("parts")) {
        try {
          let parsed: any = null;
          if (text.includes("__remixContext")) {
            let jsonStr = extractJsonObject(text, "window.__remixContext =") || extractJsonObject(text, "__remixContext =") || extractJsonObject(text, "__remixContext=");
            if (jsonStr) parsed = JSON.parse(jsonStr);
          } else if (text.includes("__INITIAL_STATE__")) {
            let jsonStr = extractJsonObject(text, "window.__INITIAL_STATE__ =") || extractJsonObject(text, "__INITIAL_STATE__ =") || extractJsonObject(text, "__INITIAL_STATE__=");
            if (jsonStr) parsed = JSON.parse(jsonStr);
          }

          if (!parsed) {
            const jsonList = extractAllJsonObjects(text);
            for (const jsonObj of jsonList) {
              const searchMessages = (obj: any) => {
                if (!obj) return;
                if (Array.isArray(obj)) { obj.forEach(searchMessages); return; }
                if (typeof obj === "object") {
                  if (obj.author?.role && obj.content?.parts) {
                    messages.push({ role: obj.author.role, content: Array.isArray(obj.content.parts) ? obj.content.parts.join("\n") : String(obj.content.parts) });
                  } else if (obj.role && obj.content && typeof obj.content === "object" && obj.content.parts) {
                    messages.push({ role: obj.role, content: Array.isArray(obj.content.parts) ? obj.content.parts.join("\n") : String(obj.content.parts) });
                  } else if ((obj.sender === "human" || obj.sender === "assistant") && obj.text) {
                    messages.push({ role: obj.sender === "human" ? "user" : "assistant", content: typeof obj.text === "string" ? obj.text : JSON.stringify(obj.text) });
                  } else if (typeof obj.role === "string" && (obj.role === "user" || obj.role === "assistant" || obj.role === "model") && typeof obj.content === "string") {
                    messages.push({ role: obj.role === "model" ? "assistant" : obj.role, content: obj.content });
                  } else {
                    Object.values(obj).forEach(searchMessages);
                  }
                }
              };
              searchMessages(jsonObj);
            }
          } else {
            const searchMessages = (obj: any) => {
              if (!obj) return;
              if (Array.isArray(obj)) { obj.forEach(searchMessages); return; }
              if (typeof obj === "object") {
                let timestamp: string | undefined;
                if (obj.create_time) {
                  const ts = typeof obj.create_time === "number" ? obj.create_time : parseFloat(obj.create_time);
                  if (!isNaN(ts)) timestamp = new Date(ts > 1e11 ? ts : ts * 1000).toISOString();
                }
                if (timestamp === "Invalid Date") timestamp = undefined;
                if (obj.author?.role && obj.content?.parts) {
                  messages.push({ role: obj.author.role, content: Array.isArray(obj.content.parts) ? obj.content.parts.join("\n") : String(obj.content.parts), timestamp });
                } else if (obj.role && obj.content && typeof obj.content === "object" && obj.content.parts) {
                  messages.push({ role: obj.role, content: Array.isArray(obj.content.parts) ? obj.content.parts.join("\n") : String(obj.content.parts), timestamp });
                } else if ((obj.sender === "human" || obj.sender === "assistant") && obj.text) {
                  messages.push({ role: obj.sender === "human" ? "user" : "assistant", content: typeof obj.text === "string" ? obj.text : JSON.stringify(obj.text), timestamp });
                } else if (typeof obj.role === "string" && (obj.role === "user" || obj.role === "assistant" || obj.role === "model") && typeof obj.content === "string") {
                  messages.push({ role: obj.role === "model" ? "assistant" : obj.role, content: obj.content, timestamp });
                } else {
                  Object.values(obj).forEach(searchMessages);
                }
              }
            };
            searchMessages(parsed);
          }
        } catch {}
      }
    });
  }

  // 4. Regex fallback
  if (messages.length === 0) {
    const regex = /"role"\s*:\s*"([^"]+)"[^}]*"content_type"\s*:\s*"text"\s*,\s*"parts"\s*:\s*\[\s*"([\s\S]*?)"\s*\]/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
      messages.push({ role: match[1], content: match[2].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\") });
    }
  }

  // 5. DOM fallback
  if (messages.length === 0) {
    const strictSelector = [
      '[data-message-author-role]',           // ChatGPT
      '[data-testid="message"]',              // ChatGPT alt
      'article',
      '.font-claude-message', '.font-user-message',  // Claude
      '.human-turn', '.ai-turn',              // Claude share pages
      'user-query', 'model-response',         // Gemini custom elements
      '.user-query', '.model-response',
      'response-container', 'message-content',
      '[class*="HumanTurn"]', '[class*="AssistantTurn"]',  // Claude variants
      '[class*="ds-markdown"]',               // DeepSeek
      '[data-role="user"]', '[data-role="assistant"]',     // DeepSeek / generic
      '[data-testid="query-text"]',           // Perplexity
      '[class*="UserMessage"]', '[class*="AnswerHeader"]', // Perplexity
      '[class*="UserBubble"]', '[class*="BotBubble"]',     // Mistral/Copilot
      '.message-row', '.message-bubble', '.chat-message',
    ].join(', ');
    const genericSelector = ".message, .markdown, .prose, .ProseMirror";
    let messageNodes = $(strictSelector);
    let activeSelector = strictSelector;
    if (messageNodes.length === 0) { messageNodes = $(genericSelector); activeSelector = genericSelector; }

    const topLevelNodes: any[] = [];
    messageNodes.each((_: number, el: any) => {
      if ($(el).closest('nav, aside, [class*="sidebar"]:not([class*="threadScrollVars"]), [class*="menu"], header, .drawer, .drawer-content, #onetrust-consent-sdk, [class*="onetrust"], [id*="onetrust"], [class*="cookie"], [id*="cookie"]').length > 0) return;
      let parent = (el as any).parent;
      let isNested = false;
      while (parent && (parent.type as unknown as string) !== "root") {
        if ($(parent as any).is(activeSelector)) { isNested = true; break; }
        parent = parent.parent;
      }
      if (!isNested) topLevelNodes.push(el);
    });

    if (topLevelNodes.length === 0) {
      let bestContainer: any = null;
      let maxScore = 0;
      $("body *").each((_: number, el: any) => {
        const $el = $(el);
        if ($el.is(".markdown, .prose, p, article:not([data-testid])")) return;
        let blockChildrenCount = 0;
        $el.children().each((_: number, child: any) => {
          const $child = $(child);
          const textLength = $child.text().trim().length;
          if (textLength > 10 && !$child.is("script, style, noscript, nav, header, footer, p, h1, h2, h3, h4, h5, h6, ul, ol, li, span, a, strong, em, pre, code, blockquote")) {
            blockChildrenCount++;
          }
        });
        if (blockChildrenCount > maxScore && blockChildrenCount >= 2) { maxScore = blockChildrenCount; bestContainer = el; }
      });
      if (bestContainer) {
        $(bestContainer).children().each((_: number, child: any) => {
          const $child = $(child);
          if ($child.text().trim().length > 0 && !$child.is("script, style, noscript, nav, header, footer")) topLevelNodes.push(child);
        });
      }
    }

    if (topLevelNodes.length > 0) {
      $(topLevelNodes).each((_: number, el: any) => {
        const $el = $(el);
        let role = $el.attr("data-message-author-role");
        if (!role) {
          const childWithRole = $el.find("[data-message-author-role]").first();
          if (childWithRole.length > 0) role = childWithRole.attr("data-message-author-role");
        }
        if (!role) {
          const className = ($el.attr("class") || "").toLowerCase();
          const testId = ($el.attr("data-testid") || "").toLowerCase();
          const cleanClassName = className.replace(/user-select/g, "").replace(/select-none/g, "");
          const innerHtml = $el.html() || "";
          const hasUserChild = innerHtml.includes("font-user-message") || innerHtml.includes('data-message-author-role="user"') || innerHtml.includes("user-query");
          const hasAssistantChild = innerHtml.includes("font-claude-message") || innerHtml.includes('data-message-author-role="assistant"') || innerHtml.includes("model-response") || innerHtml.includes("response-content");
          const tagName = ($el.prop("tagName") || (el as any).name || (el as any).tagName || "").toLowerCase();
          const isUserClass = /(^|\s|-|_)(user|human|message-in|query|user-query)(\s|-|_|$)/i;
          const isAssistantClass = /(^|\s|-|_)(assistant|bot|ai|claude|message-out|model|model-response|gemini|chatgpt)(\s|-|_|$)/i;

          if (cleanClassName.includes("font-user-message") || testId.includes("user") || cleanClassName.match(isUserClass) || hasUserChild || tagName.includes("user-query")) {
            role = "user";
          } else if (cleanClassName.includes("font-claude-message") || testId.includes("assistant") || cleanClassName.match(isAssistantClass) || hasAssistantChild || tagName.includes("model-response")) {
            role = "assistant";
          } else {
            const textContent = $el.text() || "";
            if (textContent.match(/^\s*(You said|You|User):?/i)) role = "user";
            else if (textContent.match(/^\s*(ChatGPT|Claude|Gemini|Assistant|Grok|Bot|AI)( said)?:?/i)) role = "assistant";
            else role = "unknown";
          }
        }

        const timeEl = $el.closest("div, article, [data-testid]").find("time");
        const timestamp = timeEl.length > 0 ? timeEl.attr("datetime") : undefined;
        const $clone = $el.clone();
        $clone.find('script, style, svg, noscript, nav, header, footer, button, [aria-hidden="true"], .sr-only, .visually-hidden, .cdk-visually-hidden, #onetrust-consent-sdk, [class*="onetrust"], [id*="onetrust"], [class*="cookie-banner"]').remove();
        let content = "";
        try {
          content = turndownService.turndown($clone.html() || "");
        } catch {
          content = convert($clone.html() || "", { wordwrap: false, selectors: [{ selector: "pre", format: "dataTable" }] });
        }
        content = content.replace(/Uploaded an image/gi, "").replace(/Show moreShow less/gi, "");

        const imgs = $el.find("img").filter((_: number, img: any) => {
          const $img = $(img);
          const w = parseInt($img.attr("width") || "100", 10);
          const h = parseInt($img.attr("height") || "100", 10);
          const cn = ($img.attr("class") || "").toLowerCase();
          if (w <= 36 || h <= 36) return false;
          if (cn.includes("w-4") || cn.includes("w-5") || cn.includes("icon") || cn.includes("favicon") || cn.includes("logo")) return false;
          return true;
        }).map((_: number, img: any) => {
          let src = $(img).attr("src");
          if (src && src.includes("_next/image") && src.includes("url=")) {
            try {
              const parsedUrl = new URL(src, "https://dummy.com");
              const urlParam = parsedUrl.searchParams.get("url");
              if (urlParam) src = urlParam.startsWith("http") ? urlParam : `https://chatgpt.com${urlParam.startsWith("/") ? "" : "/"}${urlParam}`;
            } catch {}
          }
          return src;
        }).get().filter((src: any) => typeof src === "string" && (src.startsWith("http") || src.startsWith("data:image")) && !src.includes("avatar") && !src.includes("profile")) as string[];

        const bgImgs = $el.find('[style*="background-image"]').map((_: number, div: any) => {
          const style = $(div).attr("style");
          if (style) { const match = style.match(/url\(["']?(.*?)["']?\)/); return match ? match[1] : null; }
          return null;
        }).get().filter((src: any) => typeof src === "string" && (src.startsWith("http") || src.startsWith("data:image"))) as string[];

        const allImgs = [...imgs, ...bgImgs].filter((src) =>
          typeof src === "string" &&
          !src.toLowerCase().includes("avatar") &&
          !src.toLowerCase().includes("profile") &&
          !src.toLowerCase().includes("favicon") &&
          !src.toLowerCase().includes("icon") &&
          !src.toLowerCase().includes("logo") &&
          !src.toLowerCase().includes("brand")
        );

        if (content.trim() || allImgs.length > 0) {
          messages.push({ role: role!, content: content.trim(), timestamp, imagesUrls: allImgs });
        }
      });
    }
  }

  // 6. Absolute fallback
  if (messages.length === 0) {
    let main = $('main, .main, #content, [role="main"]').first();
    if (main.length === 0) main = $("body");
    let content = "";
    try { content = turndownService.turndown(main.html() || ""); } catch { content = convert(main.html() || "", { wordwrap: false }); }
    const cleanedContent = content
      .replace(/By messaging ChatGPT[\s\S]*Cookie Preferences\./i, "")
      .replace(/This is a copy of a shared ChatGPT conversation[\s\S]*?Cookie Preferences\./i, "")
      .replace(/window\.__oai_log[\s\S]*?Date\.now\(\)\}\)\)/g, "")
      .replace(/Report conversation window\.[\s\S]{0,500}Date\.now\(\)/g, "")
      .replace(/ChatGPT can make mistakes\.[\s\S]{0,200}$/i, "")
      .trim();

    if (cleanedContent.length > 20) {
      const splitRegex = /\n?(?:(?:[A-Za-z0-9_ ]+) )?([A-Za-z0-9_]+) SAID:\n/gi;
      if (splitRegex.test(cleanedContent)) {
        splitRegex.lastIndex = 0;
        const parts = cleanedContent.split(splitRegex);
        for (let i = 1; i < parts.length; i += 2) {
          const speaker = parts[i] || "";
          const text = parts[i + 1] || "";
          if (!text.trim()) continue;
          messages.push({ role: speaker.match(/chatgpt|claude|gemini|assistant|bot|ai|grok/i) ? "assistant" : "user", content: text.trim() });
        }
      } else {
        messages.push({ role: "unknown", content: cleanedContent });
      }
    }
  }

  if (messages.length === 0) return { title, messages: [], isDeadLink, deadLinkMessage };

  let filteredMessages = messages.filter(
    (msg) => !(msg.content.includes("This is a copy of a chat between") && msg.content.includes("Anthropic"))
  );

  const isGrok = title.toLowerCase().includes("grok") || html.toLowerCase().includes("grok.com");
  let isUser = true;
  for (const msg of filteredMessages) {
    if (isGrok) {
      msg.role = isUser ? "user" : "assistant";
      isUser = !isUser;
    } else if (!msg.role || msg.role === "unknown") {
      msg.role = isUser ? "user" : "assistant";
      isUser = !isUser;
    } else {
      isUser = msg.role !== "user";
    }
  }

  const deduplicatedMessages = filteredMessages.filter((msg, idx) => {
    if (idx === 0) return true;
    const prev = filteredMessages[idx - 1];
    return msg.content.trim() !== prev.content.trim() || msg.role !== prev.role;
  });

  return { title, messages: deduplicatedMessages, isDeadLink, deadLinkMessage };
}

// POST /api/public-bridge
router.post("/public-bridge", async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Text content is required" });

    const response = await fetch("https://dpaste.com/api/v2/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ content: text, format: "url", syntax: "md", expiry_days: "1" }).toString(),
    });

    if (!response.ok) throw new Error(`Public link generation failed: ${response.status}`);
    const url = (await response.text()).trim();
    res.json({ url: url + ".txt" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/parse
router.post("/parse", async (req: Request, res: Response) => {
  try {
    const { html } = req.body;
    if (!html) return res.status(400).json({ error: "HTML is required" });

    const $ = cheerio.load(html);
    const title = $("title").text() || "Extracted Chat";
    const messages: any[] = [];

    $("[data-message-author-role]").each((_i: number, el: any) => {
      let role = $(el).attr("data-message-author-role");
      if (role !== "user" && role !== "assistant") role = "assistant";
      let target = $(el).find(".markdown");
      if (target.length === 0) target = $(el) as any;
      else target = target.first();
      const contentHtml = cleanHtml($, target);
      messages.push({ role, content_html: contentHtml });
    });

    const now = Date.now();
    const formattedMessages = messages.map((m, index) => ({
      role: m.role,
      content_html: m.content_html,
      content: m.content_html || "",
      timestamp: new Date(now - (messages.length - index) * 60000).toISOString(),
    }));

    res.json({ title, messages: formattedMessages });
  } catch (error: any) {
    res.status(500).json({ error: "Parsing failed", details: error.message });
  }
});

// POST /api/extract
router.post("/extract", async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    const overallTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("EXTRACTION_TIMEOUT")), 50000)
    );

    let title = "Extracted Chat";
    let messages: any[] = [];

    // Primary: Scrapling (Python) — browser impersonation, handles anti-bot
    try {
      const result = await Promise.race([extractChatViaScraping(url), overallTimeout]) as { title: string; messages: any[] };
      title = result.title;
      messages = result.messages;
    } catch (scraplingErr: any) {
      if (
        scraplingErr.message?.includes("CHAT_DELETED") ||
        scraplingErr.message?.includes("EXTRACTION_TIMEOUT") ||
        scraplingErr.message?.includes("LOGIN_REQUIRED") ||
        scraplingErr.message?.includes("CLOUDFLARE_BLOCKED")
      ) {
        throw scraplingErr;
      }
      // Scrapling failed for another reason — fall back to axios
      const fallbackTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("EXTRACTION_TIMEOUT")), 30000)
      );
      const result = await Promise.race([extractChatViaAxios(url), fallbackTimeout]) as { title: string; messages: any[] };
      title = result.title;
      messages = result.messages;
    }

    const now = Date.now();
    const formattedMessages = messages.map((m, index) => ({
      role: m.role,
      content_html: m.content_html,
      content: m.content_html || m.content || "",
      timestamp: new Date(now - (messages.length - index) * 60000).toISOString(),
    }));

    if (formattedMessages.length === 0) {
      const u = url as string;
      const isChatGPT = u.includes("chatgpt.com") || u.includes("chat.openai.com");
      const isClaude = u.includes("claude.ai");
      const isGemini = u.includes("gemini.google.com") || u.includes("aistudio.google.com");
      const isGrok = u.includes("grok.com") || u.includes("x.com/i/grok");
      const isPerplexity = u.includes("perplexity.ai");
      const isDeepSeek = u.includes("deepseek.com");
      const isMistral = u.includes("mistral.ai") || u.includes("chat.mistral.ai");
      const isCopilot = u.includes("copilot.microsoft.com") || u.includes("bing.com/chat");

      let message = "Could not find any chat messages at this link.";
      let suggestion = "The link may be private, expired, or the platform has changed its structure. Try saving the page as HTML (Ctrl+S) and uploading it instead.";

      if (isChatGPT) {
        message = "Could not extract messages from this ChatGPT link. The page loads content dynamically via JavaScript which our server could not render.";
        suggestion = "In ChatGPT, export the conversation: click the ··· menu → Download → JSON or Markdown. You can also save the share page as HTML (Ctrl+S) and upload it here.";
      } else if (isClaude) {
        message = "Claude's website uses Cloudflare bot protection that blocks all automated access — even public share links are redirected to the login page when accessed from a server.";
        suggestion = "Step 1: Open the share link in your browser. Step 2: Press Ctrl+S (Cmd+S on Mac). Step 3: In the save dialog, set format to 'Webpage, Complete' (not 'Webpage, HTML Only'). Step 4: Upload the saved .html file here using the 'HTML File' tab.";
      } else if (isGemini) {
        message = "Could not extract messages from this Gemini link. Gemini share pages require JavaScript rendering.";
        suggestion = "Open the Gemini share link in your browser, save the page as HTML (Ctrl+S), and upload it here.";
      } else if (isGrok) {
        message = "Could not extract messages from this Grok link. Grok requires authentication to view shared conversations.";
        suggestion = "Open the Grok share link in your browser while logged into X/Twitter, then save the page as HTML (Ctrl+S) and upload it here.";
      } else if (isPerplexity) {
        message = "Could not extract messages from this Perplexity link. The page may load content dynamically.";
        suggestion = "Open the Perplexity share link in your browser, save the page as HTML (Ctrl+S), and upload it here.";
      } else if (isDeepSeek) {
        message = "Could not extract messages from this DeepSeek link. The page loads content dynamically.";
        suggestion = "Open the DeepSeek share link in your browser, save the page as HTML (Ctrl+S), and upload it here.";
      } else if (isMistral) {
        message = "Could not extract messages from this Mistral link. The page may require authentication.";
        suggestion = "Open the Mistral share link in your browser, save the page as HTML (Ctrl+S), and upload it here.";
      } else if (isCopilot) {
        message = "Could not extract messages from this Copilot link. Microsoft Copilot share pages may require sign-in.";
        suggestion = "Open the Copilot share link in your browser, save the page as HTML (Ctrl+S), and upload it here.";
      }

      return res.status(422).json({ error: "PARSING_FAILED", message, suggestion });
    }

    res.json({ title, messages: formattedMessages });
  } catch (error: any) {
    if (error.message?.includes("CHAT_DELETED")) return res.status(404).json({ error: "CHAT_DELETED", message: "The shared chat you provided has been deleted by its owner.", suggestion: "Please try another valid chat share link." });
    if (error.message?.includes("LOGIN_REQUIRED")) return res.status(403).json({ error: "LOGIN_REQUIRED", message: error.suggestion || "This is a private conversation and requires authentication to view.", suggestion: error.suggestion || "Export your chat as HTML and upload it here instead." });
    if (error.message?.includes("CLOUDFLARE_BLOCKED")) return res.status(403).json({ error: "CLOUDFLARE_BLOCKED", message: "This link is protected by Cloudflare and cannot be extracted automatically.", suggestion: "Please save the page as HTML in your browser and upload it instead." });
    if (error.name === "TimeoutError" || error.message?.toLowerCase().includes("timeout") || error.message === "EXTRACTION_TIMEOUT") {
      return res.status(504).json({ error: "TIMEOUT", message: "Extraction timed out. Please try again or use HTML export instead.", suggestion: "Try again later or use Markdown/HTML export instead." });
    }
    res.status(500).json({ error: "EXTRACTION_ERROR", message: error.message || "An unexpected error occurred during extraction." });
  }
});

// POST /api/extract-html
router.post("/extract-html", async (req: Request, res: Response) => {
  try {
    const { html, htmlMessages, structuredMessages, structuredTitle } = req.body;

    // Priority 1: htmlMessages from extension
    if (htmlMessages && Array.isArray(htmlMessages) && htmlMessages.length > 0) {
      let validMessages: any[] = [];
      for (const m of htmlMessages) {
        if (!m || typeof m.role !== "string") continue;
        if (m.role !== "user" && m.role !== "assistant") continue;
        let content = "";
        let content_html = "";
        if (m.htmlContent && typeof m.htmlContent === "string" && m.htmlContent.trim()) {
          const $msg = cheerio.load(m.htmlContent);
          $msg("button, [aria-label], [aria-hidden=\"true\"], .sr-only, svg, noscript, style, script").remove();
          $msg('[class*="citation"], [class*="source-chip"], [class*="footnote"], [class*="action"]').remove();
          $msg('[class*="toolbar"], [class*="tooltip"], [class*="copy"], [class*="like"], [class*="dislike"]').remove();
          $msg("*").each((_: number, el: any) => {
            const txt = $msg(el).text().trim().toLowerCase();
            if (txt === "show more" || txt === "show less" || txt === "show moreshow less") $msg(el).remove();
          });
          const cleanedHtml = $msg("body").html() || "";
          content_html = cleanedHtml;
          try { content = turndownService.turndown(cleanedHtml); } catch { content = $msg("body").text().trim(); }
        } else if (typeof m.content === "string") {
          content = m.content.trim();
        }
        content = content.trim().split("\n").filter((line: string) => {
          const l = line.trim().toLowerCase();
          return l !== "show more" && l !== "show less" && l !== "show moreshow less";
        }).join("\n").trim();
        if (content) validMessages.push({ role: m.role, content, content_html });
      }

      if (validMessages.length > 0) {
        while (validMessages.length > 0 && validMessages[0].role !== "user") validMessages.shift();
        const deduped: any[] = [];
        for (const msg of validMessages) {
          if (deduped.length === 0 || deduped[deduped.length - 1].role !== msg.role) deduped.push(msg);
        }
        const final = deduped.filter((msg: any, idx: number) => idx === 0 || msg.content !== deduped[idx - 1].content);
        if (final.length > 0) {
          return res.json({ title: structuredTitle || "Extracted Chat", messages: final, sessionId: `session_${Date.now()}`, extractedAt: new Date().toISOString() });
        }
      }
    }

    // Priority 2: plain structuredMessages
    if (structuredMessages && Array.isArray(structuredMessages) && structuredMessages.length > 0) {
      let validMessages = structuredMessages
        .filter((m: any) => m && typeof m.role === "string" && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
        .map((m: any) => ({ role: m.role, content: m.content.trim() }));
      if (validMessages.length > 0) {
        while (validMessages.length > 0 && validMessages[0].role !== "user") validMessages.shift();
        const deduped: any[] = [];
        for (const msg of validMessages) {
          if (deduped.length === 0 || deduped[deduped.length - 1].role !== msg.role) deduped.push(msg);
        }
        const final = deduped.filter((msg: any, idx: number) => idx === 0 || msg.content !== deduped[idx - 1].content);
        if (final.length > 0) {
          return res.json({ title: structuredTitle || "Extracted Chat", messages: final, sessionId: `session_${Date.now()}`, extractedAt: new Date().toISOString() });
        }
      }
    }

    if (!html || html.length < 100) {
      return res.status(400).json({ error: "INVALID_INPUT", message: "The uploaded file is empty or too small to be a valid chat export." });
    }

    const { title, messages, isDeadLink, deadLinkMessage } = extractMessagesFromHtml(html);

    if (isDeadLink) return res.status(404).json({ error: "CHAT_NOT_FOUND", message: deadLinkMessage, suggestion: "This chat link is no longer valid." });
    if (messages.length === 0) return res.status(422).json({ error: "PARSING_FAILED", message: "Could not extract structured messages from this HTML file.", suggestion: 'Ensure you saved the "Complete" page (Ctrl+S) and didn\'t change the filename extension.' });

    const now = Date.now();

    // Download images
    for (const msg of messages) {
      msg.imagesUrls = msg.imagesUrls || [];
      const localImages: string[] = [];
      for (const imgUrl of msg.imagesUrls) {
        const urlParts = imgUrl.split("?")[0].split("/");
        const lastPart = urlParts[urlParts.length - 1] || "";
        const extMatch = lastPart.match(/\.([a-zA-Z0-9]{1,4})$/);
        const ext = extMatch ? extMatch[1].toLowerCase() : "png";
        const filename = `${crypto.randomUUID()}.${ext}`;
        const filepath = path.join(storageDir, filename);
        try {
          if (imgUrl.startsWith("http")) {
            const response = await fetch(imgUrl, { headers: { "User-Agent": "Mozilla/5.0", Referer: "https://chatgpt.com/" } });
            if (response.ok) {
              const buffer = Buffer.from(await response.arrayBuffer());
              fs.writeFileSync(filepath, buffer);
              localImages.push(`api/images/${filename}`);
            } else {
              localImages.push(imgUrl);
            }
          } else if (imgUrl.startsWith("data:image")) {
            const matches = imgUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
              const buffer = Buffer.from(matches[2], "base64");
              fs.writeFileSync(filepath, buffer);
              localImages.push(`api/images/${filename}`);
            } else {
              localImages.push(imgUrl);
            }
          } else {
            localImages.push(imgUrl);
          }
        } catch {
          localImages.push(imgUrl);
        }
      }
      (msg as any).images = localImages;
    }

    const formattedMessages = messages.map((m, index) => ({
      role: m.role,
      content: m.content,
      images: (m as any).images || [],
      timestamp: m.timestamp || new Date(now - (messages.length - index) * 60000).toISOString(),
    }));

    res.json({ title, messages: formattedMessages });
  } catch (error: any) {
    res.status(500).json({
      error: "EXTRACTION_ERROR",
      message: error.message?.includes("fetch") ? "Failed to download image. The image server might be blocking the request." : (error.message || "Failed to process the uploaded HTML file."),
    });
  }
});

// GET /api/chatgpt-extractor.zip
router.get("/chatgpt-extractor.zip", (req: Request, res: Response) => {
  const zipPath = path.join(process.cwd(), "../../artifacts/bridge/public", "chatgpt-extractor.zip");
  if (fs.existsSync(zipPath)) {
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", "attachment; filename=chatgpt-extractor.zip");
    res.sendFile(path.resolve(zipPath));
  } else {
    res.status(404).send("Zip file not found");
  }
});

export { storageDir };
export default router;

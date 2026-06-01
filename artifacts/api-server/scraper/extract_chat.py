#!/usr/bin/env python3
"""
AI chat extractor — uses Scrapling + patchright with system Chromium for full
JavaScript rendering. No browser extension required.

Strategy order:
  1. Patchright (system Chromium, full JS render) — for ChatGPT & JS-heavy pages
  2. Scrapling Fetcher (curl_cffi, browser impersonation) — fast, no browser
  3. React Router v7 flight-data parser — ChatGPT static HTML fallback
  4. Generic JSON/DOM parser — Gemini, Claude, Grok, Perplexity, etc.
  5. Jina.ai reader proxy — server-side rendering fallback
  6. Plain requests — last resort

Usage: python3 extract_chat.py <url>
Outputs JSON: { title, messages: [{role, content_html, content}] }
"""

import sys
import json
import re
import html as html_lib
import os
import shutil
import subprocess


def _find_chromium() -> str:
    """Auto-detect the system Chromium binary — works on Replit, Render, Debian, etc."""
    # 1. Explicit override via env var
    env_path = os.environ.get("CHROMIUM_PATH", "")
    if env_path and os.path.isfile(env_path):
        return env_path

    # 2. Common binary names on PATH
    for name in ("chromium", "chromium-browser", "google-chrome", "google-chrome-stable"):
        found = shutil.which(name)
        if found:
            return found

    # 3. Nix store scan (Replit / NixOS)
    try:
        result = subprocess.run(
            ["find", "/nix/store", "-name", "chromium", "-type", "f"],
            capture_output=True, text=True, timeout=15,
        )
        for line in result.stdout.splitlines():
            if "/bin/chromium" in line and os.path.isfile(line.strip()):
                return line.strip()
    except Exception:
        pass

    # 4. Playwright/patchright bundled Chromium
    for base in [
        os.path.expanduser("~/.cache/ms-playwright"),
        os.path.expanduser("~/.cache/patchright"),
    ]:
        if os.path.isdir(base):
            try:
                result = subprocess.run(
                    ["find", base, "-name", "chromium", "-o", "-name", "chrome"],
                    capture_output=True, text=True, timeout=10,
                )
                for line in result.stdout.splitlines():
                    line = line.strip()
                    if os.path.isfile(line) and os.access(line, os.X_OK):
                        return line
            except Exception:
                pass

    return ""


SYSTEM_CHROMIUM = _find_chromium()
CHROMIUM_ARGS = [
    '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
    '--disable-setuid-sandbox', '--disable-software-rasterizer',
    '--disable-extensions', '--mute-audio', '--hide-scrollbars',
]

# ── Helpers ────────────────────────────────────────────────────────────────

def clean_text(text):
    return re.sub(r'\s+', ' ', text or '').strip()

def make_message(role, content):
    escaped = html_lib.escape(content).replace('\n', '<br>')
    return {'role': role, 'content': content, 'content_html': escaped}

def deduplicate(messages):
    seen, result = set(), []
    for m in messages:
        key = (m['role'], m['content'][:80])
        if key not in seen:
            seen.add(key)
            result.append(m)
    return result

DEAD_PHRASES = [
    "can't load shared", "can't load conversation",
    "conversation you requested could not be found",
    "this conversation may have been deleted",
    "been deleted by its owner",
    "conversation not found", "share link has expired",
    "this link has expired", "404 not found",
]

def is_dead_link(text):
    lower = text.lower()
    return any(p in lower for p in DEAD_PHRASES)

# ── Strategy 1: Patchright with system Chromium (full JS rendering) ────────

def try_patchright(url):
    """
    Launch the system Chromium via patchright, fully render the page,
    then return (page_html, body_text, title, messages).
    Works for ChatGPT, Claude, and any React/Angular SPA.
    """
    if not os.path.exists(SYSTEM_CHROMIUM):
        return None, None, None, []

    from patchright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=SYSTEM_CHROMIUM,
            headless=True,
            args=CHROMIUM_ARGS,
        )
        try:
            ctx = browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                locale='en-US',
                viewport={'width': 1280, 'height': 800},
            )
            page = ctx.new_page()
            page.goto(url, timeout=25000, wait_until='domcontentloaded')

            # Wait for messages to appear (up to 15 seconds)
            try:
                page.wait_for_selector(
                    '[data-message-author-role], '
                    '[data-testid="user-human-turn"], [data-testid="assistant-turn"], '
                    '.human-turn, [class*="HumanTurn"], '
                    '[class*="AssistantTurn"], .ai-turn, '
                    'article[data-testid*="message"]',
                    timeout=15000
                )
            except Exception:
                # No message selector appeared — give React a couple more seconds
                page.wait_for_timeout(3000)

            html_content = page.content()
            body_text = ''
            try:
                body_text = page.locator('body').inner_text(timeout=5000)
            except Exception:
                pass

            page_title = ''
            try:
                page_title = page.title()
            except Exception:
                pass

            messages = extract_messages_from_page_handle(page)
            return html_content, body_text, page_title, messages

        finally:
            browser.close()


def extract_messages_from_page_handle(page):
    """Extract messages from a live patchright/playwright page handle."""
    messages = []

    # ── ChatGPT: [data-message-author-role] ──────────────────────────────
    els = page.locator('[data-message-author-role]').all()
    if els:
        for el in els:
            try:
                role = el.get_attribute('data-message-author-role') or 'assistant'
                if role not in ('user', 'assistant'):
                    role = 'assistant'
                # Prefer rendered markdown/prose content
                prose = el.locator('.markdown, [class*="prose"], [class*="markdown"]').first
                try:
                    inner = prose.inner_html(timeout=2000)
                except Exception:
                    inner = el.inner_html(timeout=2000)
                content = re.sub(r'<[^>]+>', ' ', inner).strip()
                content = re.sub(r'\s+', ' ', content)
                if content:
                    messages.append({'role': role, 'content_html': inner, 'content': content})
            except Exception:
                continue
        return messages

    # ── Claude: testid-based (2024-2025 DOM) ─────────────────────────────
    # New Claude DOM: data-testid="user-human-turn" / "assistant-turn"
    # Try as interleaved list to preserve order
    claude_turn_els = page.locator(
        '[data-testid="user-human-turn"], [data-testid="assistant-turn"]'
    ).all()
    if claude_turn_els:
        for el in claude_turn_els:
            try:
                testid = el.get_attribute('data-testid') or ''
                role = 'user' if 'human' in testid else 'assistant'
                # Prefer the prose/markdown inner content to preserve tables, lists etc.
                prose = el.locator('.prose, [class*="prose"], [class*="font-claude"], [class*="markdown"]').first
                try:
                    inner = prose.inner_html(timeout=2000)
                except Exception:
                    inner = el.inner_html(timeout=2000)
                content = re.sub(r'<[^>]+>', ' ', inner).strip()
                content = re.sub(r'\s+', ' ', content)
                if content:
                    messages.append({'role': role, 'content_html': inner, 'content': content})
            except Exception:
                continue
        if messages:
            return messages

    # ── Claude: class-based fallback (older DOM / HTML exports) ───────────
    for sel, role in [
        ('.human-turn, [class*="HumanTurn"], [class*="human-message"]', 'user'),
        ('.ai-turn, [class*="AITurn"], [class*="AssistantTurn"], [class*="ai-message"]', 'assistant'),
    ]:
        for el in page.locator(sel).all():
            try:
                # Use inner_html to preserve tables, lists, code blocks
                inner = el.inner_html(timeout=2000)
                content = re.sub(r'<[^>]+>', ' ', inner).strip()
                content = re.sub(r'\s+', ' ', content)
                if content:
                    messages.append({'role': role, 'content_html': inner, 'content': content})
            except Exception:
                continue
    if messages:
        return messages

    # ── Gemini: user-query / model-response custom elements ──────────────
    for sel, role in [
        ('user-query, [class*="user-query"], .user-message', 'user'),
        ('model-response, ms-cmark-node, [class*="model-response"], .model-message', 'assistant'),
    ]:
        for el in page.locator(sel).all():
            try:
                text = el.inner_text(timeout=2000).strip()
                if text and len(text) > 3:
                    messages.append(make_message(role, text))
            except Exception:
                continue
    if messages:
        return messages

    # ── DeepSeek: ds-markdown blocks ─────────────────────────────────────
    ds_msgs = page.locator('[class*="ds-markdown"], [class*="deepseek"], [data-role]').all()
    if ds_msgs:
        for el in ds_msgs:
            try:
                role_attr = el.get_attribute('data-role') or ''
                cls = (el.get_attribute('class') or '').lower()
                if role_attr == 'user' or 'user' in cls:
                    role = 'user'
                elif role_attr == 'assistant' or 'markdown' in cls:
                    role = 'assistant'
                else:
                    continue
                inner = el.inner_html(timeout=2000)
                text = re.sub(r'<[^>]+>', ' ', inner).strip()
                text = re.sub(r'\s+', ' ', text)
                if text and len(text) > 3:
                    messages.append({'role': role, 'content_html': inner, 'content': text})
            except Exception:
                continue
        if messages:
            return messages

    # ── Perplexity: prose content blocks ─────────────────────────────────
    perp_user = page.locator('[data-testid="query-text"], .query-text, [class*="UserMessage"]').all()
    perp_ai = page.locator('[class*="AnswerHeader"], [class*="prose"], .answer-content, [class*="MarkdownContainer"]').all()
    if perp_user or perp_ai:
        for el in perp_user:
            try:
                text = el.inner_text(timeout=2000).strip()
                if text:
                    messages.append(make_message('user', text))
            except Exception:
                continue
        for el in perp_ai:
            try:
                text = el.inner_text(timeout=2000).strip()
                if text and len(text) > 10:
                    messages.append(make_message('assistant', text))
            except Exception:
                continue
        if messages:
            return messages

    # ── Mistral / Copilot: generic role-based selectors ──────────────────
    for sel, role in [
        ('[data-role="user"], [aria-label*="user" i], [class*="UserBubble"], [class*="user-bubble"]', 'user'),
        ('[data-role="assistant"], [aria-label*="assistant" i], [class*="AssistantBubble"], [class*="bot-bubble"]', 'assistant'),
    ]:
        for el in page.locator(sel).all():
            try:
                text = el.inner_text(timeout=2000).strip()
                if text and len(text) > 3:
                    messages.append(make_message(role, text))
            except Exception:
                continue
    if messages:
        return messages

    # ── Generic role containers ───────────────────────────────────────────
    for el in page.locator('[class*="message"], [class*="chat-bubble"], [class*="turn"]').all():
        try:
            cls = (el.get_attribute('class') or '').lower()
            if any(x in cls for x in ('user', 'human', 'question', 'prompt')):
                role = 'user'
            elif any(x in cls for x in ('assistant', 'ai', 'bot', 'answer', 'response')):
                role = 'assistant'
            else:
                continue
            text = el.inner_text(timeout=2000).strip()
            if text and len(text) > 5:
                messages.append(make_message(role, text))
        except Exception:
            continue

    return messages


# ── Strategy 2: Scrapling Fetcher (curl_cffi, no browser needed) ──────────

def try_scrapling_fetcher(url):
    from scrapling import Fetcher
    page = Fetcher().get(url, stealthy_headers=True, follow_redirects=True, timeout=25)
    html = page.html_content or ''
    if not html or len(html) < 500:
        return None, None
    return page, html


# ── Strategy 3: React Router v7 flight-data parser ─────────────────────────

def decode_react_router_flight(arr):
    memo = {}

    def resolve(v):
        if isinstance(v, int):
            return None if v < 0 else decode_value(v)
        return v

    def decode_value(idx):
        if idx in memo:
            return memo[idx]
        if idx >= len(arr):
            return None
        result = decode_raw(arr[idx])
        memo[idx] = result
        return result

    def decode_raw(raw):
        if isinstance(raw, dict):
            obj = {}
            for k, v in raw.items():
                if k.startswith('_'):
                    try:
                        ki = int(k[1:])
                        key = arr[ki] if ki < len(arr) else k
                        obj[key] = resolve(v)
                    except (ValueError, TypeError):
                        obj[k] = v
                else:
                    obj[k] = resolve(v) if isinstance(v, int) else v
            return obj
        if isinstance(raw, list):
            return [decode_raw(x) for x in raw]
        return raw

    return decode_raw(arr[0]) if arr else {}


def extract_chatgpt_flight(html_content):
    chunks = re.findall(r'streamController\.enqueue\("((?:[^"\\]|\\.)*)"\)', html_content)
    if not chunks:
        return None, None, []

    raw_json = chunks[0]
    try:
        raw_json = raw_json.encode('raw_unicode_escape').decode('unicode_escape')
    except Exception:
        raw_json = raw_json.replace('\\"', '"').replace('\\\\', '\\').replace('\\n', '\n')

    try:
        arr = json.loads(raw_json)
    except Exception:
        return None, None, []

    if not isinstance(arr, list):
        return None, None, []

    decoded = decode_react_router_flight(arr)
    loader_data = decoded.get('loaderData', {})
    if not isinstance(loader_data, dict):
        return None, None, []

    share_data = None
    for value in loader_data.values():
        if isinstance(value, dict) and ('serverResponse' in value or 'sharedConversationId' in value):
            share_data = value
            break

    if not share_data:
        return None, None, []

    server_resp = share_data.get('serverResponse')
    if not isinstance(server_resp, dict):
        return None, None, []

    if server_resp.get('type') == 'error':
        return True, None, []

    title = server_resp.get('title', 'ChatGPT Conversation')
    messages = []

    # Format A: flat messages list
    for key in ('messages', 'items', 'linear_conversation'):
        raw_msgs = server_resp.get(key)
        if isinstance(raw_msgs, list):
            for msg in raw_msgs:
                if not isinstance(msg, dict):
                    continue
                role = (msg.get('role') or (msg.get('author') or {}).get('role') or '')
                if role not in ('user', 'assistant'):
                    continue
                content = extract_content_from_msg(msg)
                if content:
                    messages.append(make_message(role, content))
            if messages:
                return False, title, messages

    # Format B: mapping dict
    mapping = server_resp.get('mapping') or server_resp.get('conversation_mapping')
    if isinstance(mapping, dict):
        messages = extract_from_mapping(mapping)
        if messages:
            return False, title, messages

    return False, title, []


def extract_content_from_msg(msg):
    content = msg.get('content')
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, dict):
        parts = content.get('parts')
        if isinstance(parts, list):
            return '\n'.join(str(p) for p in parts if isinstance(p, str)).strip()
        return str(content.get('text', '')).strip()
    if isinstance(content, list):
        texts = []
        for c in content:
            if isinstance(c, str):
                texts.append(c)
            elif isinstance(c, dict) and c.get('type') == 'text':
                texts.append(c.get('text', ''))
        return '\n'.join(texts).strip()
    return ''


def extract_from_mapping(mapping):
    children_map, root_id = {}, None
    for nid, node in mapping.items():
        if not isinstance(node, dict):
            continue
        parent = node.get('parent')
        if parent is None or parent not in mapping:
            root_id = nid
        children_map.setdefault(parent, []).append(nid)

    ordered = []
    def dfs(nid):
        ordered.append(nid)
        for child in children_map.get(nid, []):
            dfs(child)
    if root_id:
        dfs(root_id)
    else:
        ordered = list(mapping.keys())

    messages = []
    for nid in ordered:
        node = mapping.get(nid, {})
        msg = node.get('message') if isinstance(node, dict) else None
        if not isinstance(msg, dict):
            continue
        author = msg.get('author', {})
        role = (author.get('role', '') if isinstance(author, dict) else '')
        if role not in ('user', 'assistant'):
            continue
        content = extract_content_from_msg(msg)
        if content and len(content) > 1:
            messages.append(make_message(role, content))
    return messages


# ── Strategy 4: Generic JSON / DOM extraction ──────────────────────────────

def extract_json_messages(html_content):
    messages = []

    # __NEXT_DATA__ (Gemini share pages, older ChatGPT)
    m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html_content, re.DOTALL)
    if m:
        try:
            data = json.loads(m.group(1))
            def search(obj):
                if isinstance(obj, list):
                    for i in obj: search(i)
                elif isinstance(obj, dict):
                    role = obj.get('role') or (obj.get('author') or {}).get('role')
                    content_obj = obj.get('content')
                    if role in ('user', 'assistant') and isinstance(content_obj, dict) and 'parts' in content_obj:
                        txt = '\n'.join(str(p) for p in content_obj['parts'] if isinstance(p, str))
                        if txt.strip():
                            messages.append(make_message(role, txt.strip()))
                    elif role in ('user', 'assistant') and isinstance(content_obj, str) and content_obj.strip():
                        messages.append(make_message(role, content_obj.strip()))
                    else:
                        for v in obj.values(): search(v)
            search(data)
            if messages:
                return messages
        except Exception:
            pass

    # window.__remixContext (Grok, Perplexity)
    idx = html_content.find('window.__remixContext =')
    if idx != -1:
        try:
            start = html_content.index('{', idx)
            depth, in_str, esc, end = 0, False, False, start
            for i, c in enumerate(html_content[start:], start):
                if esc: esc = False; continue
                if c == '\\': esc = True; continue
                if c == '"': in_str = not in_str; continue
                if not in_str:
                    if c == '{': depth += 1
                    elif c == '}':
                        depth -= 1
                        if depth == 0: end = i; break
            data = json.loads(html_content[start:end+1])
            def search2(obj):
                if isinstance(obj, list):
                    for i in obj: search2(i)
                elif isinstance(obj, dict):
                    role = obj.get('role') or (obj.get('author') or {}).get('role')
                    c = obj.get('content')
                    if role in ('user', 'assistant'):
                        if isinstance(c, dict) and 'parts' in c:
                            txt = '\n'.join(str(p) for p in c['parts'] if isinstance(p, str))
                            if txt.strip(): messages.append(make_message(role, txt.strip()))
                        elif isinstance(c, str) and c.strip():
                            messages.append(make_message(role, c.strip()))
                        else:
                            for v in obj.values(): search2(v)
                    else:
                        for v in obj.values(): search2(v)
            search2(data)
            if messages:
                return messages
        except Exception:
            pass

    # DeepSeek: look for message arrays in script tags or window vars
    for pattern in [
        r'"role"\s*:\s*"(user|assistant)"[^}]{0,200}?"content"\s*:\s*"((?:[^"\\]|\\.){10,2000}?)"',
        r'"type"\s*:\s*"(human|ai)"[^}]{0,200}?"content"\s*:\s*"((?:[^"\\]|\\.){10,2000}?)"',
    ]:
        for match in re.finditer(pattern, html_content, re.DOTALL):
            role_raw = match.group(1)
            role = 'user' if role_raw in ('user', 'human') else 'assistant'
            content = match.group(2).replace('\\n', '\n').replace('\\"', '"').replace('\\\\', '\\').strip()
            if content and len(content) > 3:
                messages.append(make_message(role, content))
        if messages:
            return messages

    # Perplexity: thread JSON format
    m = re.search(r'"queryStr"\s*:\s*"((?:[^"\\]|\\.){3,}?)"', html_content)
    if m:
        q = m.group(1).replace('\\n', '\n').replace('\\"', '"').strip()
        if q:
            messages.append(make_message('user', q))
    for ans_match in re.finditer(r'"answer"\s*:\s*"((?:[^"\\]|\\.){10,}?)"', html_content, re.DOTALL):
        a = ans_match.group(1).replace('\\n', '\n').replace('\\"', '"').strip()
        if a and len(a) > 10:
            messages.append(make_message('assistant', a))
    if messages:
        return messages

    # Regex patterns (various platforms)
    for pattern in [
        r'"role"\s*:\s*"(user|assistant)"[^}]{0,400}?"parts"\s*:\s*\[\s*"((?:[^"\\]|\\.)*?)"',
        r'"sender"\s*:\s*"(human|assistant)"[^}]{0,300}?"text"\s*:\s*"((?:[^"\\]|\\.)*?)"',
        r'"role"\s*:\s*"(user|assistant)"\s*[^}]{0,200}?"content"\s*:\s*"((?:[^"\\]|\\.){10,800}?)"',
    ]:
        for match in re.finditer(pattern, html_content, re.DOTALL):
            role = 'user' if match.group(1) in ('user', 'human') else 'assistant'
            content = match.group(2).replace('\\n', '\n').replace('\\"', '"').replace('\\\\', '\\').strip()
            if content and len(content) > 3:
                messages.append(make_message(role, content))
        if messages:
            return messages

    return messages


def extract_dom_messages(page):
    messages = []

    # ChatGPT DOM (only works if JS-rendered by patchright)
    els = page.css('[data-message-author-role]')
    if els:
        for el in els:
            role = el.attrib.get('data-message-author-role', 'assistant')
            if role not in ('user', 'assistant'): role = 'assistant'
            inner_els = el.css('.markdown') or el.css('[class*="prose"]')
            inner = (inner_els[0].html if inner_els else el.html) or el.text or ''
            content = clean_text(inner)
            if content:
                messages.append({'role': role, 'content_html': inner, 'content': re.sub(r'<[^>]+>', '', inner)})
        return messages

    # Claude — testid-based (2024-2025 DOM), interleaved to keep order
    claude_turns = page.css('[data-testid="user-human-turn"], [data-testid="assistant-turn"]')
    if claude_turns:
        for el in claude_turns:
            testid = el.attrib.get('data-testid', '')
            role = 'user' if 'human' in testid else 'assistant'
            # Prefer inner prose/markdown HTML to preserve tables, bold, lists
            inner_els = el.css('.prose, [class*="prose"], [class*="font-claude"], [class*="markdown"]')
            inner = (inner_els[0].html if inner_els else el.html) or ''
            text = re.sub(r'<[^>]+>', ' ', inner).strip()
            text = re.sub(r'\s+', ' ', text)
            if text:
                messages.append({'role': role, 'content_html': inner, 'content': text})
        if messages:
            return messages

    # Claude — class-based fallback (older DOM / Claude HTML exports)
    for sel, role in [
        ('.human-turn, [class*="HumanTurn"], [class*="human-message"]', 'user'),
        ('.ai-turn, [class*="AITurn"], [class*="AssistantTurn"], [class*="ai-message"]', 'assistant'),
    ]:
        for el in page.css(sel):
            inner_els = el.css('.prose, [class*="prose"]')
            inner = (inner_els[0].html if inner_els else el.html) or ''
            text = re.sub(r'<[^>]+>', ' ', inner).strip()
            text = re.sub(r'\s+', ' ', text)
            if not text:
                text = clean_text(el.text or '')
            if text:
                messages.append({'role': role, 'content_html': inner, 'content': text})
    if messages:
        return messages

    # Gemini: user-query / model-response custom elements
    for sel, role in [
        ('user-query, [class*="user-query"]', 'user'),
        ('model-response, ms-cmark-node, [class*="model-response"]', 'assistant'),
    ]:
        for el in page.css(sel):
            text = clean_text(el.text or '')
            if text and len(text) > 3:
                messages.append(make_message(role, text))
    if messages:
        return messages

    # DeepSeek: ds-markdown or data-role
    for el in page.css('[data-role], [class*="ds-markdown"]'):
        cls = (el.attrib.get('class', '') or '').lower()
        role_attr = el.attrib.get('data-role', '')
        if role_attr == 'user' or ('user' in cls and 'markdown' not in cls):
            role = 'user'
        elif role_attr == 'assistant' or 'ds-markdown' in cls or 'markdown' in cls:
            role = 'assistant'
        else:
            continue
        text = clean_text(el.text or '')
        if text and len(text) > 3:
            messages.append(make_message(role, text))
    if messages:
        return messages

    # Perplexity: query-text / answer blocks
    for el in page.css('[data-testid="query-text"], .query-text, [class*="UserMessage"]'):
        text = clean_text(el.text or '')
        if text:
            messages.append(make_message('user', text))
    for el in page.css('[class*="AnswerHeader"], [class*="MarkdownContainer"], [class*="prose"]'):
        text = clean_text(el.text or '')
        if text and len(text) > 10:
            messages.append(make_message('assistant', text))
    if messages:
        return messages

    # Mistral / Copilot: data-role or aria-based
    for sel, role in [
        ('[data-role="user"], [aria-label*="user" i], [class*="UserBubble"]', 'user'),
        ('[data-role="assistant"], [aria-label*="assistant" i], [class*="BotBubble"], [class*="AssistantBubble"]', 'assistant'),
    ]:
        for el in page.css(sel):
            text = clean_text(el.text or '')
            if text and len(text) > 3:
                messages.append(make_message(role, text))
    if messages:
        return messages

    # Generic
    for el in page.css('[class*="message"], [class*="chat-bubble"], [class*="turn"]'):
        cls = (el.attrib.get('class', '') or '').lower()
        if any(x in cls for x in ('user', 'human', 'question', 'prompt')):
            role = 'user'
        elif any(x in cls for x in ('assistant', 'ai', 'bot', 'answer', 'response', 'model')):
            role = 'assistant'
        else:
            continue
        text = clean_text(el.text or '')
        if text and len(text) > 5:
            messages.append(make_message(role, text))

    return messages


# ── Strategy 5: Jina.ai reader ─────────────────────────────────────────────

def try_jina_reader(url):
    import requests as req
    r = req.get(f'https://r.jina.ai/{url}', headers={
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/html,application/xhtml+xml',
        'X-Timeout': '25',
    }, timeout=30, allow_redirects=True)
    r.raise_for_status()
    html = r.text
    if not html or len(html) < 300:
        return None, None
    from scrapling.parser import Adaptor
    return Adaptor(html, url=url), html


# ── Strategy 6: Plain requests ─────────────────────────────────────────────

def try_plain_requests(url):
    import requests as req
    r = req.get(url, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
    }, timeout=20, allow_redirects=True)
    r.raise_for_status()
    html = r.text
    if not html or len(html) < 300:
        return None, None
    from scrapling.parser import Adaptor
    return Adaptor(html, url=url), html


# ── Main ───────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No URL provided'}))
        sys.exit(1)

    url = sys.argv[1]
    is_chatgpt = 'chatgpt.com/share' in url or 'chat.openai.com/share' in url
    is_gemini = 'gemini.google.com' in url or 'aistudio.google.com' in url
    is_perplexity = 'perplexity.ai' in url
    is_deepseek = 'chat.deepseek.com' in url or 'deepseek.com/share' in url
    is_mistral = 'chat.mistral.ai' in url or 'mistral.ai' in url
    is_copilot = 'copilot.microsoft.com' in url or 'bing.com/chat' in url
    is_claude = 'claude.ai' in url
    is_claude_share = 'claude.ai/share' in url
    is_claude_private = is_claude and not is_claude_share
    # ALL claude.ai URLs need full JS rendering — private links redirected to
    # login before, causing garbage extraction with only user messages visible.
    is_js_heavy = (is_chatgpt or is_claude or 'grok.com' in url
                   or is_gemini or is_perplexity or is_deepseek or is_mistral or is_copilot)

    messages = []
    title = 'Extracted Chat'

    # ── Strategy 0 (Claude share only): Direct API JSON fetch ──────────────
    # Claude share links expose a JSON API — faster and more reliable than DOM.
    if is_claude_share:
        try:
            import requests as req
            # Extract share ID from URL
            share_id = url.rstrip('/').split('/')[-1]
            api_endpoints = [
                f'https://claude.ai/api/share/{share_id}',
                f'https://claude.ai/api/share_links/{share_id}',
            ]
            for api_url in api_endpoints:
                try:
                    r = req.get(api_url, headers={
                        'Accept': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
                        'Referer': 'https://claude.ai/',
                    }, timeout=10)
                    if r.status_code == 200:
                        data = r.json()
                        # Try various response shapes
                        raw_msgs = (data.get('chat_messages') or data.get('messages')
                                    or data.get('conversation', {}).get('messages', []))
                        for m in raw_msgs:
                            role = m.get('sender') or m.get('role') or ''
                            role = 'user' if role in ('human', 'user') else 'assistant'
                            text = ''
                            content = m.get('content') or m.get('text') or ''
                            if isinstance(content, str):
                                text = content.strip()
                            elif isinstance(content, list):
                                parts = []
                                for part in content:
                                    if isinstance(part, dict):
                                        parts.append(part.get('text', '') or part.get('value', ''))
                                    elif isinstance(part, str):
                                        parts.append(part)
                                text = '\n'.join(parts).strip()
                            if text:
                                messages.append(make_message(role, text))
                        if messages:
                            title = data.get('title') or data.get('name') or 'Claude Conversation'
                            break
                except Exception:
                    continue
        except Exception:
            pass

    # ── Strategy 1: Patchright (full JS rendering) ─────────────────────────
    if not messages and is_js_heavy and os.path.exists(SYSTEM_CHROMIUM):
        try:
            html_content, body_text, page_title, pw_messages = try_patchright(url)
            if body_text and is_dead_link(body_text):
                print(json.dumps({'error': 'CHAT_DELETED',
                                  'message': 'This shared chat has been deleted or is no longer available.'}))
                sys.exit(0)
            # Detect Claude login redirect — Cloudflare bot detection sends headless
            # browsers to the login page even for public share links.
            if is_claude and body_text and (
                'sign in - claude' in body_text.lower()
                or ('continue with google' in body_text.lower() and 'claude' in url.lower())
            ):
                print(json.dumps({
                    'error': 'PARSING_FAILED',
                    'message': "Claude blocks automated access to share links — even public ones are protected by Cloudflare bot detection.",
                    'suggestion': "Open the share link in your browser → press Ctrl+S (Cmd+S on Mac) → save as \"Webpage, Complete\" → upload the .html file here.",
                    'claude_blocked': True,
                }))
                sys.exit(0)
            if pw_messages:
                messages = pw_messages
                title = page_title or title
            elif html_content:
                # Fallback to static parsers on the patchright-rendered HTML
                if is_chatgpt and 'streamController' in html_content:
                    is_deleted, ft, fm = extract_chatgpt_flight(html_content)
                    if is_deleted:
                        print(json.dumps({'error': 'CHAT_DELETED',
                                          'message': 'This shared chat has been deleted or is no longer available.'}))
                        sys.exit(0)
                    if fm:
                        messages, title = fm, ft or title
                if not messages:
                    messages = extract_json_messages(html_content)
                if page_title and page_title.lower() not in ('chatgpt', 'claude', 'gemini', ''):
                    title = page_title
        except Exception:
            pass

    # ── Strategy 2: Scrapling Fetcher (curl_cffi) ──────────────────────────
    if not messages:
        try:
            scrapling_page, html_content = try_scrapling_fetcher(url)
            if html_content:
                # Dead-link check
                if is_dead_link(html_content):
                    print(json.dumps({'error': 'CHAT_DELETED',
                                      'message': 'This shared chat has been deleted or is no longer available.'}))
                    sys.exit(0)
                # ChatGPT flight data
                if is_chatgpt and 'streamController' in html_content:
                    is_deleted, ft, fm = extract_chatgpt_flight(html_content)
                    if is_deleted:
                        print(json.dumps({'error': 'CHAT_DELETED',
                                          'message': 'This shared chat has been deleted or is no longer available.'}))
                        sys.exit(0)
                    if fm:
                        messages, title = fm, ft or title
                # DOM parser
                if not messages and scrapling_page:
                    try:
                        messages = extract_dom_messages(scrapling_page)
                    except Exception:
                        pass
                # JSON parser
                if not messages:
                    messages = extract_json_messages(html_content)
                # Title
                if not messages or title == 'Extracted Chat':
                    try:
                        t = scrapling_page.css('title')
                        if t:
                            tt = clean_text(t[0].text or '')
                            if tt and tt.lower() not in ('chatgpt', 'claude', 'gemini', ''):
                                title = tt
                    except Exception:
                        pass
        except Exception:
            pass

    # ── Strategy 3: Jina.ai ────────────────────────────────────────────────
    if not messages:
        try:
            jina_page, jina_html = try_jina_reader(url)
            if jina_html:
                if is_dead_link(jina_html):
                    print(json.dumps({'error': 'CHAT_DELETED',
                                      'message': 'This shared chat has been deleted or is no longer available.'}))
                    sys.exit(0)
                if is_chatgpt and 'streamController' in jina_html:
                    _, jt, jm = extract_chatgpt_flight(jina_html)
                    if jm:
                        messages, title = jm, jt or title
                if not messages and jina_page:
                    try:
                        messages = extract_dom_messages(jina_page)
                    except Exception:
                        pass
                if not messages:
                    messages = extract_json_messages(jina_html)
        except Exception:
            pass

    # ── Strategy 4: Plain requests ─────────────────────────────────────────
    if not messages:
        try:
            plain_page, plain_html = try_plain_requests(url)
            if plain_html:
                if is_dead_link(plain_html):
                    print(json.dumps({'error': 'CHAT_DELETED',
                                      'message': 'This shared chat has been deleted or is no longer available.'}))
                    sys.exit(0)
                if not messages and plain_page:
                    try:
                        messages = extract_dom_messages(plain_page)
                    except Exception:
                        pass
                if not messages:
                    messages = extract_json_messages(plain_html)
        except Exception:
            pass

    messages = deduplicate(messages)
    while messages and messages[0]['role'] != 'user':
        messages.pop(0)

    # ── Claude-specific: detect partial extraction (only user messages) ─────
    # If we got messages but ALL of them are 'user', the browser never got
    # Claude's responses — this means auth was required (private link) or
    # the page redirected to login. Return LOGIN_REQUIRED so the UI shows
    # the HTML export tip instead of misleading partial results.
    if is_claude and messages and all(m['role'] == 'user' for m in messages):
        if is_claude_private:
            print(json.dumps({
                'error': 'LOGIN_REQUIRED',
                'message': 'This is a private Claude conversation. Claude requires you to be logged in to view private chats.',
                'suggestion': 'Export your chat from Claude: open the conversation → click the share icon → "Download" or use the "..." menu → "Export". Then upload the HTML file here.',
            }))
        else:
            # Share link that only gave user messages — page structure issue
            print(json.dumps({
                'error': 'PARSING_FAILED',
                'message': 'Could only extract user messages from this Claude share link. Claude\'s response content was not accessible.',
                'suggestion': 'Try saving the Claude share page as HTML (Ctrl+S in your browser) and uploading that file instead.',
            }))
        sys.exit(0)

    if not messages:
        if is_claude_private:
            print(json.dumps({
                'error': 'LOGIN_REQUIRED',
                'message': 'This is a private Claude conversation and requires authentication. Private claude.ai/chat/ links cannot be extracted without being logged in.',
                'suggestion': 'Export your chat: in Claude, click the share icon or "..." menu → Export/Download → upload the HTML file here.',
            }))
        else:
            print(json.dumps({
                'error': 'PARSING_FAILED',
                'message': 'Could not extract chat messages. The link may be private, or the page structure has changed.',
                'title': title,
            }))
        sys.exit(0)

    print(json.dumps({'title': title, 'messages': messages}))


if __name__ == '__main__':
    main()

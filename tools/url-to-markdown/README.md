# url-to-markdown

Web page content extraction tool that defeats bot protection through browser-impersonating TLS/HTTP2 fingerprints.

## Usage

```bash
node tools/url-to-markdown/url-to-markdown.mjs <url> [--json] [--output <prefix>]
```

### Options

| Flag | Description |
|------|-------------|
| `--json` | Also save intermediate JSON with extracted metadata |
| `--output <prefix>` | Use `<prefix>.md` (and `<prefix>.json`) instead of auto-naming from title |

### Examples

```bash
# Basic extraction
node tools/url-to-markdown/url-to-markdown.mjs https://example.com/article

# Save both Markdown and JSON
node tools/url-to-markdown/url-to-markdown.mjs https://blog.example.com/post --json

# Custom output path
node tools/url-to-markdown/url-to-markdown.mjs https://example.com/article --output docs/my-article
```

## How It Works

The tool chains three stages:

1. **Fetch** -- `impit` + `header-generator` produce a request indistinguishable from a real Chrome browser
2. **Extract** -- Mozilla Readability strips navigation, ads, and boilerplate to isolate article content
3. **Convert** -- Turndown with GFM support converts the clean HTML to Markdown

## Why impit?

Node.js cannot mimic a real browser's network fingerprint using built-in APIs. Bot protection systems inspect multiple layers before HTTP headers are even visible:

### TLS fingerprinting (JA3/JA4)

Node.js uses OpenSSL for TLS. Chrome uses BoringSSL. They produce fundamentally different ClientHello messages:

| What you CAN control in Node.js | What you CANNOT control |
|---------------------------------|------------------------|
| Cipher suite list and order (`ciphers`) | TLS extension order (hardcoded in OpenSSL; [Node.js issue #41112](https://github.com/nodejs/node/issues/41112)) |
| Signature algorithms (`sigalgs`) | Chrome-specific extensions (`compress_certificate`, `encrypted_client_hello`, `application_settings`) |
| Elliptic curves (`ecdhCurve`) | GREASE values (Chrome inserts random GREASE; OpenSSL has no support) |
| ALPN protocols | Post-quantum key exchange (`X25519-MLKEM768`) |

Reordering cipher suites changes only 1 of 5 JA3 fields -- still instantly identifiable as non-browser.

### HTTP/2 fingerprinting

Node.js sends different SETTINGS values and a different pseudo-header order than Chrome:

| Signal | Node.js (nghttp2) | Chrome |
|--------|-------------------|--------|
| INITIAL_WINDOW_SIZE | 65,535 | 6,291,456 |
| Pseudo-header order | `:method, :path, :scheme, :authority` | `:method, :authority, :scheme, :path` |

The pseudo-header order is hardcoded in nghttp2's C binding and not configurable from Node.js.

### How impit solves this

`impit` (by Apify, Apache-2.0) is a Rust NAPI addon that replaces Node.js's entire TLS and HTTP/2 stack:

- **Patched `rustls`** constructs ClientHello messages indistinguishable from Chrome
- **Patched `h2` crate** sends Chrome-matching SETTINGS, pseudo-header order, and WINDOW_UPDATE
- **`fetch()`-compatible API** -- minimal code changes needed
- **Prebuilt binaries** for macOS, Linux, and Windows (including ARM64, ~7 MB each)

### header-generator completes the picture

`header-generator` (from Apify's fingerprint-suite, Apache-2.0) uses a Bayesian network trained on real browser data to generate statistically realistic, internally-consistent HTTP header combinations:

- User-Agent matching actual Chrome versions
- `Sec-CH-UA` Client Hints consistent with the User-Agent
- `Sec-Fetch-*` headers that browsers always send over HTTPS
- `Accept-Language` with realistic quality values

| Layer | What checks it | Handled by |
|-------|---------------|------------|
| TLS ClientHello (JA3/JA4) | Cloudflare, Akamai, DataDome | `impit` |
| HTTP/2 SETTINGS + pseudo-headers | Akamai, Cloudflare | `impit` |
| HTTP headers (UA, Sec-CH-UA, Sec-Fetch-*) | All WAFs, simple bot checks | `header-generator` |
| Header ordering | CDNs, advanced WAFs | `header-generator` |

## Tool Selection Guide

For Claude-facing tools (MCP servers, hook scripts), prefer these free, unlimited alternatives to WebFetch:

| Scenario | Tool | Reason |
|----------|------|--------|
| Static HTML pages | WebFetch | Fastest, cached, but summarized via Haiku |
| Articles / blog posts | url-to-markdown | Chrome-like TLS fingerprint, Readability extraction, clean output |
| Documents (PDF, DOCX, XLSX) | MarkItDown MCP | Best format support (not for bypassing bot protection) |
| JS-heavy / heavily protected (last resort) | Playwriter MCP | Full browser bypasses detection, but slow |
| npm packages | `registry.npmjs.org` API | Direct JSON, no bot protection |

## Dependencies

| Package | Role | Size |
|---------|------|------|
| `impit` | Chrome-like TLS/HTTP2 fingerprints (Rust NAPI addon) | ~7 MB native binary |
| `header-generator` | Bayesian-network browser headers (pure JS) | ~2 MB |
| `@mozilla/readability` | Article content extraction | ~100 KB |
| `linkedom` | DOM parsing (server-side) | ~300 KB |
| `turndown` | HTML to Markdown conversion | ~50 KB |
| `turndown-plugin-gfm` | GFM tables, strikethrough, task lists | ~10 KB |

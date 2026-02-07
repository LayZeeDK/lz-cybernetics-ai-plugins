#!/usr/bin/env node
/**
 * URL to Markdown -- Web Page Content Extraction Script
 *
 * Fetches a web page, extracts the article content using Mozilla Readability,
 * and converts it to clean Markdown using Turndown with GFM support.
 *
 * Usage:
 *   node url-to-markdown.mjs <url> [--json] [--output <prefix>]
 *
 * Options:
 *   --json             Also save the intermediate JSON file
 *   --output <prefix>  Use <prefix>.md (and <prefix>.json) instead of auto-naming
 *
 * Examples:
 *   node url-to-markdown.mjs https://example.com/article
 *   node url-to-markdown.mjs https://blog.example.com/post --json
 *   node url-to-markdown.mjs https://example.com/article --output my-article
 */

import fs from 'node:fs';
import path from 'node:path';
import { Readability } from '@mozilla/readability';
import { HeaderGenerator } from 'header-generator';
import { Impit, Browser } from 'impit';
import { parseHTML } from 'linkedom';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { sanitizeFilename } from './utils/filename.mjs';

// Module-level: create impit client and header generator once
const client = new Impit({ browser: Browser.Chrome });

const headerGenerator = new HeaderGenerator({
  browsers: [{ name: 'chrome', minVersion: 120 }],
  devices: ['desktop'],
  operatingSystems: ['windows'],
  locales: ['en-US', 'en'],
  httpVersion: '2',
});

/**
 * Parse CLI arguments.
 *
 * @param {string[]} argv - process.argv.slice(2)
 * @returns {{ url: string|null, json: boolean, output: string|null }}
 */
function parseArgs(argv) {
  let url = null;
  let json = false;
  let output = null;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--json') {
      json = true;
    } else if (argv[i] === '--output' && i + 1 < argv.length) {
      output = argv[i + 1];
      i++; // skip next arg
    } else if (!argv[i].startsWith('--')) {
      url = argv[i];
    }
  }

  return { url, json, output };
}

/**
 * Fetch a web page and return its HTML content.
 *
 * @param {string} url - The URL to fetch
 * @returns {Promise<{ html: string, finalUrl: string }>} The HTML content and final URL after redirects
 */
async function fetchPage(url) {
  console.log(`[INFO] Fetching URL: ${url}`);

  // Generate randomized but realistic Chrome headers
  const generatedHeaders = headerGenerator.getHeaders();

  // Override Accept to prefer HTML content
  generatedHeaders['accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';

  let response;

  try {
    response = await client.fetch(url, {
      headers: generatedHeaders,
      redirect: 'follow',
    });
  } catch (error) {
    throw new Error(`Network error: ${error.message}`);
  }

  if (!response.ok) {
    if (response.status === 403 || response.status === 429) {
      console.log(`[WARN] Received HTTP ${response.status}. The site may be blocking automated requests.`);
      console.log(`[WARN] Consider using Playwriter as a fallback to render the page in a browser.`);
    }

    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const finalUrl = response.url;

  if (finalUrl !== url) {
    console.log(`[INFO] Redirected to: ${finalUrl}`);
  }

  const html = await response.text();
  console.log(`[INFO] Fetched ${html.length} bytes of HTML.`);

  return { html, finalUrl };
}

/**
 * Extract article content from HTML using Mozilla Readability.
 *
 * @param {string} html - Raw HTML string
 * @param {string} url - The page URL (used by Readability for resolving relative links)
 * @returns {{ title: string, content: string, byline: string|null, excerpt: string|null, siteName: string|null, publishedTime: string|null, length: number }}
 */
function extractArticle(html, url) {
  const { document } = parseHTML(html);

  // Set the document URL so Readability can resolve relative links
  if (url) {
    try {
      const urlObj = new URL(url);

      // Set base element if not present
      let base = document.querySelector('base');

      if (!base) {
        base = document.createElement('base');
        base.setAttribute('href', urlObj.origin);
        const head = document.querySelector('head');

        if (head) {
          head.prepend(base);
        }
      }
    } catch {
      // Ignore URL parsing errors
    }
  }

  const reader = new Readability(document);
  const article = reader.parse();

  if (!article) {
    console.log('[WARN] Readability could not extract article content. Falling back to full HTML body.');

    // Re-parse since Readability mutates the document
    const { document: freshDoc } = parseHTML(html);
    const body = freshDoc.querySelector('body');
    const fallbackHtml = body ? body.innerHTML : html;
    const titleEl = freshDoc.querySelector('title');
    const fallbackTitle = titleEl ? titleEl.textContent.trim() : 'Untitled';

    return {
      title: fallbackTitle,
      content: fallbackHtml,
      byline: null,
      excerpt: null,
      siteName: null,
      publishedTime: null,
      length: fallbackHtml.length,
    };
  }

  return {
    title: article.title || 'Untitled',
    content: article.content || '',
    byline: article.byline || null,
    excerpt: article.excerpt || null,
    siteName: article.siteName || null,
    publishedTime: article.publishedTime || null,
    length: article.length || 0,
  };
}

/**
 * Convert extracted article HTML to Markdown using Turndown with GFM support.
 *
 * @param {{ title: string, content: string, byline: string|null, siteName: string|null }} article - Extracted article data
 * @param {string} sourceUrl - The original source URL
 * @returns {string} The formatted Markdown string
 */
function convertToMarkdown(article, sourceUrl) {
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  });

  turndownService.use(gfm);

  // Convert article HTML to Markdown
  const bodyMarkdown = turndownService.turndown(article.content);

  // Build the header
  const headerLines = [`# ${article.title}`, ''];

  const metaLines = [];
  metaLines.push(`> Source: [${sourceUrl}](${sourceUrl})`);

  if (article.byline) {
    metaLines.push(`> Author: ${article.byline}`);
  }

  if (article.siteName) {
    metaLines.push(`> Site: ${article.siteName}`);
  }

  headerLines.push(metaLines.join('\n'));
  headerLines.push('');
  headerLines.push('---');
  headerLines.push('');

  return headerLines.join('\n') + bodyMarkdown + '\n';
}

/**
 * Determine the output file paths based on CLI options and article title.
 *
 * @param {string} title - Article title
 * @param {string|null} outputPrefix - User-specified output prefix, or null
 * @returns {{ mdPath: string, jsonPath: string }}
 */
function resolveOutputPaths(title, outputPrefix) {
  if (outputPrefix) {
    const resolved = path.resolve(outputPrefix);

    return {
      mdPath: `${resolved}.md`,
      jsonPath: `${resolved}.json`,
    };
  }

  const sanitized = sanitizeFilename(title);
  const basename = sanitized || 'page';

  return {
    mdPath: path.resolve(basename + '.md'),
    jsonPath: path.resolve(basename + '.json'),
  };
}

/**
 * Main entry point.
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.url) {
    console.error('[ERROR] Usage: node url-to-markdown.mjs <url> [--json] [--output <prefix>]');
    process.exit(1);
  }

  // Validate URL
  let parsedUrl;

  try {
    parsedUrl = new URL(args.url);
  } catch {
    console.error(`[ERROR] Invalid URL: ${args.url}`);
    process.exit(1);
  }

  console.log(`[INFO] URL: ${parsedUrl.href}`);

  // Fetch the page
  let html;
  let finalUrl;

  try {
    const result = await fetchPage(parsedUrl.href);
    html = result.html;
    finalUrl = result.finalUrl;
  } catch (error) {
    console.error(`[ERROR] Failed to fetch page: ${error.message}`);
    process.exit(1);
  }

  // Check if the URL points to a raw Markdown file
  const urlPath = parsedUrl.pathname.toLowerCase();

  if (urlPath.endsWith('.md')) {
    console.log('[INFO] URL points to a Markdown file. Saving raw content with metadata header.');

    // Extract a title from the filename
    const filename = path.basename(parsedUrl.pathname, '.md');
    const title = filename.replace(/[-_]/g, ' ');

    const metaHeader = [
      `# ${title}`,
      '',
      `> Source: [${parsedUrl.href}](${parsedUrl.href})`,
      '',
      '---',
      '',
    ].join('\n');

    const markdown = metaHeader + html;

    const { mdPath, jsonPath } = resolveOutputPaths(title, args.output);

    if (args.json) {
      const jsonData = {
        url: parsedUrl.href,
        fetchedUrl: finalUrl,
        title: title,
        byline: null,
        siteName: null,
        excerpt: null,
        publishedTime: null,
        content: html,
      };

      fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');
      console.log(`[OK] JSON saved: ${path.basename(jsonPath)}`);
    }

    fs.writeFileSync(mdPath, markdown, 'utf-8');
    console.log(`[OK] Markdown saved: ${path.basename(mdPath)}`);
    console.log('');
    console.log(`[OK] Done!`);
    console.log(`     Title: ${title}`);

    return;
  }

  // Extract article content
  console.log('[INFO] Extracting article content...');
  const article = extractArticle(html, finalUrl);
  console.log(`[INFO] Title: ${article.title}`);

  if (article.byline) {
    console.log(`[INFO] Author: ${article.byline}`);
  }

  if (article.siteName) {
    console.log(`[INFO] Site: ${article.siteName}`);
  }

  console.log(`[INFO] Content length: ${article.length} chars`);

  // Resolve output paths
  const { mdPath, jsonPath } = resolveOutputPaths(article.title, args.output);

  // Optionally save JSON
  if (args.json) {
    const jsonData = {
      url: parsedUrl.href,
      fetchedUrl: finalUrl,
      title: article.title,
      byline: article.byline,
      siteName: article.siteName,
      excerpt: article.excerpt,
      publishedTime: article.publishedTime,
      content: article.content,
    };

    fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');
    console.log(`[OK] JSON saved: ${path.basename(jsonPath)}`);
  }

  // Convert to Markdown and save
  console.log('[INFO] Converting to Markdown...');
  const markdown = convertToMarkdown(article, parsedUrl.href);
  fs.writeFileSync(mdPath, markdown, 'utf-8');
  console.log(`[OK] Markdown saved: ${path.basename(mdPath)}`);

  // Log summary
  console.log('');
  console.log(`[OK] Done!`);
  console.log(`     Title:  ${article.title}`);

  if (article.byline) {
    console.log(`     Author: ${article.byline}`);
  }

  if (article.siteName) {
    console.log(`     Site:   ${article.siteName}`);
  }
}

main();

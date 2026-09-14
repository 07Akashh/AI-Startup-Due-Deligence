import * as cheerio from 'cheerio';
import type { AnyNode, Element } from 'domhandler';

const BLOCK_SELECTORS = [
  'main',
  'article',
  '#content',
  '.content',
  '.main',
  '.documentation',
  '.docs',
  '.post-content',
  '.article-content',
  '.page-content',
];

const NOISE_SELECTORS = [
  'nav',
  'header',
  'footer',
  'aside',
  'noscript',
  'script',
  'style',
  'svg',
  'iframe',
  'form',
  'dialog',
  '[aria-hidden="true"]',
  '[hidden]',
];

export function buildCleanMarkdown($: cheerio.CheerioAPI): string {
  const working = cheerio.load($.html());
  working(`${NOISE_SELECTORS.join(',')}, [class*="cookie"], [id*="cookie"], [class*="newsletter"], [id*="newsletter"], [class*="modal"], [id*="modal"], [class*="popup"], [id*="popup"], [class*="ad"], [id*="ad"]`).remove();

  const root = pickRoot(working);
  const rootElement = root.get(0) ?? working('body').get(0);
  return normalizeMarkdown(renderElement(working, rootElement));
}

function pickRoot($: cheerio.CheerioAPI): cheerio.Cheerio<AnyNode> {
  for (const selector of BLOCK_SELECTORS) {
    const candidate = $(selector).first();
    if (candidate.length && candidate.text().replace(/\s+/g, ' ').trim().length > 120) {
      return candidate;
    }
  }
  return $('body').first();
}

function renderElement($: cheerio.CheerioAPI, node?: AnyNode | null): string {
  if (!node) return '';
  if (node.type === 'text') {
    return normalizeWhitespace('data' in node ? node.data ?? '' : '');
  }
  if (node.type !== 'tag') return '';

  const tag = (node as Element).name.toLowerCase();
  const current = $(node as Element);

  if (/^h[1-6]$/.test(tag)) {
    const level = Number(tag.slice(1));
    const text = collectInlineText($, node);
    return text ? `${'#'.repeat(level)} ${text}\n\n` : '';
  }

  if (tag === 'p') {
    const text = collectInlineText($, node);
    return text ? `${text}\n\n` : '';
  }

  if (tag === 'ul' || tag === 'ol') {
    const items = current.children('li').toArray().map((li, index) => {
      const text = collectInlineText($, li);
      if (!text) return '';
      const prefix = tag === 'ol' ? `${index + 1}. ` : '- ';
      return `${prefix}${text}`;
    }).filter(Boolean);
    return items.length ? `${items.join('\n')}\n\n` : '';
  }

  if (tag === 'blockquote') {
    const text = collectInlineText($, node);
    return text ? `> ${text.replace(/\n/g, '\n> ')}\n\n` : '';
  }

  if (tag === 'pre') {
    const code = current.find('code').first();
    const text = (code.length ? code.text() : current.text()).trim();
    return text ? `\`\`\`\n${text}\n\`\`\`\n\n` : '';
  }

  if (tag === 'table') {
    const rows = current.find('tr').toArray().map((row) => $(row).find('th,td').toArray().map((cell) => collectInlineText($, cell)));
    if (!rows.length) return '';
    const header = rows[0];
    const body = rows.slice(1);
    const divider = header.map(() => '---');
    const tableLines = [
      `| ${header.join(' | ')} |`,
      `| ${divider.join(' | ')} |`,
      ...body.map((cells) => `| ${cells.join(' | ')} |`),
    ];
    return `${tableLines.join('\n')}\n\n`;
  }

  return current.contents().toArray().map((child) => renderElement($, child)).join('');
}

function collectInlineText($: cheerio.CheerioAPI, node?: AnyNode | null): string {
  if (!node) return '';
  if (node.type === 'text') {
    return normalizeWhitespace('data' in node ? node.data ?? '' : '');
  }
  if (node.type !== 'tag') return '';

  const tag = (node as Element).name.toLowerCase();
  const current = $(node as Element);

  if (tag === 'a') {
    const text = normalizeWhitespace(current.text());
    const href = current.attr('href');
    return href && text ? `[${text}](${href})` : text;
  }

  if (tag === 'strong' || tag === 'b') {
    const text = normalizeWhitespace(current.text());
    return text ? `**${text}**` : '';
  }

  if (tag === 'em' || tag === 'i') {
    const text = normalizeWhitespace(current.text());
    return text ? `*${text}*` : '';
  }

  if (tag === 'code') {
    const text = normalizeWhitespace(current.text());
    return text ? `\`${text}\`` : '';
  }

  if (tag === 'br') return '\n';

  return current.contents().toArray().map((child) => collectInlineText($, child)).join(' ');
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n\s+/g, '\n').trim();
}

function normalizeMarkdown(text: string): string {
  return text
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^[ \t]+|[ \t]+$/gm, '')
    .trim();
}

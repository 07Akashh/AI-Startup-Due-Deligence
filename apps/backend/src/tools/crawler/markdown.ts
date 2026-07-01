import * as cheerio from 'cheerio';
import { normalizeWhitespace } from './utils';

const BLOCK_SELECTORS = [
  'main',
  'article',
  'section',
  '[role="main"]',
  '.content',
  '#content',
  '.post-content',
  '.page-content',
  '.entry-content',
  '.markdown-body',
];

const NOISE_SELECTORS = [
  'script',
  'style',
  'noscript',
  'svg',
  'iframe',
  'header',
  'footer',
  'nav',
  'aside',
  'form',
  'button',
  '[aria-hidden="true"]',
  '[hidden]',
];

export function buildCleanMarkdown($: cheerio.CheerioAPI): string {
  const loadOptions = { decodeEntities: false };
  const working = cheerio.load($.html(), loadOptions as any);
  working(`${NOISE_SELECTORS.join(',')}, [class*="cookie"], [id*="cookie"], [class*="newsletter"], [id*="newsletter"], [class*="modal"], [id*="modal"], [class*="popup"], [id*="popup"], [class*="ad"], [id*="ad"]`).remove();

  const root = pickRoot(working);
  return normalizeMarkdown(renderElement(working, root.get(0) ?? working('body').get(0)));
}

function pickRoot($: cheerio.CheerioAPI): cheerio.Cheerio<any> {
  for (const selector of BLOCK_SELECTORS) {
    const candidate = $(selector).first();
    if (candidate.length && candidate.text().replace(/\s+/g, ' ').trim().length > 120) {
      return candidate;
    }
  }
  return $('body').first();
}

function renderElement($: cheerio.CheerioAPI, node: any): string {
  if (!node) return '';
  if (node.type === 'text') return normalizeWhitespace(node.data ?? '');
  if (node.type !== 'tag') return '';

  const tag = node.name.toLowerCase();
  const current = $(node);

  if (/^h[1-6]$/.test(tag)) {
    const level = Number(tag.slice(1));
    const text = collectInlineText($, node);
    return text ? `${'#'.repeat(level)} ${text}\n\n` : '';
  }

  if (tag === 'p') {
    const text = collectInlineText($, node);
    return text ? `${text}\n\n` : '';
  }

  if (tag === 'blockquote') {
    const text = collectInlineText($, node);
    return text ? `${text.split(/\n+/).map((line) => `> ${line}`).join('\n')}\n\n` : '';
  }

  if (tag === 'pre') {
    const code = normalizeWhitespace(current.text());
    return code ? `\n\n\
\
\
\
${code}\n\n` : '';
  }

  if (tag === 'code') {
    const code = normalizeWhitespace(current.text());
    return code ? `\`${code}\`` : '';
  }

  if (tag === 'ul' || tag === 'ol') {
    const items = current
      .children('li')
      .toArray()
      .map((child, index) => `${tag === 'ol' ? `${index + 1}.` : '-'} ${collectInlineText($, child)}`)
      .filter(Boolean)
      .join('\n');
    return items ? `${items}\n\n` : '';
  }

  if (tag === 'table') {
    const rows = current.find('tr').toArray().map((row) => $(row).find('th,td').toArray().map((cell) => collectInlineText($, cell)));
    if (!rows.length) return '';
    const header = rows[0];
    const body = rows.slice(1);
    const headerLine = `| ${header.join(' | ')} |`;
    const separator = `| ${header.map(() => '---').join(' | ')} |`;
    const bodyLines = body.map((row) => `| ${row.join(' | ')} |`).join('\n');
    return `${headerLine}\n${separator}${bodyLines ? `\n${bodyLines}` : ''}\n\n`;
  }

  let output = '';
  current.contents().each((_, child) => {
    output += renderElement($, child);
  });
  return output;
}

function collectInlineText($: cheerio.CheerioAPI, node: any): string {
  return normalizeWhitespace(
    $(node)
      .clone()
      .find('script,style,noscript')
      .remove()
      .end()
      .text()
  );
}

function normalizeMarkdown(markdown: string): string {
  return markdown
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line, index, array) => !(line === '' && array[index - 1] === ''))
    .join('\n')
    .trim();
}

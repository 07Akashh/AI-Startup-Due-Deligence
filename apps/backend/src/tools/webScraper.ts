import axios from 'axios';
import * as cheerio from 'cheerio';

export interface WebsiteContent {
  url: string;
  title: string;
  description: string;
  markdownContent: string;
  extractedSections: {
    about?: string;
    product?: string;
    pricing?: string;
    team?: string;
    contact?: string;
  };
}

const MAX_CONTENT_LENGTH = 15000;

export async function scrapeWebsite(url: string): Promise<WebsiteContent> {
  // Ensure URL has protocol
  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;

  let html: string;
  try {
    const response = await axios.get(normalizedUrl, {
      timeout: 15000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; StartupAI-DueDiligence/1.0; research-bot)',
        Accept: 'text/html,application/xhtml+xml',
      },
      maxRedirects: 5,
    });
    html = response.data as string;
  } catch (err: any) {
    console.warn(`[webScraper] Failed to fetch ${url}: ${err.message}`);
    return emptyWebContent(url);
  }

  const $ = cheerio.load(html);

  // Remove noise
  $('script, style, nav, footer, header, iframe, noscript, svg, [aria-hidden="true"]').remove();

  const title = $('title').text().trim() || $('h1').first().text().trim() || '';
  const description =
    $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') ||
    '';

  // Extract main content text
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const truncated = bodyText.slice(0, MAX_CONTENT_LENGTH);

  // Section detection
  const fullHtml = $.html();
  const extractedSections = extractSections($, fullHtml);

  const markdownContent = htmlToMarkdown($);

  return {
    url: normalizedUrl,
    title,
    description,
    markdownContent: markdownContent.slice(0, MAX_CONTENT_LENGTH),
    extractedSections,
  };
}

function extractSections($: cheerio.CheerioAPI, _html: string) {
  const sections: WebsiteContent['extractedSections'] = {};

  const allText = $('body').text().toLowerCase();

  const sectionKeywords: Array<[keyof WebsiteContent['extractedSections'], string[]]> = [
    ['about', ['about us', 'our story', 'who we are', 'mission']],
    ['product', ['product', 'features', 'how it works', 'solution']],
    ['pricing', ['pricing', 'plans', 'subscription']],
    ['team', ['team', 'founders', 'leadership', 'our team']],
    ['contact', ['contact', 'get in touch', 'reach us']],
  ];

  for (const [key, keywords] of sectionKeywords) {
    for (const kw of keywords) {
      const idx = allText.indexOf(kw);
      if (idx !== -1) {
        sections[key] = allText.slice(idx, Math.min(idx + 1500, allText.length));
        break;
      }
    }
  }

  return sections;
}

function htmlToMarkdown($: cheerio.CheerioAPI): string {
  const lines: string[] = [];

  $('h1, h2, h3, h4, p, li').each((_, el) => {
    const tag = el.type === 'tag' ? el.name : '';
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (!text) return;

    if (tag === 'h1') lines.push(`# ${text}`);
    else if (tag === 'h2') lines.push(`## ${text}`);
    else if (tag === 'h3') lines.push(`### ${text}`);
    else if (tag === 'h4') lines.push(`#### ${text}`);
    else if (tag === 'li') lines.push(`- ${text}`);
    else lines.push(text);
  });

  return lines.join('\n');
}

function emptyWebContent(url: string): WebsiteContent {
  return {
    url,
    title: '',
    description: '',
    markdownContent: '',
    extractedSections: {},
  };
}

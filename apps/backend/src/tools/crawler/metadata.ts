import * as cheerio from 'cheerio';
import { ContactDetails, PageMetadata, SocialLinks } from './types';
import { normalizeWhitespace, uniqueStrings } from './utils';

export function extractMetadata($: cheerio.CheerioAPI): PageMetadata {
  const meta = (selector: string) => normalizeWhitespace($(selector).attr('content') ?? '');
  const attr = (selector: string, attribute: string) => normalizeWhitespace($(selector).attr(attribute) ?? '');

  const openGraph: Record<string, string | string[]> = {};
  $('meta[property^="og:"]').each((_, el) => {
    const property = normalizeWhitespace($(el).attr('property') ?? '');
    const content = normalizeWhitespace($(el).attr('content') ?? '');
    if (!property || !content) return;
    if (!openGraph[property]) {
      openGraph[property] = content;
      return;
    }
    openGraph[property] = Array.isArray(openGraph[property])
      ? [...(openGraph[property] as string[]), content]
      : [openGraph[property] as string, content];
  });

  const twitter: Record<string, string> = {};
  $('meta[name^="twitter:"]').each((_, el) => {
    const name = normalizeWhitespace($(el).attr('name') ?? '');
    const content = normalizeWhitespace($(el).attr('content') ?? '');
    if (name && content) twitter[name] = content;
  });

  const images = uniqueStrings($('img').map((_, el) => String($(el).attr('src') ?? $(el).attr('data-src') ?? $(el).attr('srcset') ?? '')).get());

  const logos = uniqueStrings(
    $('img')
      .map((_, el) => {
        const source = String($(el).attr('src') ?? $(el).attr('data-src') ?? $(el).attr('srcset') ?? '');
        const alt = String($(el).attr('alt') ?? '').toLowerCase();
        const className = String($(el).attr('class') ?? '').toLowerCase();
        const id = String($(el).attr('id') ?? '').toLowerCase();
        return alt.includes('logo') || className.includes('logo') || id.includes('logo') ? source : '';
      })
      .get()
  );

  const favicons = uniqueStrings(
    $('link[rel*="icon"], link[rel="apple-touch-icon"], link[rel="mask-icon"]')
        .map((_, el) => String($(el).attr('href') ?? ''))
      .get()
  );

      const videos = uniqueStrings($('video, iframe[src*="youtube"], iframe[src*="vimeo"], source').map((_, el) => String($(el).attr('src') ?? '')).get());

  return {
    title: normalizeWhitespace(meta('meta[property="og:title"]') || $('title').first().text() || $('h1').first().text()),
    description: normalizeWhitespace(meta('meta[name="description"]') || meta('meta[property="og:description"]')),
    keywords: uniqueStrings(meta('meta[name="keywords"]').split(',')),
    canonicalUrl: attr('link[rel="canonical"]', 'href') || undefined,
    language: attr('html', 'lang') || undefined,
    openGraph,
    twitter,
    favicons,
    logos,
    images,
    videos,
    emails: uniqueStrings(extractEmailCandidates($)),
    phones: uniqueStrings(extractPhoneCandidates($)),
    addresses: uniqueStrings(extractAddressCandidates($)),
    authors: uniqueStrings(
      [meta('meta[name="author"]'), meta('meta[property="article:author"]'), meta('meta[name="parsely-author"]')].filter(Boolean)
    ),
    generator: meta('meta[name="generator"]') || undefined,
  };
}

export function extractContacts($: cheerio.CheerioAPI): ContactDetails {
  return {
    emails: uniqueStrings(extractEmailCandidates($)),
    phones: uniqueStrings(extractPhoneCandidates($)),
    addresses: uniqueStrings(extractAddressCandidates($)),
    supportPages: uniqueStrings(
      $('a[href]')
        .map((_, el) => String($(el).attr('href') ?? ''))
        .get()
        .filter((href) => /contact|support|help|sales/i.test(href))
    ),
  };
}

export function extractSocialLinks($: cheerio.CheerioAPI): SocialLinks {
  const hrefs = $('a[href]').map((_, el) => String($(el).attr('href') ?? '')).get();
  const filter = (pattern: RegExp) => uniqueStrings(hrefs.filter((href) => pattern.test(href)));

  return {
    website: filter(/^https?:\/\//i),
    linkedin: filter(/linkedin\.com/i),
    x: filter(/(?:x\.com|twitter\.com)/i),
    twitter: filter(/twitter\.com/i),
    github: filter(/github\.com/i),
    youtube: filter(/youtube\.com|youtu\.be/i),
    facebook: filter(/facebook\.com/i),
    instagram: filter(/instagram\.com/i),
    tiktok: filter(/tiktok\.com/i),
    discord: filter(/discord\.gg|discord\.com/i),
  };
}

function extractEmailCandidates($: cheerio.CheerioAPI): string[] {
  return $('body').text().match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
}

function extractPhoneCandidates($: cheerio.CheerioAPI): string[] {
  return $('body').text().match(/(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,4}\d{2,4}/g) ?? [];
}

function extractAddressCandidates($: cheerio.CheerioAPI): string[] {
  const addresses: string[] = [];
  $('address').each((_, el) => {
    const text = normalizeWhitespace($(el).text());
    if (text) addresses.push(text);
  });
  return addresses;
}

import * as cheerio from 'cheerio';
import { RobotsRules } from './types';
import { looksLikeInternalHost, normalizeWhitespace, stripTrackingParams } from './utils';

const IMPORTANT_PATH_KEYWORDS = [
  '/about',
  '/about-us',
  '/company',
  '/product',
  '/products',
  '/platform',
  '/features',
  '/pricing',
  '/plans',
  '/enterprise',
  '/customers',
  '/case-studies',
  '/blog',
  '/docs',
  '/documentation',
  '/api',
  '/resources',
  '/integrations',
  '/security',
  '/privacy',
  '/contact',
  '/team',
  '/careers',
  '/faq',
  '/news',
  '/press',
  '/partners',
  '/investors',
];

const BLOCKED_PATH_KEYWORDS = ['/login', '/signup', '/dashboard', '/account', '/cart', '/checkout', '/admin'];

export function normalizeCrawlUrl(input: string, pageUrl: string): string | null {
  try {
    const url = new URL(input, pageUrl);
    stripTrackingParams(url);
    url.hash = '';
    url.username = '';
    url.password = '';
    url.hostname = url.hostname.toLowerCase();
    if (url.pathname.length > 1) {
      url.pathname = url.pathname.replace(/\/+$/, '');
    }
    if (url.protocol === 'http:' && url.port === '80') url.port = '';
    if (url.protocol === 'https:' && url.port === '443') url.port = '';
    return url.toString();
  } catch {
    return null;
  }
}

export function isInternalUrl(candidateUrl: string, rootUrl: URL): boolean {
  try {
    const candidate = new URL(candidateUrl);
    return looksLikeInternalHost(candidate.hostname, rootUrl.hostname);
  } catch {
    return false;
  }
}

export function discoverPriorityPaths(rootUrl: URL): Array<{ url: string; priority: number }> {
  return IMPORTANT_PATH_KEYWORDS.map((path, index) => ({ url: new URL(path, rootUrl).toString(), priority: index * 10 }));
}

export function discoverInternalLinks(
  $: cheerio.CheerioAPI,
  pageUrl: string,
  rootUrl: URL,
  robotsRules?: RobotsRules
): Array<{ url: string; priority: number }> {
  const links = new Map<string, number>();

  $('a[href]').each((_, el) => {
    const href = normalizeWhitespace($(el).attr('href') ?? '');
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;
    const normalized = normalizeCrawlUrl(href, pageUrl);
    if (!normalized) return;

    const candidate = new URL(normalized);
    if (!looksLikeInternalHost(candidate.hostname, rootUrl.hostname)) return;
    if (isBlockedPath(candidate.pathname)) return;
    if (robotsRules && !isAllowedByRobots(candidate.pathname, robotsRules)) return;

    const score = scoreUrl(normalized, $(el).text());
    const current = links.get(normalized);
    if (current === undefined || score < current) links.set(normalized, score);
  });

  return [...links.entries()].map(([url, priority]) => ({ url, priority }));
}

export function isBlockedPath(pathname: string): boolean {
  const lower = pathname.toLowerCase();
  return BLOCKED_PATH_KEYWORDS.some((blocked) => lower.includes(blocked));
}

export function isAllowedByRobots(pathname: string, robotsRules: RobotsRules): boolean {
  const path = pathname.toLowerCase();
  const longestAllow = robotsRules.allowed.reduce((best, rule) => (path.startsWith(rule) && rule.length > best.length ? rule : best), '');
  const longestDisallow = robotsRules.disallowed.reduce((best, rule) => (path.startsWith(rule) && rule.length > best.length ? rule : best), '');
  if (!longestDisallow) return true;
  return longestAllow.length >= longestDisallow.length;
}

export function parseRobotsTxt(text: string, sitemapOrigin: string): RobotsRules {
  const allowed: string[] = [];
  const disallowed: string[] = [];
  const sitemaps: string[] = [];
  let crawlDelaySeconds: number | undefined;
  let active = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.split('#')[0].trim();
    if (!line) continue;

    const [directiveRaw, ...rest] = line.split(':');
    const directive = directiveRaw.trim().toLowerCase();
    const value = rest.join(':').trim();

    if (directive === 'user-agent') {
      const ua = value.toLowerCase();
      active = ua === '*' || ua.includes('startupai');
      continue;
    }

    if (directive === 'sitemap') {
      try {
        sitemaps.push(new URL(value, sitemapOrigin).toString());
      } catch {
        continue;
      }
      continue;
    }

    if (!active) continue;

    if (directive === 'allow') allowed.push(normalizeRobotsPath(value));
    if (directive === 'disallow') disallowed.push(normalizeRobotsPath(value));
    if (directive === 'crawl-delay') {
      const parsed = Number.parseFloat(value);
      if (!Number.isNaN(parsed)) crawlDelaySeconds = parsed;
    }
  }

  return {
    allowed: unique(allowed),
    disallowed: unique(disallowed),
    crawlDelaySeconds,
    sitemaps: unique(sitemaps),
  };
}

export function parseSitemapXml(xml: string): { sitemapUrls: string[]; urlUrls: string[] } {
  const loadOptions = { xmlMode: true };
  const $ = cheerio.load(xml, loadOptions as any);
  const sitemapUrls = $('sitemap > loc').map((_, el) => normalizeWhitespace($(el).text())).get().filter(Boolean);
  const urlUrls = $('url > loc').map((_, el) => normalizeWhitespace($(el).text())).get().filter(Boolean);
  return { sitemapUrls: unique(sitemapUrls), urlUrls: unique(urlUrls) };
}

export function scoreUrl(url: string, anchorText: string): number {
  const combined = `${url} ${anchorText}`.toLowerCase();
  let score = 100;
  for (let index = 0; index < IMPORTANT_PATH_KEYWORDS.length; index += 1) {
    if (combined.includes(IMPORTANT_PATH_KEYWORDS[index])) score = Math.min(score, index * 10);
  }
  if (/about|product|pricing|feature|company|contact|security|faq|blog|team|docs/.test(combined)) score -= 5;
  return Math.max(score, 0);
}

function normalizeRobotsPath(value: string): string {
  const cleaned = value.trim();
  if (!cleaned || cleaned === '/') return '/';
  return cleaned.startsWith('/') ? cleaned.toLowerCase() : `/${cleaned.toLowerCase()}`;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

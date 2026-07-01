import * as cheerio from 'cheerio';
import { gunzipSync } from 'node:zlib';
import { CrawlOptions, WebsiteContent, RobotsRules } from './types';
import { fetchPage } from './fetcher';
import { discoverInternalLinks, discoverPriorityPaths, isAllowedByRobots, isBlockedPath, isInternalUrl, normalizeCrawlUrl, parseRobotsTxt, parseSitemapXml, scoreUrl } from './discovery';
import { extractPage, PageExtractionResult } from './extractor';
import { DeduplicationIndex } from './deduplication';
import { ensureHttpProtocol, safeUrl, sleep, uniqueStrings } from './utils';

const DEFAULT_USER_AGENT = 'Mozilla/5.0 (compatible; StartupAI-DueDiligence/2.0; crawler)';

export const defaultCrawlOptions: CrawlOptions = {
  concurrency: 6,
  maxPages: 24,
  maxDepth: 2,
  timeoutMs: 15000,
  retries: 2,
  backoffMs: 750,
  respectRobotsTxt: true,
  userAgent: DEFAULT_USER_AGENT,
  sameHostOnly: true,
  preferSitemaps: true,
};

interface QueueItem {
  url: string;
  depth: number;
  priority: number;
}

export async function scrapeWebsite(url: string, options: Partial<CrawlOptions> = {}): Promise<WebsiteContent> {
  return crawlWebsite(url, options);
}

export async function crawlWebsite(url: string, options: Partial<CrawlOptions> = {}): Promise<WebsiteContent> {
  const crawlOptions = { ...defaultCrawlOptions, ...options };
  const startedAt = Date.now();
  const normalizedStartUrl = ensureHttpProtocol(url.trim());
  const rootUrl = safeUrl(normalizedStartUrl);

  if (!rootUrl) {
    return emptyWebsiteContent(url, normalizedStartUrl, Date.now() - startedAt, 'Invalid URL');
  }

  const dedupe = new DeduplicationIndex();
  const queue: QueueItem[] = [];
  const pages: PageExtractionResult[] = [];
  const blockedUrls: string[] = [];
  const failedUrls: Array<{ url: string; reason: string }> = [];
  const discoveredUrls = new Set<string>();
  const sitemapUrls = new Set<string>();

  let robotsRules: RobotsRules | undefined;
  let robotsTxtUrl: string | undefined;
  let crawlDelaySeconds: number | undefined;
  let finalUrl: string | undefined;

  try {
    if (crawlOptions.respectRobotsTxt) {
      robotsTxtUrl = new URL('/robots.txt', rootUrl).toString();
      try {
        const robotsResponse = await fetchPage(robotsTxtUrl, crawlOptions);
        robotsRules = parseRobotsTxt(robotsResponse.body, rootUrl.origin);
        crawlDelaySeconds = robotsRules.crawlDelaySeconds;
        robotsRules.sitemaps.forEach((sitemap) => sitemapUrls.add(sitemap));
      } catch {
        robotsRules = { allowed: [], disallowed: [], sitemaps: [] };
      }
    }

    discoverPriorityPaths(rootUrl).forEach((entry) => {
      const normalized = normalizeCrawlUrl(entry.url, rootUrl.toString());
      if (normalized) enqueue(queue, discoveredUrls, dedupe, normalized, 0, entry.priority);
    });

    enqueue(queue, discoveredUrls, dedupe, rootUrl.toString(), 0, 0);

    if (crawlOptions.preferSitemaps) {
      for (const sitemapUrl of await discoverSitemaps(rootUrl, robotsRules)) {
        sitemapUrls.add(sitemapUrl);
        try {
          const sitemapResponse = await fetchPage(sitemapUrl, crawlOptions);
          const xml = decodeSitemapBody(sitemapResponse);
          const sitemap = parseSitemapXml(xml);
          sitemap.sitemapUrls.forEach((nested) => sitemapUrls.add(nested));
          sitemap.urlUrls.forEach((candidate) => {
            const normalized = normalizeCrawlUrl(candidate, rootUrl.toString());
            if (normalized) enqueue(queue, discoveredUrls, dedupe, normalized, 0, scoreUrl(normalized, ''));
          });
        } catch (error) {
          failedUrls.push({ url: sitemapUrl, reason: error instanceof Error ? error.message : 'Failed to fetch sitemap' });
        }
      }
    }

    while (queue.length > 0 && pages.length < crawlOptions.maxPages) {
      const batch = queue.splice(0, crawlOptions.concurrency);
      const settled = await Promise.allSettled(
        batch.map(async (item) => {
          if (item.depth > crawlOptions.maxDepth) return undefined;
          if (crawlOptions.sameHostOnly && !isInternalUrl(item.url, rootUrl)) return undefined;

          const currentPath = new URL(item.url).pathname;
          if (isBlockedPath(currentPath)) {
            blockedUrls.push(item.url);
            return undefined;
          }

          if (robotsRules && crawlOptions.respectRobotsTxt && !isAllowedByRobots(currentPath, robotsRules)) {
            blockedUrls.push(item.url);
            return undefined;
          }

          if (crawlDelaySeconds && crawlDelaySeconds > 0) {
            await sleep(Math.ceil(crawlDelaySeconds * 1000));
          }

          const response = await fetchPage(item.url, crawlOptions);
          finalUrl = finalUrl ?? response.finalUrl;

          if (!response.contentType.includes('text/html') && !response.contentType.includes('application/xhtml+xml')) {
            return undefined;
          }

          const $ = cheerio.load(response.body);
          const extraction = extractPage($, item.url, response.finalUrl, response.headers, item.depth);
          pages.push(extraction);

          if (item.depth < crawlOptions.maxDepth) {
            const links = discoverInternalLinks($, response.finalUrl, rootUrl, robotsRules).map((entry) => ({
              url: entry.url,
              depth: item.depth + 1,
              priority: entry.priority + item.depth + 1,
            }));

            for (const link of links) {
              if (pages.length + queue.length >= crawlOptions.maxPages) break;
              if (isBlockedPath(new URL(link.url).pathname)) {
                blockedUrls.push(link.url);
                continue;
              }
              enqueue(queue, discoveredUrls, dedupe, link.url, link.depth, link.priority);
            }
          }

          return extraction;
        })
      );

      for (const item of settled) {
        if (item.status === 'rejected') {
          failedUrls.push({ url: rootUrl.toString(), reason: item.reason instanceof Error ? item.reason.message : String(item.reason) });
        }
      }
    }
  } catch (error) {
    failedUrls.push({ url: rootUrl.toString(), reason: error instanceof Error ? error.message : 'Unexpected crawl failure' });
  }

  return assembleWebsiteContent({
    startUrl: url,
    normalizedStartUrl,
    finalUrl,
    pages,
    blockedUrls,
    failedUrls,
    robotsTxtUrl,
    crawlDelaySeconds,
    durationMs: Date.now() - startedAt,
    sitemapUrls: [...sitemapUrls],
    discoveredCount: discoveredUrls.size,
  });
}

function enqueue(
  queue: QueueItem[],
  discoveredUrls: Set<string>,
  dedupe: DeduplicationIndex,
  url: string,
  depth: number,
  priority: number
): void {
  if (dedupe.hasUrl(url) || discoveredUrls.has(url)) return;
  dedupe.addUrl(url);
  discoveredUrls.add(url);
  queue.push({ url, depth, priority });
  queue.sort((a, b) => a.priority - b.priority);
}

async function discoverSitemaps(rootUrl: URL, robotsRules?: RobotsRules): Promise<string[]> {
  const candidateUrls = [
    new URL('/sitemap.xml', rootUrl).toString(),
    new URL('/sitemap_index.xml', rootUrl).toString(),
    new URL('/sitemap-index.xml', rootUrl).toString(),
  ];
  return uniqueStrings([...(robotsRules?.sitemaps ?? []), ...candidateUrls]);
}

function decodeSitemapBody(response: { body: string; rawBody: Buffer; finalUrl: string }): string {
  if (/\.gz$/i.test(response.finalUrl)) {
    try {
      return gunzipSync(response.rawBody).toString('utf8');
    } catch {
      return response.body;
    }
  }
  return response.body;
}

function assembleWebsiteContent(input: {
  startUrl: string;
  normalizedStartUrl: string;
  finalUrl?: string;
  pages: PageExtractionResult[];
  blockedUrls: string[];
  failedUrls: Array<{ url: string; reason: string }>;
  robotsTxtUrl?: string;
  crawlDelaySeconds?: number;
  durationMs: number;
  sitemapUrls: string[];
  discoveredCount: number;
}): WebsiteContent {
  const firstPage = input.pages[0];
  const metadata = firstPage?.metadata ?? emptyMetadata();
  const company = mergeCompanyProfiles(input.pages.map((page) => page.companySignals));
  const products = mergeByName(input.pages.flatMap((page) => page.products));
  const pricing = mergePricing(input.pages.flatMap((page) => page.pricing));
  const features = mergeByName(input.pages.flatMap((page) => page.features));
  const technologies = mergeByName(input.pages.flatMap((page) => page.technologies));
  const integrations = mergeByName(input.pages.flatMap((page) => page.integrations));
  const faqs = mergeFaqs(input.pages.flatMap((page) => page.faqs));
  const blogs = mergeBlogs(input.pages.flatMap((page) => page.blogs));
  const team = mergeByName(input.pages.flatMap((page) => page.team));
  const contacts = firstPage?.contacts ?? emptyContacts();
  const socialLinks = firstPage?.socialLinks ?? emptySocialLinks();
  const jsonLd = mergeJsonLd(input.pages.flatMap((page) => page.jsonLd));
  const markdownContent = input.pages.map((page) => `# ${page.page.title || page.page.url}\n\n${page.page.markdown}`).join('\n\n---\n\n');

  return {
    url: input.startUrl,
    normalizedUrl: input.normalizedStartUrl,
    finalUrl: input.finalUrl,
    title: metadata.title || firstPage?.page.title || '',
    description: metadata.description || firstPage?.page.description || '',
    markdownContent: markdownContent.slice(0, 80000),
    metadata,
    company,
    products,
    pricing,
    features,
    technologies,
    integrations,
    faqs,
    blogs,
    team,
    contacts,
    socialLinks,
    jsonLd,
    pages: input.pages.map((page) => page.page),
    crawl: {
      startUrl: input.startUrl,
      normalizedStartUrl: input.normalizedStartUrl,
      finalUrl: input.finalUrl,
      totalDiscovered: input.discoveredCount,
      totalCrawled: input.pages.length,
      totalBlocked: input.blockedUrls.length,
      totalFailed: input.failedUrls.length,
      sitemapUrls: input.sitemapUrls,
      blockedUrls: uniqueStrings(input.blockedUrls),
      failedUrls: input.failedUrls,
      robotsTxtUrl: input.robotsTxtUrl,
      crawlDelaySeconds: input.crawlDelaySeconds,
      durationMs: input.durationMs,
    },
    extractedSections: firstPage?.extractedSections ?? {},
  };
}

function emptyWebsiteContent(url: string, normalizedStartUrl: string, durationMs: number, reason?: string): WebsiteContent {
  return {
    url,
    normalizedUrl: normalizedStartUrl,
    title: '',
    description: '',
    markdownContent: '',
    metadata: emptyMetadata(),
    company: {},
    products: [],
    pricing: [],
    features: [],
    technologies: [],
    integrations: [],
    faqs: [],
    blogs: [],
    team: [],
    contacts: emptyContacts(),
    socialLinks: emptySocialLinks(),
    jsonLd: [],
    pages: [],
    crawl: {
      startUrl: url,
      normalizedStartUrl,
      totalDiscovered: 0,
      totalCrawled: 0,
      totalBlocked: 0,
      totalFailed: reason ? 1 : 0,
      sitemapUrls: [],
      blockedUrls: [],
      failedUrls: reason ? [{ url, reason }] : [],
      durationMs,
    },
    extractedSections: {},
  };
}

function mergeCompanyProfiles(items: PageExtractionResult['companySignals'][]): PageExtractionResult['companySignals'] {
  const merged: PageExtractionResult['companySignals'] = {};
  for (const item of items) {
    for (const [key, value] of Object.entries(item)) {
      if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) continue;
      const current = merged[key as keyof typeof merged];
      if (current === undefined || current === null || (Array.isArray(current) && current.length === 0)) {
        (merged as Record<string, unknown>)[key] = value;
      }
    }
  }
  return merged;
}

function mergeByName<T extends { name: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mergePricing(items: PageExtractionResult['pricing']): PageExtractionResult['pricing'] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.name}|${item.price}|${item.billingPeriod}|${item.enterprise}|${item.freeTier}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mergeFaqs(items: PageExtractionResult['faqs']): PageExtractionResult['faqs'] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.question}|${item.answer}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mergeBlogs(items: PageExtractionResult['blogs']): PageExtractionResult['blogs'] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.title}|${item.url ?? ''}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mergeJsonLd(items: PageExtractionResult['jsonLd']): PageExtractionResult['jsonLd'] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.sourceUrl}|${item.id ?? ''}|${item.types.join(',')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function emptyMetadata() {
  return {
    title: '',
    description: '',
    keywords: [],
    openGraph: {},
    twitter: {},
    favicons: [],
    logos: [],
    images: [],
    videos: [],
    emails: [],
    phones: [],
    addresses: [],
    authors: [],
  };
}

function emptyContacts() {
  return { emails: [], phones: [], addresses: [], supportPages: [] };
}

function emptySocialLinks() {
  return { website: [], linkedin: [], x: [], twitter: [], github: [], youtube: [], facebook: [], instagram: [], tiktok: [], discord: [] };
}

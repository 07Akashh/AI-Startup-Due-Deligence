import * as cheerio from 'cheerio';
import { buildCleanMarkdown } from './markdown';
import { extractContacts, extractMetadata, extractSocialLinks } from './metadata';
import { extractJsonLd } from './schema';
import { detectTechnologies } from './technology';
import { extractFaqs } from './faq';
import { extractPricing } from './pricing';
import {
  BlogPost,
  CompanyProfile,
  ContactDetails,
  CrawledPage,
  FaqItem,
  FeatureProfile,
  IntegrationProfile,
  JsonLdEntry,
  PageMetadata,
  PricingPlan,
  ProductProfile,
  SocialLinks,
  TechnologySignal,
  TeamMember,
} from './types';
import { hashText, normalizeWhitespace, uniqueStrings } from './utils';

export interface PageExtractionResult {
  page: CrawledPage;
  companySignals: CompanyProfile;
  products: ProductProfile[];
  pricing: PricingPlan[];
  features: FeatureProfile[];
  integrations: IntegrationProfile[];
  faqs: FaqItem[];
  blogs: BlogPost[];
  team: TeamMember[];
  metadata: PageMetadata;
  contacts: ContactDetails;
  socialLinks: SocialLinks;
  jsonLd: JsonLdEntry[];
  technologies: TechnologySignal[];
  extractedSections: Record<string, string>;
}

export function extractPage(
  $: cheerio.CheerioAPI,
  pageUrl: string,
  finalUrl: string,
  headers: Record<string, string>,
  depth: number
): PageExtractionResult {
  const metadata = extractMetadata($);
  const contacts = extractContacts($);
  const socialLinks = extractSocialLinks($);
  const jsonLd = extractJsonLd($, finalUrl);
  const technologies = detectTechnologies($, headers, $.html());
  const markdown = buildCleanMarkdown($);
  const pageType = inferPageType(pageUrl, metadata, jsonLd);
  const extractedSections = extractSections(markdown);

  const page: CrawledPage = {
    url: pageUrl,
    finalUrl,
    title: metadata.title,
    description: metadata.description,
    canonicalUrl: metadata.canonicalUrl,
    depth,
    pageType,
    wordCount: markdown.split(/\s+/).filter(Boolean).length,
    markdown,
    textHash: hashText(normalizeWhitespace(markdown).toLowerCase()),
    metadata,
    jsonLd,
    technologies,
  };

  return {
    page,
    companySignals: inferCompany(metadata, markdown, jsonLd),
    products: inferProducts(markdown, pageType, pageUrl),
    pricing: extractPricing(markdown, pageUrl),
    features: inferFeatures(markdown, pageUrl),
    integrations: inferIntegrations(markdown, pageUrl),
    faqs: extractFaqs(markdown, pageUrl),
    blogs: pageType === 'blog' ? inferBlogs(markdown, metadata, pageUrl) : [],
    team: pageType === 'team' ? inferTeam(markdown, pageUrl) : [],
    metadata,
    contacts,
    socialLinks,
    jsonLd,
    technologies,
    extractedSections,
  };
}

export function inferPageType(pageUrl: string, metadata: PageMetadata, jsonLd: JsonLdEntry[]): string {
  const combined = `${pageUrl} ${metadata.title} ${metadata.description} ${jsonLd.map((entry) => entry.types.join(' ')).join(' ')}`.toLowerCase();
  if (/pricing|plan/.test(combined)) return 'pricing';
  if (/faq|questions/.test(combined)) return 'faq';
  if (/blog|article|news/.test(combined)) return 'blog';
  if (/team|founder|leadership/.test(combined)) return 'team';
  if (/security|privacy|trust/.test(combined)) return 'security';
  if (/contact|support|sales/.test(combined)) return 'contact';
  if (/about|mission|vision/.test(combined)) return 'about';
  return 'content';
}

function inferCompany(metadata: PageMetadata, markdown: string, jsonLd: JsonLdEntry[]): CompanyProfile {
  const lower = markdown.toLowerCase();
  const organization = jsonLd.find((entry) => entry.types.some((type) => /organization|corporation|company/i.test(type)))?.raw as
    | Record<string, unknown>
    | undefined;

  return {
    name: (organization?.name as string | undefined) || metadata.title.split('|')[0]?.trim() || undefined,
    mission: pickSnippet(lower, ['mission', 'purpose']),
    vision: pickSnippet(lower, ['vision', 'future']),
    about: pickSnippet(lower, ['about us', 'about', 'who we are']),
    problem: pickSnippet(lower, ['problem', 'pain point', 'challenge']),
    solution: pickSnippet(lower, ['solution', 'platform', 'product']),
    targetAudience: pickValues(lower, ['for teams', 'for developers', 'for enterprise', 'for startups']),
    industry: pickSnippet(lower, ['industry', 'vertical', 'category']),
    category: pickSnippet(lower, ['category', 'software', 'platform']),
    businessModel: pickValues(lower, ['subscription', 'saas', 'usage-based', 'enterprise', 'freemium']),
    founded: typeof organization?.foundingDate === 'string' ? String(organization.foundingDate) : undefined,
    founders: findPeople(lower, ['founder', 'co-founder', 'cofounder']),
    leadership: findPeople(lower, ['ceo', 'cto', 'cpo', 'vp', 'head of']),
    investors: pickValues(lower, ['investors', 'backed by', 'funded by']),
    funding: pickValues(lower, ['seed', 'series a', 'series b', 'series c', 'funding']),
    partners: pickValues(lower, ['partner', 'partners', 'alliance']),
    customers: pickValues(lower, ['customers', 'used by', 'trusted by']),
    testimonials: pickValues(lower, ['testimonial', 'customer story', 'success story']),
    awards: pickValues(lower, ['award', 'winner', 'recognized', 'featured']),
    compliance: pickValues(lower, ['soc 2', 'hipaa', 'gdpr', 'iso 27001', 'compliance']),
    security: pickValues(lower, ['security', 'privacy', 'encryption', 'trust center']),
  };
}

function inferProducts(markdown: string, pageType: string, pageUrl: string): ProductProfile[] {
  const lower = markdown.toLowerCase();
  const names = ['platform', 'api', 'dashboard', 'suite', 'engine', 'workspace'].filter((name) => lower.includes(name));
  if (!names.length && pageType === 'content') return [];

  return names.slice(0, 4).map((name) => ({
    name: capitalize(name),
    summary: pickSnippet(lower, [name]),
    features: inferFeatures(markdown, pageUrl).map((feature) => feature.name),
    capabilities: pickValues(lower, ['automate', 'collaborate', 'analyze', 'integrate', 'scale']),
    useCases: pickValues(lower, ['use case', 'for teams', 'for developers', 'for enterprise']),
    supportedPlatforms: pickValues(lower, ['web', 'ios', 'android', 'desktop', 'browser']),
    integrations: pickValues(lower, ['slack', 'salesforce', 'hubspot', 'stripe', 'zapier']),
    apis: pickValues(lower, ['api', 'rest api', 'graphql']),
    sdks: pickValues(lower, ['sdk', 'python', 'javascript', 'typescript', 'mobile sdk']),
  }));
}

function inferFeatures(markdown: string, sourcePage: string): FeatureProfile[] {
  return uniqueStrings(
    markdown
      .split(/\n+/)
      .map((line) => normalizeWhitespace(line))
      .filter((line) => /feature|capability|works|support|automation|security|integration|analytics|dashboard/i.test(line))
      .slice(0, 30)
  ).map((name) => ({ name, sourcePage }));
}

function inferIntegrations(markdown: string, sourcePage: string): IntegrationProfile[] {
  const lower = markdown.toLowerCase();
  return ['slack', 'salesforce', 'hubspot', 'stripe', 'zapier', 'google analytics', 'segment', 'mixpanel', 'aws', 'vercel']
    .filter((integration) => lower.includes(integration))
    .map((name) => ({ name: capitalize(name), category: 'integration', sourcePage }));
}

function inferBlogs(markdown: string, metadata: PageMetadata, pageUrl: string): BlogPost[] {
  const title = metadata.title || markdown.split(/\n+/).find(Boolean) || 'Blog Post';
  return [
    {
      title,
      author: metadata.authors[0],
      date: undefined,
      summary: markdown.slice(0, 240),
      tags: pickValues(markdown.toLowerCase(), ['ai', 'security', 'product', 'engineering', 'startup']),
      categories: ['blog'],
      url: pageUrl,
    },
  ];
}

function inferTeam(markdown: string, pageUrl: string): TeamMember[] {
  const lines = markdown.split(/\n+/).map((line) => normalizeWhitespace(line)).filter(Boolean);
  return lines
    .filter((line) => /founder|co-founder|ceo|cto|cpo|vp|head of|lead/i.test(line))
    .slice(0, 10)
    .map((line) => ({
      name: line.split(/[,-]/)[0].trim(),
      role: line,
      bio: line,
      url: pageUrl,
    }));
}

function extractSections(markdown: string): Record<string, string> {
  const lower = markdown.toLowerCase();
  const sections: Record<string, string> = {};
  for (const [key, words] of [
    ['about', ['about', 'mission', 'vision']],
    ['product', ['product', 'solution', 'feature']],
    ['pricing', ['pricing', 'plan']],
    ['team', ['team', 'founder', 'leadership']],
    ['contact', ['contact', 'support', 'sales']],
    ['faq', ['faq', 'questions']],
    ['blog', ['blog', 'news', 'article']],
    ['security', ['security', 'privacy', 'trust']],
    ['integrations', ['integration', 'api', 'sdk']],
    ['investors', ['investor', 'funding', 'partners']],
  ] as Array<[string, string[]]>) {
    for (const word of words) {
      const index = lower.indexOf(word);
      if (index >= 0) {
        sections[key] = markdown.slice(index, Math.min(index + 2500, markdown.length)).trim();
        break;
      }
    }
  }
  return sections;
}

function pickSnippet(text: string, patterns: string[]): string | undefined {
  for (const pattern of patterns) {
    const index = text.indexOf(pattern.toLowerCase());
    if (index >= 0) return text.slice(index, Math.min(index + 220, text.length)).trim();
  }
  return undefined;
}

function pickValues(text: string, patterns: string[]): string[] {
  return patterns.filter((pattern) => text.includes(pattern.toLowerCase())).map(capitalize).slice(0, 10);
}

function findPeople(text: string, labels: string[]): string[] {
  const matches: string[] = [];
  for (const label of labels) {
    const regex = new RegExp(`${label}[:\\-\\s]+([A-Z][a-z]+(?:\\s[A-Z][a-z]+){0,3})`, 'gi');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text))) {
      matches.push(match[1]);
    }
  }
  return uniqueStrings(matches);
}

function capitalize(value: string): string {
  return value
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export interface CrawlOptions {
  concurrency: number;
  maxPages: number;
  maxDepth: number;
  timeoutMs: number;
  retries: number;
  backoffMs: number;
  respectRobotsTxt: boolean;
  userAgent: string;
  sameHostOnly: boolean;
  preferSitemaps: boolean;
}

export interface RobotsRules {
  allowed: string[];
  disallowed: string[];
  crawlDelaySeconds?: number;
  sitemaps: string[];
}

export interface FetchResult {
  url: string;
  finalUrl: string;
  status?: number;
  headers: Record<string, string>;
  contentType: string;
  body: string;
  rawBody: Buffer;
  redirected: boolean;
}

export interface PageMetadata {
  title: string;
  description: string;
  keywords: string[];
  canonicalUrl?: string;
  language?: string;
  openGraph: Record<string, string | string[]>;
  twitter: Record<string, string>;
  favicons: string[];
  logos: string[];
  images: string[];
  videos: string[];
  emails: string[];
  phones: string[];
  addresses: string[];
  authors: string[];
  generator?: string;
}

export interface JsonLdEntry {
  sourceUrl: string;
  types: string[];
  id?: string;
  raw: unknown;
}

export interface TechnologySignal {
  name: string;
  category: 'framework' | 'hosting' | 'analytics' | 'payments' | 'crm' | 'infrastructure' | 'other';
  confidence: number;
  evidence: string[];
}

export interface ContactDetails {
  emails: string[];
  phones: string[];
  addresses: string[];
  supportPages: string[];
}

export interface SocialLinks {
  website: string[];
  linkedin: string[];
  x: string[];
  twitter: string[];
  github: string[];
  youtube: string[];
  facebook: string[];
  instagram: string[];
  tiktok: string[];
  discord: string[];
}

export interface CompanyProfile {
  name?: string;
  mission?: string;
  vision?: string;
  about?: string;
  problem?: string;
  solution?: string;
  targetAudience?: string[];
  industry?: string;
  category?: string;
  businessModel?: string[];
  founded?: string;
  founders?: string[];
  leadership?: string[];
  investors?: string[];
  funding?: string[];
  partners?: string[];
  customers?: string[];
  testimonials?: string[];
  awards?: string[];
  compliance?: string[];
  security?: string[];
}

export interface ProductProfile {
  name: string;
  summary?: string;
  features: string[];
  capabilities: string[];
  useCases: string[];
  supportedPlatforms: string[];
  integrations: string[];
  apis: string[];
  sdks: string[];
}

export interface FeatureProfile {
  name: string;
  description?: string;
  sourcePage?: string;
}

export interface IntegrationProfile {
  name: string;
  category?: string;
  sourcePage?: string;
}

export interface PricingPlan {
  name: string;
  currency?: string;
  price?: string;
  billingPeriod?: 'month' | 'year' | 'usage' | 'one-time' | 'custom';
  enterprise?: boolean;
  freeTier?: boolean;
  trial?: boolean;
  credits?: string;
  usageLimits?: string[];
  features: string[];
  sourcePage?: string;
}

export interface FaqItem {
  question: string;
  answer: string;
  category?: string;
  sourcePage?: string;
}

export interface BlogPost {
  title: string;
  author?: string;
  date?: string;
  summary?: string;
  tags: string[];
  categories: string[];
  url?: string;
}

export interface TeamMember {
  name: string;
  role?: string;
  bio?: string;
  url?: string;
}

export interface CrawledPage {
  url: string;
  finalUrl: string;
  title: string;
  description: string;
  canonicalUrl?: string;
  depth: number;
  pageType: string;
  wordCount: number;
  markdown: string;
  textHash: string;
  metadata: PageMetadata;
  jsonLd: JsonLdEntry[];
  technologies: TechnologySignal[];
}

export interface CrawlSummary {
  startUrl: string;
  normalizedStartUrl: string;
  finalUrl?: string;
  totalDiscovered: number;
  totalCrawled: number;
  totalBlocked: number;
  totalFailed: number;
  sitemapUrls: string[];
  blockedUrls: string[];
  failedUrls: Array<{ url: string; reason: string }>;
  robotsTxtUrl?: string;
  crawlDelaySeconds?: number;
  durationMs: number;
}

export interface WebsiteContent {
  url: string;
  normalizedUrl: string;
  finalUrl?: string;
  title: string;
  description: string;
  markdownContent: string;
  metadata: PageMetadata;
  company: CompanyProfile;
  products: ProductProfile[];
  pricing: PricingPlan[];
  features: FeatureProfile[];
  technologies: TechnologySignal[];
  integrations: IntegrationProfile[];
  faqs: FaqItem[];
  blogs: BlogPost[];
  team: TeamMember[];
  contacts: ContactDetails;
  socialLinks: SocialLinks;
  jsonLd: JsonLdEntry[];
  pages: CrawledPage[];
  crawl: CrawlSummary;
  extractedSections: {
    about?: string;
    product?: string;
    pricing?: string;
    team?: string;
    contact?: string;
    faq?: string;
    blog?: string;
    security?: string;
    integrations?: string;
    investors?: string;
  };
}

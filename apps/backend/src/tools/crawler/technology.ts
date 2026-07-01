import * as cheerio from 'cheerio';
import { TechnologySignal } from './types';

const DETECTIONS: Array<{
  name: string;
  category: TechnologySignal['category'];
  patterns: RegExp[];
}> = [
  { name: 'Next.js', category: 'framework', patterns: [/_next\//i, /__NEXT_DATA__/i] },
  { name: 'React', category: 'framework', patterns: [/react/i, /data-reactroot/i] },
  { name: 'Angular', category: 'framework', patterns: [/angular/i, /ng-version/i] },
  { name: 'Vue', category: 'framework', patterns: [/vue/i, /__VUE__/i] },
  { name: 'Node.js', category: 'infrastructure', patterns: [/node\.js/i, /node/i] },
  { name: 'Vercel', category: 'hosting', patterns: [/vercel/i, /x-vercel/i] },
  { name: 'Cloudflare', category: 'hosting', patterns: [/cloudflare/i, /cf-ray/i, /cdn-cgi/i] },
  { name: 'AWS', category: 'infrastructure', patterns: [/amazonaws\.com/i, /aws/i] },
  { name: 'Stripe', category: 'payments', patterns: [/stripe/i] },
  { name: 'HubSpot', category: 'crm', patterns: [/hubspot/i] },
  { name: 'Segment', category: 'analytics', patterns: [/segment/i] },
  { name: 'Mixpanel', category: 'analytics', patterns: [/mixpanel/i] },
  { name: 'Google Analytics', category: 'analytics', patterns: [/googletagmanager|gtag\(|ga\(/i] },
  { name: 'Google Tag Manager', category: 'analytics', patterns: [/googletagmanager|gtm\.js/i] },
];

export function detectTechnologies($: cheerio.CheerioAPI, headers: Record<string, string>, html: string): TechnologySignal[] {
  const text = [
    html,
    Object.entries(headers)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n'),
    $('meta[name="generator"]').attr('content') ?? '',
  ].join('\n');

  return DETECTIONS.flatMap((item) => {
    const evidence = item.patterns.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
    if (!evidence.length) return [];
    return [
      {
        name: item.name,
        category: item.category,
        confidence: Math.min(0.95, 0.6 + evidence.length * 0.1),
        evidence,
      },
    ];
  });
}

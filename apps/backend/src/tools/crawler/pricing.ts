import { PricingPlan } from './types';
import { normalizeWhitespace } from './utils';

export function extractPricing(text: string, sourcePage: string): PricingPlan[] {
  const lines = text.split(/\n+/).map((line) => normalizeWhitespace(line)).filter(Boolean);
  const plans: PricingPlan[] = [];

  for (const line of lines) {
    const plan = parsePricingLine(line, sourcePage);
    if (plan) plans.push(plan);
  }

  return dedupe(plans);
}

function parsePricingLine(line: string, sourcePage: string): PricingPlan | null {
  const lower = line.toLowerCase();
  const priceMatch = line.match(/(?<currency>[$€£]|usd|eur|gbp)\s?(?<amount>\d+(?:[.,]\d+)?)\s?(?<period>\/\s?(month|mo|year|yr|annually|monthly|yearly))?/i);
  if (!priceMatch && !/(free|trial|enterprise|custom|usage|credit|pricing|plan)/i.test(line)) return null;

  return {
    name: inferPlanName(lower),
    currency: priceMatch?.groups?.currency?.toUpperCase(),
    price: priceMatch ? `${priceMatch.groups?.currency ?? ''}${priceMatch.groups?.amount ?? ''}`.trim() : undefined,
    billingPeriod: inferBillingPeriod(priceMatch?.groups?.period ?? lower),
    enterprise: /enterprise|custom/i.test(line),
    freeTier: /free/i.test(line),
    trial: /trial/i.test(line),
    credits: /credit/i.test(line) ? line : undefined,
    usageLimits: extractLimits(line),
    features: extractFeatureHints(line),
    sourcePage,
  };
}

function inferPlanName(line: string): string {
  if (line.includes('enterprise')) return 'Enterprise';
  if (line.includes('pro')) return 'Pro';
  if (line.includes('business')) return 'Business';
  if (line.includes('team')) return 'Team';
  if (line.includes('starter')) return 'Starter';
  if (line.includes('free')) return 'Free';
  return 'Pricing Plan';
}

function inferBillingPeriod(value?: string): PricingPlan['billingPeriod'] {
  if (!value) return undefined;
  if (/year|yr|annual/i.test(value)) return 'year';
  if (/month|mo/i.test(value)) return 'month';
  if (/usage/i.test(value)) return 'usage';
  if (/one-time|lifetime/i.test(value)) return 'one-time';
  return 'custom';
}

function extractLimits(line: string): string[] {
  return (line.match(/\d+[\w-]*\s?(?:users?|seats?|projects?|documents?|credits?|api calls?|requests?|events?|hours?|gb|tb)/gi) ?? []).map((value) => normalizeWhitespace(value));
}

function extractFeatureHints(line: string): string[] {
  return line
    .split(/[,;|]/)
    .map((part) => normalizeWhitespace(part))
    .filter((part) => part.length > 3 && !/price|month|year|free|trial|enterprise|custom/i.test(part));
}

function dedupe(plans: PricingPlan[]): PricingPlan[] {
  const seen = new Set<string>();
  return plans.filter((plan) => {
    const key = `${plan.name}|${plan.price}|${plan.billingPeriod}|${plan.enterprise}|${plan.freeTier}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

import { reasoningModel } from '../config/llm';
import { z } from 'zod';
import {
  ExtractedStartupData,
  FinancialData,
  FullDueDiligenceOutput,
  CompetitorType,
  FinancialHealth,
  InvestmentRecommendation,
  RiskSeverity,
} from '@startupai/shared';

export type { ExtractedStartupData, FinancialData };

export interface RetrievedKnowledge {
  context: string[];
}

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const SafeStringArray = z.preprocess(
  (val: unknown) => {
    if (Array.isArray(val)) {
      return val.map((item) => {
        if (typeof item === 'object' && item !== null) {
          const values = Object.values(item as Record<string, unknown>);
          const strVal = values.find((v) => typeof v === 'string');
          return (strVal as string) || JSON.stringify(item);
        }
        return String(item);
      });
    }
    if (typeof val === 'string') {
      return val.split(',').map((s: string) => s.trim());
    }
    return [];
  },
  z.array(z.string()).catch([])
);

const SafeString = (fallback = 'N/A') =>
  z.preprocess((val: unknown) => {
    if (val === undefined || val === null) return fallback;
    const str = String(val).trim();
    if (str === 'undefined' || str === 'null' || str === '') return fallback;
    return str;
  }, z.string().catch(fallback));

const CompetitorSchema = z.object({
  name: SafeString('Unknown'),
  type: z
    .enum(['DIRECT', 'INDIRECT', 'GLOBAL', 'REGIONAL', 'MARKET_LEADER'] as const)
    .catch('DIRECT' as CompetitorType),
  fundingRaised: SafeString('Unknown'),
  businessModel: SafeString('N/A'),
  revenueModel: SafeString('N/A'),
  strengths: SafeStringArray,
  weaknesses: SafeStringArray,
  pricingStrategy: SafeString('N/A'),
  marketPositioning: SafeString('N/A'),
  customerSegments: SafeStringArray,
});

const FullDueDiligenceSchema = z.object({
  thinking: SafeString(''),

  // ── Core Summary
  name: SafeString('Unknown'),
  tagline: SafeString(''),
  stage: SafeString('Unknown'),
  founded: SafeString('N/A'),
  location: SafeString('N/A'),
  teamSize: SafeString('N/A'),
  description: SafeString(''),
  keyHighlights: SafeStringArray,
  investmentReadiness: SafeString('N/A'),
  growthPotential: SafeString('N/A'),

  // ── Business Analysis
  problem: SafeString('N/A'),
  solution: SafeString('N/A'),
  valueProposition: SafeString('N/A'),
  businessModel: SafeString('N/A'),
  revenueStreams: SafeStringArray,
  competitiveAdvantage: SafeString('N/A'),

  // ── Market Opportunity
  tam: SafeString('N/A'),
  sam: SafeString('N/A'),
  som: SafeString('N/A'),
  marketGrowthRate: SafeString('N/A'),
  keyTrends: SafeStringArray,
  emergingTrends: SafeStringArray,
  futureOpportunities: SafeStringArray,
  industryChallenges: SafeStringArray,
  competitorLandscape: SafeString('N/A'),

  // ── Competitors (array of structured competitors)
  competitors: z.array(CompetitorSchema).catch([]),

  // ── Financial Insights
  isFinancialEstimated: z.boolean().catch(false),
  currentRevenue: SafeString('N/A'),
  burnRate: SafeString('N/A'),
  runway: SafeString('N/A'),
  grossMargin: SafeString('N/A'),
  cac: SafeString('N/A'),
  ltv: SafeString('N/A'),
  marketMultiples: SafeString('N/A'),
  industryBenchmarks: z
    .array(
      z.object({
        label: SafeString(''),
        value: SafeString(''),
      })
    )
    .catch([]),
  keyMetrics: z
    .array(
      z.object({
        label: SafeString(''),
        value: SafeString(''),
      })
    )
    .catch([]),
  financialHealth: z
    .enum(['STRONG', 'STABLE', 'CONCERNING', 'CRITICAL'] as const)
    .catch('STABLE' as FinancialHealth),
  financialCommentary: SafeString('No financial data available.'),

  // ── Risks (severity must be LOW, MEDIUM, HIGH, or CRITICAL)
  risks: z
    .array(
      z.object({
        title: SafeString('Risk'),
        severity: z
          .enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const)
          .catch('MEDIUM' as RiskSeverity),
        description: SafeString(''),
      })
    )
    .catch([]),

  // ── Strengths
  strengths: z
    .array(
      z.object({
        title: SafeString('Strength'),
        description: SafeString(''),
      })
    )
    .catch([]),

  // ── Investor Readiness
  fundingReadinessScore: z.preprocess((v: unknown) => {
    const n = Number(v);
    return isNaN(n) ? 50 : Math.min(100, Math.max(0, Math.round(n)));
  }, z.number().catch(50)),
  vcPerspective: SafeString('N/A'),
  preSeedSuitability: SafeString('N/A'),
  seedSuitability: SafeString('N/A'),
  seriesASuitability: SafeString('N/A'),
  recommendedRaiseAmount: SafeString('N/A'),
  suggestedValuationRange: SafeString('N/A'),

  // ── VC Intelligence
  investmentThesis: SafeString('N/A'),
  marketTiming: SafeString('N/A'),
  competitiveMoat: SafeString('N/A'),
  exitOpportunities: SafeStringArray,

  // ── Scoring & Recommendation
  investmentScore: z.preprocess((v: unknown) => {
    const n = Number(v);
    return isNaN(n) ? 50 : Math.min(100, Math.max(0, Math.round(n)));
  }, z.number().catch(50)),
  recommendation: z
    .enum(['STRONG_INVEST', 'INVEST', 'PASS', 'NEEDS_MORE_INFO'] as const)
    .catch('NEEDS_MORE_INFO' as InvestmentRecommendation),
  founderQuestions: SafeStringArray,
  confidenceScore: z.preprocess((v: unknown) => {
    const n = Number(v);
    return isNaN(n) ? 0.8 : Math.min(1, Math.max(0, n));
  }, z.number().catch(0.8)),
  sourcesUsed: SafeStringArray,
});

// ─── LLM Caller ─────────────────────────────────────────────────────────────

async function callLLMJson<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: z.ZodType<T>,
  retries = 2,
  previousError?: string
): Promise<T> {
  try {
    let prompt = `${userPrompt}\n\nCRITICAL: Return ONLY a raw JSON object matching the schema. No markdown, no backticks, no extra text. Include ALL fields. If any metric, benchmark, or field is not explicitly in the source material, you MUST mathematically estimate or deduct a realistic stage-appropriate value based on industry benchmarks. Do NOT use placeholder strings like "Unknown", "N/A", "TBD", or "0" for missing values unless absolutely no alternative is possible.`;
    if (previousError) {
      prompt += `\n\nPREVIOUS ERROR: ${previousError}\nFix the JSON and include ALL required fields.`;
    }

    const response = await reasoningModel.invoke(`${systemPrompt}\n\nTask:\n${prompt}`);

    let content =
      typeof response === 'string'
        ? response
        : typeof response?.content === 'string'
        ? response.content
        : JSON.stringify(response?.content || '{}');

    // 1. Remove <think>...</think> tags emitted by DeepSeek-R1, Qwen, and other reasoning models
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // 2. Remove markdown code fence markers
    let jsonStr = content.replace(/```json/gi, '').replace(/```/g, '').trim();

    // 3. Extract the outermost JSON object
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseError: unknown) {
      const parseMsg = parseError instanceof Error ? parseError.message : String(parseError);
      console.warn(`[dueDiligenceReasoningAgent] JSON parse failed: ${parseMsg}. Raw snippet: ${jsonStr.slice(0, 200)}`);
      if (retries > 0) {
        return callLLMJson(systemPrompt, userPrompt, schema, retries - 1, `JSON parse error: ${parseMsg}`);
      }
      parsed = {};
    }

    return schema.parse(parsed);
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    if (retries > 0) {
      console.warn(`[dueDiligenceReasoningAgent] Failed, retrying (${retries} left): ${errMessage}`);
      return callLLMJson(systemPrompt, userPrompt, schema, retries - 1, errMessage);
    }
    console.error(`[dueDiligenceReasoningAgent] All retries exhausted. Using defaults:`, error);
    return schema.parse({});
  }
}

// ─── Main Agent Execution ───────────────────────────────────────────────────

export async function runDueDiligenceReasoningAgent(
  startupData: ExtractedStartupData,
  financialData: FinancialData,
  knowledge: RetrievedKnowledge,
  startupStage?: string,
  pitchDeckRawText?: string,
  websiteMarkdown?: string
): Promise<FullDueDiligenceOutput> {
  const stageContext = startupStage
    ? `\n\nIMPORTANT: The startup is at stage "${startupStage}". Tailor all expectations, scoring rubrics, and recommendations to this specific stage.`
    : '';

  const systemPrompt = `You are a Principal Venture Capital Investment Partner, Senior Financial Auditor, and Product Strategy Expert performing rigorous investment due diligence.

You MUST reason step-by-step inside the "thinking" field BEFORE writing any other field:
1. Systematically audit all claims in the pitch materials against the knowledge context.
2. Evaluate financial runway, burn rate, and financial stability.
3. Weigh competitive factors: TAM, moat, differentiation, team.
4. Run rubric-based scoring:
   - Market opportunity (25%): TAM, growth rate, timing
   - Financial health & runway (30%): burn, CAC/LTV, margins
   - Product moat & defensibility (25%): tech differentiation, IP, network effects
   - Traction & validation (20%): customers, revenue growth, retention
5. Identify at least 3 specific risks and 3 specific strengths based ONLY on real evidence.
6. Generate 5+ specific founder questions about unclear or risky areas.
7. Self-evaluate your confidence (0.0–1.0) based on data completeness.

Maintain strict objectivity. If data is not explicitly provided in the pitch deck, you MUST mathematically compute or deduce realistic, industry-benchmark numbers and set isFinancialEstimated=true.${stageContext}`;

  const userPrompt = `─── Startup Profile ───
Name: ${startupData.name}
Tagline: ${startupData.tagline}
Description: ${startupData.description}
Stage: ${startupStage || startupData.stage}
Founded: ${startupData.founded ?? 'N/A'}
Location: ${startupData.location ?? 'N/A'}
Team Size: ${startupData.teamSize ?? 'N/A'}
Key Highlights: ${JSON.stringify(startupData.keyHighlights ?? [])}

─── Financial Data ───
Summary: ${financialData.summary ?? 'No financial model uploaded — use market benchmarks and set isFinancialEstimated=true'}
Current Revenue: ${financialData.metrics?.revenue?.at(-1)?.toString() || 'N/A'}
Burn Rate: ${financialData.metrics?.burnRate?.at(-1)?.toString() || 'N/A'}
Runway: ${financialData.metrics?.runway?.toString() || 'N/A'}
Gross Margin: ${financialData.metrics?.grossMargin?.toString() || 'N/A'}
${pitchDeckRawText ? `
─── FULL PITCH DECK (PRIMARY SOURCE — USE THIS AS THE MAIN INPUT) ───
${pitchDeckRawText.slice(0, 7000)}
` : ''}
${websiteMarkdown ? `
─── WEBSITE CONTENT ───
${websiteMarkdown.slice(0, 3000)}
` : ''}

─── Retrieved Market & Competitive Intelligence ───
${(knowledge.context || []).slice(0, 12).join('\n\n---\n\n')}

Return a COMPLETE JSON object with ALL of the following sections filled with specific, evidence-based data. Enforce the exact type formats:
- thinking: A detailed string describing your step-by-step reasoning chain.
- name, tagline, stage, description, investmentReadiness, growthPotential: Strings (never empty or null).
- founded, location, teamSize: Strings. If not explicitly in the deck, provide a realistic estimate based on founding indicators/clues (e.g. "2024 (Est.)", "Bengaluru, India (HQ)", "1-10"). Do NOT return a plain "N/A" or "Unknown".
- keyHighlights: A simple array of strings (e.g. ["Robust tech moat", "Experienced founders"]), never objects.
- problem, solution, valueProposition, businessModel, competitiveAdvantage, competitorLandscape: Strings.
- revenueStreams: A simple array of strings (e.g. ["SaaS Subscriptions", "Transaction Fees"]), never objects.
- tam, sam, som: Market size strings with currency (e.g., "$15.4B" or "$300M"). If SAM or SOM are not in the deck, mathematically calculate them based on market standard capture benchmarks (e.g., SAM as 15-20% of TAM, SOM as 2-5% of SAM/TAM) based on sector size. NEVER return "Unknown" or "N/A" for SAM/SOM.
- marketGrowthRate: A string (e.g. "12% CAGR").
- keyTrends, emergingTrends, futureOpportunities, industryChallenges: Simple arrays of strings, never objects.
- competitors: Array of objects (at least 3 direct/indirect competitors). Each competitor must have:
  - name: string. NEVER return generic placeholder competitor names like "Competitor A", "Competitor B", "Competitor C". You MUST use real, actual competitor company names extracted from the pitch materials or from market intelligence.
  - type: one of "DIRECT", "INDIRECT", "GLOBAL", "REGIONAL", "MARKET_LEADER"
  - fundingRaised: string (e.g. "$250M", "Estimated $10M-$20M", or "Bootstrapped"). Do NOT return a plain "Unknown" or "N/A" — make a reasonable estimation.
  - businessModel: string (e.g. "Inventory-led B2C")
  - revenueModel: string (e.g. "Direct sales margins")
  - pricingStrategy: string (e.g. "Value pricing")
  - marketPositioning: string (e.g. "Premium fresh organic")
  - strengths: simple array of strings (never objects)
  - weaknesses: simple array of strings (never objects)
  - customerSegments: simple array of strings (never objects)
- isFinancialEstimated: Boolean (true/false).
- currentRevenue, burnRate, runway, grossMargin, cac, ltv, marketMultiples: Strings. If not explicitly provided, estimate them based on early-stage software/hardware benchmarks (e.g. "Estimated $10k/mo", "Estimated $20k/mo burn", "12 months runway", "70%", "N/A"). Ensure isFinancialEstimated=true is set.
- recommendedRaiseAmount, suggestedValuationRange: Strings with currency. Always calculate and suggest a realistic fundraising range and valuation range appropriate for the startup's stage (e.g., Seed stage: raise "$1.5M - $2.5M" at "$8M - $12M valuation"). Do NOT return "Unknown" or "N/A".
- industryBenchmarks, keyMetrics: Array of objects with { label: string, value: string } (e.g. { label: "LTV/CAC", value: "3.5x" }).
- financialHealth: One of "STRONG", "STABLE", "CONCERNING", "CRITICAL".
- financialCommentary: A detailed string.
- risks: Array of at least 4 objects with { title: string, severity: "LOW"|"MEDIUM"|"HIGH"|"CRITICAL", description: string }.
- strengths: Array of at least 4 objects with { title: string, description: string }.
- fundingReadinessScore: An integer from 0 to 100 (e.g. 75), NEVER a decimal.
- vcPerspective: A detailed string.
- preSeedSuitability, seedSuitability, seriesASuitability: Strings. Evaluate the suitability of the funding stage objectively based on team maturity and traction benchmarks (e.g., "Highly Suitable - matches Pre-Seed traction benchmarks", "Potential - product validation needed", "Too Early - requires core revenue proof"). Do NOT return "Unknown" or "N/A".
- investmentThesis, marketTiming, competitiveMoat: Strings.
- exitOpportunities: A simple array of strings (e.g. ["Acquisition by retail chains", "Strategic exit to tech major"]), never objects.
- investmentScore: An integer from 0 to 100 (e.g. 70), NEVER a decimal.
- recommendation: One of "STRONG_INVEST", "INVEST", "PASS", "NEEDS_MORE_INFO".
- founderQuestions: A simple array of at least 5 strings (e.g. ["How will you maintain margins?", "What is the team's key gap?"]), never objects.
- confidenceScore: A float between 0.0 and 1.0 (e.g. 0.8).
- sourcesUsed: A simple array of strings.`;

  const rawResult = await callLLMJson(systemPrompt, userPrompt, FullDueDiligenceSchema, 2);
  return rawResult as FullDueDiligenceOutput;
}

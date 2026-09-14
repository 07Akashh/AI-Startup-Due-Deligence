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

    const jsonStr = content.replace(/```json/gi, '').replace(/```/g, '').trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseError: unknown) {
      const parseMsg = parseError instanceof Error ? parseError.message : String(parseError);
      console.warn(`[dueDiligenceReasoningAgent] JSON parse failed: ${parseMsg}. Raw: ${jsonStr.slice(0, 300)}`);
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
  const systemPrompt = `You are a Principal at a top-tier venture capital firm (Sequoia / Benchmark / a16z calibre).
You produce institutional-grade startup investment memos.
You combine deep quantitative rigour with sharp market instinct.

You MUST reason step-by-step inside the "thinking" field BEFORE writing any other field:
1. What does this company REALLY do? (cut through marketing buzzwords)
2. What is their structural advantage / moat? Is it defensible against incumbents?
3. What are the key unit economics and financial realities?
4. What are the fatal risks that could kill this company?
5. Is this an investable opportunity at this stage, and what is the conviction level?

CRITICAL DATA QUALITY RULES:
1. NO EMPTY FIELDS: Every single field must contain rich, specific, analytical content.
2. COMPETITORS: Return minimum 3-5 real competitors (DIRECT, INDIRECT, GLOBAL, REGIONAL, MARKET_LEADER). Do NOT use generic placeholders like "Competitor A".
3. FINANCIAL ESTIMATION: If financial CSV was not uploaded, set isFinancialEstimated: true, and compute industry-benchmark financial metrics based on stage.
4. INVESTMENT SCORE: Calibrate carefully from 0-100 based on team, market, product, traction, economics, and moat.`;

  const userPrompt = `Analyze the following startup and produce a complete VC Due Diligence Memo:

Startup Profile:
- Name: ${startupData.name}
- Tagline: ${startupData.tagline}
- Description: ${startupData.description}
- Stage: ${startupStage || startupData.stage}
- Founded: ${startupData.founded || 'N/A'}
- Location: ${startupData.location || 'N/A'}
- Team Size: ${startupData.teamSize || 'N/A'}
- Key Highlights: ${(startupData.keyHighlights || []).join('; ')}

Financial Inputs:
- Summary: ${financialData.summary || 'None provided'}
- Latest Revenue: ${financialData.metrics?.revenue?.at(-1)?.toString() || 'N/A'}
- Latest Burn: ${financialData.metrics?.burnRate?.at(-1)?.toString() || 'N/A'}
- Runway: ${financialData.metrics?.runway?.toString() || 'N/A'}
- Gross Margin: ${financialData.metrics?.grossMargin?.toString() || 'N/A'}

Raw Pitch Deck Context:
${pitchDeckRawText ? pitchDeckRawText.slice(0, 4000) : 'No pitch deck provided'}

Website Content:
${websiteMarkdown ? websiteMarkdown.slice(0, 3000) : 'No website content provided'}

Retrieved Market & Competitive Intelligence (RAG):
${(knowledge.context || []).slice(0, 10).join('\n---\n')}`;

  const rawResult = await callLLMJson(systemPrompt, userPrompt, FullDueDiligenceSchema);
  return rawResult as FullDueDiligenceOutput;
}

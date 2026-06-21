import { fullModel, miniModel } from '../config/llm';
import { z } from 'zod';
import { logger } from '../utils/logger';

// ─── Input Types ─────────────────────────────────────────────────────────────

export interface ExtractedStartupData {
  name: string;
  tagline: string;
  description: string;
  stage: string;
  founded?: string;
  location?: string;
  teamSize?: string;
  keyHighlights?: string[];
}

export interface FinancialData {
  summary?: string;
  currentRevenue?: string;
  burnRate?: string;
  runway?: string;
  grossMargin?: string;
  chartData?: Array<{ month: string; revenue: number; expenses: number }>;
}

export interface RetrievedKnowledge {
  context: string[];
}

// ─── Internal schema with full due diligence report ──────────────────────────

const SafeStringArray = z.preprocess(
  (val) => {
    if (Array.isArray(val)) {
      return val.map((item) => {
        if (typeof item === 'object' && item !== null) {
          const values = Object.values(item);
          const strVal = values.find(v => typeof v === 'string');
          return strVal || JSON.stringify(item);
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

const SafeString = (fallback = 'N/A') => z.preprocess(
  (val) => {
    if (val === undefined || val === null) return fallback;
    const str = String(val).trim();
    if (str === 'undefined' || str === 'null' || str === '') return fallback;
    return str;
  },
  z.string().catch(fallback)
);

const CompetitorSchema = z.object({
  name: SafeString('Unknown'),
  type: z.enum(['DIRECT', 'INDIRECT', 'GLOBAL', 'REGIONAL', 'MARKET_LEADER']).catch('DIRECT'),
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
  // Thinking chain (internal — not exposed)
  thinking: SafeString(''),

  // ── Core Summary ─────────────────────────────────────────────────────────
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

  // ── Business Analysis ────────────────────────────────────────────────────
  problem: SafeString('N/A'),
  solution: SafeString('N/A'),
  valueProposition: SafeString('N/A'),
  businessModel: SafeString('N/A'),
  revenueStreams: SafeStringArray,
  competitiveAdvantage: SafeString('N/A'),

  // ── Market Opportunity ───────────────────────────────────────────────────
  tam: SafeString('N/A'),
  sam: SafeString('N/A'),
  som: SafeString('N/A'),
  marketGrowthRate: SafeString('N/A'),
  keyTrends: SafeStringArray,
  emergingTrends: SafeStringArray,
  futureOpportunities: SafeStringArray,
  industryChallenges: SafeStringArray,
  competitorLandscape: SafeString('N/A'),

  // ── Competitors ──────────────────────────────────────────────────────────
  competitors: z.array(CompetitorSchema).catch([]),

  // ── Financial Insights ───────────────────────────────────────────────────
  isFinancialEstimated: z.boolean().catch(true),
  currentRevenue: SafeString('N/A'),
  burnRate: SafeString('N/A'),
  runway: SafeString('N/A'),
  grossMargin: SafeString('N/A'),
  cac: SafeString('N/A'),
  ltv: SafeString('N/A'),
  marketMultiples: SafeString('N/A'),
  industryBenchmarks: z.array(z.object({ label: SafeString(''), value: SafeString('') })).catch([]),
  keyMetrics: z.array(z.object({ label: SafeString(''), value: SafeString('') })).catch([]),
  financialHealth: z.enum(['STRONG', 'STABLE', 'CONCERNING', 'CRITICAL']).catch('STABLE'),
  financialCommentary: SafeString(''),

  // ── Risks ────────────────────────────────────────────────────────────────
  risks: z.array(z.object({
    title: SafeString(''),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).catch('MEDIUM'),
    description: SafeString(''),
  })).catch([]),

  // ── Strengths ────────────────────────────────────────────────────────────
  strengths: z.array(z.object({
    title: SafeString(''),
    description: SafeString(''),
  })).catch([]),

  // ── Investor Readiness ───────────────────────────────────────────────────
  fundingReadinessScore: z.coerce.number().catch(50),
  vcPerspective: SafeString('N/A'),
  preSeedSuitability: SafeString('N/A'),
  seedSuitability: SafeString('N/A'),
  seriesASuitability: SafeString('N/A'),
  recommendedRaiseAmount: SafeString('N/A'),
  suggestedValuationRange: SafeString('N/A'),

  // ── VC Intelligence ──────────────────────────────────────────────────────
  investmentThesis: SafeString('N/A'),
  marketTiming: SafeString('N/A'),
  competitiveMoat: SafeString('N/A'),
  exitOpportunities: SafeStringArray,

  // ── Investment Score ─────────────────────────────────────────────────────
  investmentScore: z.coerce.number().catch(50),
  recommendation: z.enum(['STRONG_INVEST', 'INVEST', 'PASS', 'NEEDS_MORE_INFO']).catch('NEEDS_MORE_INFO'),
  founderQuestions: SafeStringArray,
  confidenceScore: z.coerce.number().catch(0.5),
  sourcesUsed: SafeStringArray,
});

export type FullDueDiligenceOutput = z.infer<typeof FullDueDiligenceSchema>;

// ─── LLM Caller (JSON mode, no withStructuredOutput) ─────────────────────────

async function callLLMJson<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: z.ZodType<T>,
  retries = 2,
  previousError?: string
): Promise<T> {
  const model = fullModel;

  try {
    let prompt = `${userPrompt}\n\nCRITICAL: Return ONLY a raw JSON object matching the schema. No markdown, no backticks, no extra text. Include ALL fields. If any metric, benchmark, or field is not explicitly in the source material, you MUST mathematically estimate or deduct a realistic stage-appropriate value based on industry benchmarks. Do NOT use placeholder strings like "Unknown", "N/A", "TBD", or "0" for missing values unless absolutely no alternative is possible. Use 0 for missing numbers, [] for missing arrays.`;
    if (previousError) {
      prompt += `\n\nPREVIOUS ERROR: ${previousError}\nFix the JSON and include ALL required fields.`;
    }

    const llmJson = (model as any).bind({ response_format: { type: 'json_object' } });
    const response = await llmJson.invoke(`${systemPrompt}\n\nTask:\n${prompt}`);

    let content = typeof response === 'string' ? response : (response?.content || response?.text || response?.message?.content);
    if (!content && response?.kwargs?.content) content = response.kwargs.content;
    if (typeof content !== 'string') content = JSON.stringify(content || response || '{}');

    const jsonStr = content.replace(/```json/gi, '').replace(/```/g, '').trim();

    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseError: any) {
      console.warn(`[dueDiligenceReasoningAgent] JSON parse failed: ${parseError.message}. Raw: ${jsonStr.slice(0, 300)}`);
      if (retries > 0) return callLLMJson(systemPrompt, userPrompt, schema, retries - 1, `JSON parse error: ${parseError.message}`);
      parsed = {};
    }

    return schema.parse(parsed);
  } catch (error: any) {
    if (retries > 0) {
      console.warn(`[dueDiligenceReasoningAgent] Failed, retrying (${retries} left): ${error.message}`);
      return callLLMJson(systemPrompt, userPrompt, schema, retries - 1, error.message);
    }
    console.error(`[dueDiligenceReasoningAgent] All retries exhausted. Using defaults.`);
    return schema.parse({});
  }
}

// ─── Main Agent ───────────────────────────────────────────────────────────────

/**
 * Due Diligence Reasoning Agent
 * A single-pass, comprehensive agent that generates the complete investment report
 * with internal chain-of-thought reasoning (thinking field is hidden from output).
 */
export async function runDueDiligenceReasoningAgent(
  startupData: ExtractedStartupData,
  financialData: FinancialData,
  knowledge: RetrievedKnowledge,
  startupStage?: string,
  rawPitchDeckText?: string,
  rawWebsiteContent?: string,
): Promise<FullDueDiligenceOutput> {
  const log = logger.child({ agent: 'DueDiligenceReasoningAgent' });
  log.info('Running Due Diligence Reasoning Agent');

  const stageContext = startupStage
    ? `\n\nIMPORTANT: The startup is at stage "${startupStage}". Tailor all expectations, scoring rubrics, and recommendations to this specific stage.`
    : '';

  const SYSTEM = `You are a Principal Venture Capital Investment Partner, Senior Financial Auditor, and Product Strategy Expert performing rigorous investment due diligence.

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

Maintain strict objectivity. Do NOT fabricate metrics not supported by the provided context. If data is missing, use market benchmarks and explicitly note estimates with isFinancialEstimated=true.${stageContext}`;

  const USER = `─── Startup Profile ───
Name: ${startupData.name}
Tagline: ${startupData.tagline}
Description: ${startupData.description}
Stage: ${startupData.stage}
Founded: ${startupData.founded ?? 'N/A'}
Location: ${startupData.location ?? 'N/A'}
Team Size: ${startupData.teamSize ?? 'N/A'}
Key Highlights: ${JSON.stringify(startupData.keyHighlights ?? [])}

─── Financial Data ───
Summary: ${financialData.summary ?? 'No financial model uploaded — use market benchmarks and set isFinancialEstimated=true'}
Current Revenue: ${financialData.currentRevenue ?? 'N/A'}
Burn Rate: ${financialData.burnRate ?? 'N/A'}
Runway: ${financialData.runway ?? 'N/A'}
Gross Margin: ${financialData.grossMargin ?? 'N/A'}
${rawPitchDeckText ? `
─── FULL PITCH DECK (PRIMARY SOURCE — USE THIS AS THE MAIN INPUT) ───
${rawPitchDeckText.slice(0, 7000)}
` : ''}
${rawWebsiteContent ? `
─── WEBSITE CONTENT ───
${rawWebsiteContent.slice(0, 2000)}
` : ''}

─── Retrieved Market & Competitive Intelligence ───
${knowledge.context.slice(0, 12).join('\n\n---\n\n')}


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
  - name: string (e.g. "BigBasket"). NEVER return generic placeholder competitor names like "Competitor A", "Competitor B", "Competitor C", "Alternative 1", or "Competitor X". You MUST use real, actual competitor company names extracted from the pitch materials or from the Retrieved Market & Competitive Intelligence (e.g., BigBasket, Otipy, Country Delight, Zepto, Blinkit, etc. for fresh agritech supply chain startups).
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

  const rawResult = await callLLMJson(SYSTEM, USER, FullDueDiligenceSchema, 2);
  const result = rawResult as any as FullDueDiligenceOutput;

  log.info('Due diligence analysis completed', {
    score: result.investmentScore,
    recommendation: result.recommendation,
    confidence: result.confidenceScore,
    risksCount: Array.isArray(result.risks) ? result.risks.length : 0,
    competitorsCount: Array.isArray(result.competitors) ? result.competitors.length : 0,
  });

  return result;
}

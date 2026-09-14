import { validatorModel } from '../config/llm';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { ExtractedStartupData, FinancialData, RetrievedKnowledge } from './dueDiligenceReasoningAgent';
import { DueDiligenceReport } from '@startupai/shared';

const ValidatorOutputSchema = z.object({
  confidence: z.preprocess((v: unknown) => {
    const n = Number(v);
    return isNaN(n) ? 0.5 : Math.min(1, Math.max(0, n));
  }, z.number().catch(0.5)),
  issues: z.array(z.string()).catch([]),
  approved: z.boolean().catch(false),
  suggestions: z.array(z.string()).catch([]),
});

export interface ValidatorAgentOutput {
  confidence: number;
  issues: string[];
  approved: boolean;
  suggestions: string[];
}

async function callValidatorLLM(
  systemPrompt: string,
  userPrompt: string,
  retries = 1
): Promise<ValidatorAgentOutput> {
  try {
    const response = await validatorModel.invoke(
      `${systemPrompt}\n\nTask:\n${userPrompt}\n\nReturn ONLY a raw JSON object matching the schema.`
    );

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
    } catch {
      parsed = {};
    }

    return ValidatorOutputSchema.parse(parsed);
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    if (retries > 0) {
      console.warn(`[DueDiligenceValidatorAgent] Retry due to: ${errMessage}`);
      return callValidatorLLM(systemPrompt, userPrompt, retries - 1);
    }
    console.error(`[DueDiligenceValidatorAgent] Failed. Returning fallback:`, error);
    return {
      confidence: 0.5,
      issues: ['AI audit unavailable — structural validation only.'],
      approved: true,
      suggestions: [],
    };
  }
}

export async function runDueDiligenceValidatorAgent(
  reasoningOutput: Partial<DueDiligenceReport>,
  startupData: ExtractedStartupData,
  financialData: FinancialData,
  knowledge: RetrievedKnowledge
): Promise<ValidatorAgentOutput> {
  const log = logger.child({ agent: 'DueDiligenceValidatorAgent' });
  log.info('Running Due Diligence Validator Agent');

  const tam = reasoningOutput.marketOpportunity?.tam ?? 'N/A';
  const sam = reasoningOutput.marketOpportunity?.sam ?? 'N/A';
  const som = reasoningOutput.marketOpportunity?.som ?? 'N/A';
  const currentRevenue = reasoningOutput.financialInsights?.currentRevenue ?? 'N/A';
  const burnRate = reasoningOutput.financialInsights?.burnRate ?? 'N/A';
  const runway = reasoningOutput.financialInsights?.runway ?? 'N/A';
  const financialHealth = reasoningOutput.financialInsights?.financialHealth ?? 'STABLE';
  const vcPerspective = reasoningOutput.investorReadiness?.vcPerspective ?? 'N/A';
  const investmentThesis = reasoningOutput.vcIntelligence?.investmentThesis ?? 'N/A';

  const SYSTEM = `You are a Senior Risk Compliance Auditor and Chief Due Diligence Officer at a tier-1 Venture Capital fund.
Your sole purpose is to critically audit an AI-generated investment evaluation against raw source materials.

Your audit methodology:
1. HALLUCINATION DETECTION: Cross-reference every metric (Revenue, TAM, burn rate, margins, funding raised) against the raw materials. Flag any claim not supported by the raw context.
2. MISSING DATA: Flag missing or "N/A" critical fields (runway, CAC, competitors, investment score).
3. UNSUPPORTED CLAIMS: Flag positive bias, vague statements, or optimistic projections without evidence.
4. COMPLETENESS CHECK: Verify that risks, strengths, competitors, and financials are substantive and specific.
5. CONFIDENCE SCORE: Set confidence 0.0–1.0 based on data richness. Score >=0.70 means the report is investor-ready.
6. APPROVAL: approved=true only if confidence >= 0.70 AND no critical hallucinations or unsupported claims.

Return a JSON object with:
- confidence: number 0.0 to 1.0
- issues: array of specific issue strings (empty if none)
- suggestions: array of specific improvement suggestions
- approved: boolean`;

  const USER = `─── Raw Startup Profile ───
Name: ${startupData.name}
Description: ${startupData.description}
Stage: ${startupData.stage}
Highlights: ${JSON.stringify(startupData.keyHighlights ?? [])}

─── Raw Financial Data ───
Summary: ${financialData.summary ?? 'No financial model uploaded'}
Revenue: ${financialData.metrics?.revenue?.at(-1)?.toString() ?? 'N/A'}
Burn Rate: ${financialData.metrics?.burnRate?.at(-1)?.toString() ?? 'N/A'}
Runway: ${financialData.metrics?.runway?.toString() ?? 'N/A'}
Gross Margin: ${financialData.metrics?.grossMargin?.toString() ?? 'N/A'}

─── Retrieved Knowledge Context (first 8 chunks) ───
${knowledge.context.slice(0, 8).join('\n\n---\n\n')}

─── GENERATED REPORT TO AUDIT ───
Investment Score: ${reasoningOutput.investmentScore ?? 0}/100
Recommendation: ${reasoningOutput.recommendation ?? 'NEEDS_MORE_INFO'}
Confidence: ${reasoningOutput.confidenceScore ?? 0.5}
TAM: ${tam} | SAM: ${sam} | SOM: ${som}
Revenue: ${currentRevenue} | Burn: ${burnRate} | Runway: ${runway}
Financial Health: ${financialHealth}
Competitors Count: ${reasoningOutput.competitors?.length ?? 0}
Risks Count: ${reasoningOutput.risks?.length ?? 0}
Strengths Count: ${reasoningOutput.strengths?.length ?? 0}
Founder Questions: ${reasoningOutput.founderQuestions?.length ?? 0}
VC Perspective: ${vcPerspective.slice(0, 200)}...
Investment Thesis: ${investmentThesis.slice(0, 200)}...

Audit this report for hallucinations, unsupported claims, and completeness. Be strict and specific.`;

  const result = await callValidatorLLM(SYSTEM, USER);

  log.info('Due diligence validation completed', {
    approved: result.approved,
    issuesCount: result.issues.length,
    confidence: result.confidence,
  });

  return result;
}

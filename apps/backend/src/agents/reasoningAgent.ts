import { AgentState } from './state';
import { emitAgentEvent } from '../services/streamService';
import { updateJobStatus } from '../services/jobService';
import {
  runDueDiligenceReasoningAgent,
  ExtractedStartupData,
  FinancialData as AgentFinancialData,
  RetrievedKnowledge,
} from './dueDiligenceReasoningAgent';

// ─── Reasoning Agent (Graph Node) ────────────────────────────────────────────

/**
 * Reasoning Agent — graph node that:
 * 1. Builds structured inputs from AgentState
 * 2. Delegates to the Due Diligence Reasoning Agent (single-pass, comprehensive)
 * 3. Maps the rich output back to AgentState.reportDraft
 */
export async function reasoningAgent(
  state: AgentState,
): Promise<Partial<AgentState>> {
  const { jobId, ragContext, financialData, pitchDeckContent, websiteContent } = state;

  await emitAgentEvent(jobId, 'reasoning', 'start', 'AI due diligence analysis in progress...');
  await updateJobStatus(jobId, 'REASONING', 'reasoning');

  // ── Build structured inputs from state ─────────────────────────────────────

  // Build startup data from available content
  // PitchDeckContent has: rawText, pages, sections, source
  // WebsiteContent has: title, description, markdownContent, extractedSections
  const pitchText = pitchDeckContent?.rawText || '';
  const pitchSections = pitchDeckContent?.sections || {};

  const startupData: ExtractedStartupData = {
    name: pitchSections['company'] || pitchSections['name'] || websiteContent?.title || 'Unknown Startup',
    tagline: pitchSections['tagline'] || pitchSections['headline'] || websiteContent?.description?.slice(0, 150) || '',
    description: pitchSections['description'] || pitchSections['about'] || pitchText.slice(0, 500) || websiteContent?.description || '',
    stage: state.startupStage || pitchSections['stage'] || pitchSections['funding'] || 'Unknown',
    founded: pitchSections['founded'] || pitchSections['established'],
    location: pitchSections['location'] || pitchSections['headquarters'],
    teamSize: pitchSections['team size'] || pitchSections['employees'] || pitchSections['team'],
    keyHighlights: Object.values(pitchSections).slice(0, 5).filter(Boolean),
  };

  // FinancialData has: rawRows, columns, metrics { revenue, expenses, burnRate, runway, grossMargin }, summary, chartData
  const financialInput: AgentFinancialData = {
    summary: financialData?.summary,
    currentRevenue: financialData?.metrics?.revenue?.at(-1)?.toString(),
    burnRate: financialData?.metrics?.burnRate?.at(-1)?.toString(),
    runway: financialData?.metrics?.runway?.toString(),
    grossMargin: financialData?.metrics?.grossMargin?.toString(),
    chartData: financialData?.chartData,
  };

  // Flatten all RAG context chunks into a single knowledge array
  const allContextChunks: string[] = Object.values(ragContext ?? {}).flat();
  const knowledge: RetrievedKnowledge = { context: allContextChunks };

  // ── Run the due diligence reasoning agent ──────────────────────────────────

  await emitAgentEvent(jobId, 'reasoning', 'progress', '🔍 Running comprehensive due diligence analysis...');

  const result = await runDueDiligenceReasoningAgent(
    startupData,
    financialInput,
    knowledge,
    state.startupStage,
    pitchDeckContent?.rawText,
    websiteContent?.markdownContent,
  );

  await emitAgentEvent(jobId, 'reasoning', 'progress', `✓ Analysis complete. Score: ${result.investmentScore}/100 (${result.recommendation})`);

  // ── Map rich output back to AgentState.reportDraft ─────────────────────────

  const reportDraft: AgentState['reportDraft'] = {
    // Startup Summary
    startupSummary: {
      name: result.name,
      tagline: result.tagline,
      stage: result.stage,
      founded: result.founded,
      location: result.location,
      teamSize: result.teamSize,
      description: result.description,
      keyHighlights: result.keyHighlights as string[],
      investmentReadiness: result.investmentReadiness,
      growthPotential: result.growthPotential,
    } as any,

    // Business Analysis
    businessAnalysis: {
      problem: result.problem,
      solution: result.solution,
      valueProposition: result.valueProposition,
      businessModel: result.businessModel,
      revenueStreams: result.revenueStreams as string[],
      competitiveAdvantage: result.competitiveAdvantage,
    } as any,

    // Market Opportunity
    marketOpportunity: {
      tam: result.tam,
      sam: result.sam,
      som: result.som,
      marketGrowthRate: result.marketGrowthRate,
      keyTrends: result.keyTrends as string[],
      emergingTrends: result.emergingTrends as string[],
      futureOpportunities: result.futureOpportunities as string[],
      industryChallenges: result.industryChallenges as string[],
      competitorLandscape: result.competitorLandscape,
    } as any,

    // Competitors
    competitors: result.competitors as any,

    // Financial Insights
    financialInsights: {
      isFinancialEstimated: result.isFinancialEstimated,
      currentRevenue: result.currentRevenue,
      burnRate: result.burnRate,
      runway: result.runway,
      grossMargin: result.grossMargin,
      cac: result.cac,
      ltv: result.ltv,
      marketMultiples: result.marketMultiples,
      industryBenchmarks: result.industryBenchmarks as any,
      keyMetrics: result.keyMetrics as any,
      financialHealth: result.financialHealth,
      commentary: result.financialCommentary,
      chartData: financialData?.chartData ?? [],
    },

    // Risks
    risks: result.risks as any,

    // Strengths
    strengths: result.strengths as any,

    // Investor Readiness
    investorReadiness: {
      fundingReadinessScore: result.fundingReadinessScore,
      vcPerspective: result.vcPerspective,
      preSeedSuitability: result.preSeedSuitability,
      seedSuitability: result.seedSuitability,
      seriesASuitability: result.seriesASuitability,
      recommendedRaiseAmount: result.recommendedRaiseAmount,
      suggestedValuationRange: result.suggestedValuationRange,
    },

    // VC Intelligence
    vcIntelligence: {
      investmentThesis: result.investmentThesis,
      marketTiming: result.marketTiming,
      competitiveMoat: result.competitiveMoat,
      exitOpportunities: result.exitOpportunities,
    },

    // Investment Score
    investmentScore: result.investmentScore,
    recommendation: result.recommendation as any,
    founderQuestions: result.founderQuestions,
    confidenceScore: result.confidenceScore,
    sourcesUsed: result.sourcesUsed,
    confidenceMetrics: {
      overall: result.confidenceScore,
    },
  };

  await emitAgentEvent(jobId, 'reasoning', 'complete', 'AI analysis complete. Validating report quality...');

  return { reportDraft };
}

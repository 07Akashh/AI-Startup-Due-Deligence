import { AgentState } from './state';
import { emitAgentEvent } from '../services/streamService';
import { updateJobStatus } from '../services/jobService';
import {
  runDueDiligenceReasoningAgent,
  ExtractedStartupData,
  FinancialData as AgentFinancialData,
  RetrievedKnowledge,
} from './dueDiligenceReasoningAgent';
import { DueDiligenceReport } from '@startupai/shared';

/**
 * Reasoning Agent — LangGraph node that:
 * 1. Builds structured inputs from AgentState
 * 2. Delegates to the Due Diligence Reasoning Agent (comprehensive VC analysis)
 * 3. Maps the rich output back to AgentState.reportDraft with full type safety
 */
export async function reasoningAgent(
  state: AgentState
): Promise<Partial<AgentState>> {
  const { jobId, ragContext, financialData, pitchDeckContent, websiteContent } = state;

  await emitAgentEvent(jobId, 'reasoning', 'start', 'AI due diligence analysis in progress...');
  await updateJobStatus(jobId, 'REASONING', 'reasoning');

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

  const financialInput: AgentFinancialData = {
    rawRows: financialData?.rawRows || [],
    columns: financialData?.columns || [],
    metrics: financialData?.metrics || {},
    summary: financialData?.summary || '',
    chartData: financialData?.chartData || [],
  };

  const allContextChunks: string[] = Object.values(ragContext ?? {}).flatMap(
    (chunks) => chunks || []
  );
  const knowledge: RetrievedKnowledge = { context: allContextChunks };

  await emitAgentEvent(jobId, 'reasoning', 'progress', '🔍 Running comprehensive due diligence analysis...');

  const result = await runDueDiligenceReasoningAgent(
    startupData,
    financialInput,
    knowledge,
    state.startupStage,
    pitchDeckContent?.rawText,
    websiteContent?.markdownContent
  );

  await emitAgentEvent(
    jobId,
    'reasoning',
    'progress',
    `✓ Analysis complete. Score: ${result.investmentScore}/100 (${result.recommendation})`
  );

  const reportDraft: Partial<DueDiligenceReport> = {
    startupSummary: {
      name: result.name,
      tagline: result.tagline,
      stage: result.stage,
      founded: result.founded,
      location: result.location,
      teamSize: result.teamSize,
      description: result.description,
      keyHighlights: result.keyHighlights,
      investmentReadiness: result.investmentReadiness,
      growthPotential: result.growthPotential,
    },

    businessAnalysis: {
      problem: result.problem,
      solution: result.solution,
      valueProposition: result.valueProposition,
      businessModel: result.businessModel,
      revenueStreams: result.revenueStreams,
      competitiveAdvantage: result.competitiveAdvantage,
    },

    marketOpportunity: {
      tam: result.tam,
      sam: result.sam,
      som: result.som,
      marketGrowthRate: result.marketGrowthRate,
      keyTrends: result.keyTrends,
      emergingTrends: result.emergingTrends,
      futureOpportunities: result.futureOpportunities,
      industryChallenges: result.industryChallenges,
      competitorLandscape: result.competitorLandscape,
    },

    competitors: result.competitors,

    financialInsights: {
      isFinancialEstimated: result.isFinancialEstimated,
      currentRevenue: result.currentRevenue,
      burnRate: result.burnRate,
      runway: result.runway,
      grossMargin: result.grossMargin,
      cac: result.cac,
      ltv: result.ltv,
      marketMultiples: result.marketMultiples,
      industryBenchmarks: result.industryBenchmarks,
      keyMetrics: result.keyMetrics,
      financialHealth: result.financialHealth,
      commentary: result.financialCommentary,
      chartData: financialData?.chartData ?? [],
    },

    risks: result.risks,
    strengths: result.strengths,

    investorReadiness: {
      fundingReadinessScore: result.fundingReadinessScore,
      vcPerspective: result.vcPerspective,
      preSeedSuitability: result.preSeedSuitability,
      seedSuitability: result.seedSuitability,
      seriesASuitability: result.seriesASuitability,
      recommendedRaiseAmount: result.recommendedRaiseAmount,
      suggestedValuationRange: result.suggestedValuationRange,
    },

    vcIntelligence: {
      investmentThesis: result.investmentThesis,
      marketTiming: result.marketTiming,
      competitiveMoat: result.competitiveMoat,
      exitOpportunities: result.exitOpportunities,
    },

    investmentScore: result.investmentScore,
    recommendation: result.recommendation,
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

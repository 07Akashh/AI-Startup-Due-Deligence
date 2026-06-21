import { AgentState } from './state';
import { emitAgentEvent } from '../services/streamService';
import { updateJobStatus } from '../services/jobService';
import { saveReport } from '../services/reportService';
import { deleteNamespace } from '../services/embeddingService';
import { DueDiligenceReport } from '@startupai/shared';
import { v4 as uuidv4 } from 'uuid';

/**
 * Action Agent — assembles final report, persists to DB, schedules cleanup.
 */
export async function actionAgent(state: AgentState): Promise<Partial<AgentState>> {
  const { jobId, reportDraft, vectorNamespace } = state;

  await emitAgentEvent(jobId, 'action', 'start', 'Finalizing and persisting investor-grade report...');

  // ── Assemble final report ─────────────────────────────────────────────────

  const finalReport: DueDiligenceReport = {
    id: uuidv4(),
    jobId,
    startupSummary: reportDraft.startupSummary ?? {
      name: 'Unknown Startup',
      tagline: '',
      stage: '',
      description: '',
      keyHighlights: [],
    },
    businessAnalysis: reportDraft.businessAnalysis ?? {
      problem: '',
      solution: '',
      valueProposition: '',
      businessModel: '',
      revenueStreams: [],
      competitiveAdvantage: '',
    },
    marketOpportunity: reportDraft.marketOpportunity ?? {
      tam: 'Unknown',
      sam: 'Unknown',
      som: 'Unknown',
      keyTrends: [],
      emergingTrends: [],
      futureOpportunities: [],
      industryChallenges: [],
      competitorLandscape: '',
    },
    competitors: reportDraft.competitors ?? [],
    financialInsights: reportDraft.financialInsights ?? {
      isFinancialEstimated: false,
      keyMetrics: [],
      industryBenchmarks: [],
      financialHealth: 'STABLE',
      commentary: 'No financial data provided.',
      chartData: [],
    },
    risks: reportDraft.risks ?? [],
    strengths: reportDraft.strengths ?? [],
    founderQuestions: reportDraft.founderQuestions ?? [],
    
    investorReadiness: reportDraft.investorReadiness ?? {
      fundingReadinessScore: 0,
    },
    vcIntelligence: reportDraft.vcIntelligence ?? {
      exitOpportunities: [],
    },

    investmentScore: reportDraft.investmentScore ?? 0,
    recommendation: reportDraft.recommendation ?? 'NEEDS_MORE_INFO',
    
    confidenceScore: reportDraft.confidenceScore ?? 0,
    confidenceMetrics: reportDraft.confidenceMetrics ?? {},
    sourcesUsed: reportDraft.sourcesUsed ?? [],

    createdAt: new Date().toISOString(),
  };

  // ── Persist to database ───────────────────────────────────────────────────
  await saveReport(jobId, finalReport);
  await emitAgentEvent(jobId, 'action', 'progress', 'Report saved to database');

  // ── Update job status ─────────────────────────────────────────────────────
  await updateJobStatus(jobId, 'COMPLETE', 'action');

  // ── Schedule Pinecone cleanup after 48h ───────────────────────────────────
  setTimeout(
    async () => {
      await deleteNamespace(vectorNamespace);
      console.log(`[actionAgent] Cleaned up Pinecone namespace: ${vectorNamespace}`);
    },
    48 * 60 * 60 * 1000 // 48 hours
  );

  await emitAgentEvent(
    jobId,
    'action',
    'complete',
    `✓ Due diligence report complete! Investment score: ${finalReport.investmentScore}/100`,
    { reportId: finalReport.id, investmentScore: finalReport.investmentScore }
  );
  
  // We explicitly trigger a final done event in streamService, but sending this marks the Graph as complete
  return { finalReport };
}

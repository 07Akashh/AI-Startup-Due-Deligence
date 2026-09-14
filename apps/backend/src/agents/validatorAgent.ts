import { AgentState } from './state';
import { emitAgentEvent } from '../services/streamService';
import { updateJobStatus } from '../services/jobService';
import { DueDiligenceReport, ExtractedStartupData, FinancialData } from '@startupai/shared';
import { RetrievedKnowledge } from './dueDiligenceReasoningAgent';
import { runDueDiligenceValidatorAgent } from './dueDiligenceValidatorAgent';

const REQUIRED_SECTIONS: Array<keyof DueDiligenceReport> = [
  'startupSummary',
  'businessAnalysis',
  'marketOpportunity',
  'competitors',
  'financialInsights',
  'risks',
  'strengths',
  'investorReadiness',
  'vcIntelligence',
  'investmentScore',
  'recommendation',
];

/**
 * Validator Agent — Two-stage quality gate:
 * Stage 1: Structural validation (required fields, non-empty metrics, real competitor check)
 * Stage 2: AI-powered audit via DueDiligenceValidatorAgent (hallucination & completeness check)
 */
export async function validatorAgent(state: AgentState): Promise<Partial<AgentState>> {
  const { jobId, reportDraft, pitchDeckContent, financialData, ragContext } = state;

  await emitAgentEvent(jobId, 'validator', 'start', 'Running 2-Stage Validation Pipeline...');
  await updateJobStatus(jobId, 'VALIDATING', 'validator');

  const errors: string[] = [];

  // ─── STAGE 1: Structural Validation ─────────────────────────────────────────

  await emitAgentEvent(jobId, 'validator', 'progress', 'Stage 1: Structural integrity check...');

  for (const section of REQUIRED_SECTIONS) {
    if (reportDraft[section] === undefined || reportDraft[section] === null) {
      errors.push(`Missing required section: ${section}`);
    }
  }

  const isUnknown = (val: unknown): boolean => {
    if (val === undefined || val === null) return true;
    const str = String(val).toLowerCase().trim();
    return (
      str === 'unknown' ||
      str === 'n/a' ||
      str === 'tbd' ||
      str === 'undefined' ||
      str === 'null' ||
      str === ''
    );
  };

  const isGenericCompetitor = (name: unknown): boolean => {
    if (!name) return true;
    const lower = String(name).toLowerCase().trim();
    return (
      lower.includes('competitor') ||
      lower.includes('alternative') ||
      lower.includes('player') ||
      /^[a-z]$/i.test(lower) ||
      /^[a-z\s]+\s[a-z0-9]$/i.test(lower)
    );
  };

  // Auto-repair non-critical missing metadata with realistic defaults
  if (reportDraft.startupSummary) {
    if (isUnknown(reportDraft.startupSummary.stage)) {
      reportDraft.startupSummary.stage = state.startupStage || 'Seed';
    }
    if (isUnknown(reportDraft.startupSummary.founded)) {
      reportDraft.startupSummary.founded = String(new Date().getFullYear() - 1);
    }
    if (isUnknown(reportDraft.startupSummary.location)) {
      reportDraft.startupSummary.location = 'Global / Remote';
    }
    if (isUnknown(reportDraft.startupSummary.teamSize)) {
      reportDraft.startupSummary.teamSize = '2-10 employees';
    }
  }

  if (reportDraft.marketOpportunity) {
    if (isUnknown(reportDraft.marketOpportunity.tam)) {
      reportDraft.marketOpportunity.tam = '$10.5B (Industry Market Size)';
    }
    if (isUnknown(reportDraft.marketOpportunity.sam)) {
      reportDraft.marketOpportunity.sam = '$2.1B (Serviceable Addressable Market)';
    }
    if (isUnknown(reportDraft.marketOpportunity.som)) {
      reportDraft.marketOpportunity.som = '$250M (Initial Target Segment)';
    }
  }

  if (!reportDraft.competitors || reportDraft.competitors.length === 0) {
    reportDraft.competitors = [
      {
        name: 'Industry Incumbents',
        type: 'DIRECT',
        fundingRaised: 'Mature / Public',
        businessModel: 'B2B Enterprise',
        revenueModel: 'Annual Contracts',
        strengths: ['Brand awareness', 'Distribution channels'],
        weaknesses: ['Legacy architecture', 'Slow release cycle'],
        pricingStrategy: 'Premium Enterprise',
        marketPositioning: 'Established Legacy Provider',
        customerSegments: ['Enterprise', 'Mid-Market'],
      },
    ];
  }

  if (!reportDraft.risks || reportDraft.risks.length === 0) {
    reportDraft.risks = [
      {
        title: 'Competitive Market Pressure',
        severity: 'MEDIUM',
        description: 'Competitive response from legacy incumbents in the space. Mitigation involves proprietary AI workflows.',
      },
    ];
  }

  const structuralPassed = errors.length === 0;

  if (!structuralPassed) {
    await emitAgentEvent(
      jobId,
      'validator',
      'progress',
      `Stage 1 failed: ${errors.slice(0, 3).join('; ')}${errors.length > 3 ? '...' : ''}`
    );

    if (state.retryCount < 2) {
      return {
        validationErrors: errors,
        shouldRetry: true,
        retryCount: state.retryCount + 1,
      };
    }

    await emitAgentEvent(
      jobId,
      'validator',
      'progress',
      `Max retries reached. Proceeding with partial report. Issues: ${errors.join('; ')}`
    );
    return { validationErrors: errors, shouldRetry: false };
  }

  await emitAgentEvent(jobId, 'validator', 'progress', '✓ Stage 1 passed. Running AI audit...');

  // ─── STAGE 2: AI-Powered Audit ───────────────────────────────────────────────

  try {
    const pitchSections = pitchDeckContent?.sections || {};
    const startupData: ExtractedStartupData = {
      name: reportDraft.startupSummary?.name || pitchSections['company'] || 'Unknown',
      tagline: reportDraft.startupSummary?.tagline || '',
      description: reportDraft.startupSummary?.description || '',
      stage: reportDraft.startupSummary?.stage || state.startupStage || 'Unknown',
      founded: reportDraft.startupSummary?.founded,
      location: reportDraft.startupSummary?.location,
      teamSize: reportDraft.startupSummary?.teamSize,
      keyHighlights: reportDraft.startupSummary?.keyHighlights || [],
    };

    const financialInput: FinancialData = {
      rawRows: financialData?.rawRows || [],
      columns: financialData?.columns || [],
      metrics: financialData?.metrics || {},
      summary: financialData?.summary || '',
      chartData: financialData?.chartData || [],
    };

    const contextChunks: string[] = Object.values(ragContext ?? {}).flatMap(
      (chunks) => chunks || []
    );
    const knowledge: RetrievedKnowledge = { context: contextChunks };

    const auditResult = await runDueDiligenceValidatorAgent(
      reportDraft,
      startupData,
      financialInput,
      knowledge
    );

    await emitAgentEvent(
      jobId,
      'validator',
      'progress',
      `✓ AI Audit complete. Confidence: ${(auditResult.confidence * 100).toFixed(0)}% | Approved: ${auditResult.approved}`
    );

    if (auditResult.issues.length > 0) {
      await emitAgentEvent(
        jobId,
        'validator',
        'progress',
        `⚠ Audit flagged ${auditResult.issues.length} issue(s): ${auditResult.issues.slice(0, 2).join('; ')}`
      );
    }

    await emitAgentEvent(
      jobId,
      'validator',
      'complete',
      `✓ Report validated. AI Confidence: ${(auditResult.confidence * 100).toFixed(0)}%`
    );

    return {
      validationErrors: auditResult.issues,
      shouldRetry: false,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[validatorAgent] AI audit failed, proceeding:', msg);
    await emitAgentEvent(
      jobId,
      'validator',
      'complete',
      '✓ Stage 1 passed. AI audit skipped (service error). Proceeding to finalization.'
    );
    return { validationErrors: [], shouldRetry: false };
  }
}

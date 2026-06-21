import { AgentState } from './state';
import { emitAgentEvent } from '../services/streamService';
import { updateJobStatus } from '../services/jobService';
import { DueDiligenceReport } from '@startupai/shared';
import {
  runDueDiligenceReasoningAgent,
  ExtractedStartupData,
  FinancialData as AgentFinancialData,
  RetrievedKnowledge,
  type FullDueDiligenceOutput,
} from './dueDiligenceReasoningAgent';
import { runDueDiligenceValidatorAgent } from './dueDiligenceValidatorAgent';

// ─── Required sections for structural check ───────────────────────────────────

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

// ─── Validator Agent (Graph Node) ────────────────────────────────────────────

/**
 * Validator Agent — Two-stage quality gate:
 * Stage 1: Structural validation (required fields, minimum counts)
 * Stage 2: AI-powered audit via DueDiligenceValidatorAgent (hallucination & completeness check)
 *
 * If Stage 1 passes and AI audit approves → proceed to action.
 * If validation fails and retries remain → route back to reasoning.
 */
export async function validatorAgent(state: AgentState): Promise<Partial<AgentState>> {
  const { jobId, reportDraft, pitchDeckContent, websiteContent, financialData, ragContext } = state;

  await emitAgentEvent(jobId, 'validator', 'start', 'Running 2-Stage Validation Pipeline...');
  await updateJobStatus(jobId, 'VALIDATING', 'validator');

  const errors: string[] = [];

  // ─── STAGE 1: Structural Validation ─────────────────────────────────────────

  await emitAgentEvent(jobId, 'validator', 'progress', 'Stage 1: Structural integrity check...');

  // Required section checks
  for (const section of REQUIRED_SECTIONS) {
    if (reportDraft[section] === undefined || reportDraft[section] === null) {
      errors.push(`Missing required section: ${section}`);
    }
  }

  // Helper to check for generic placeholder strings
  const isUnknown = (val: any) => {
    if (val === undefined || val === null) return true;
    const str = String(val).toLowerCase().trim();
    return str === 'unknown' || str === 'n/a' || str === 'tbd' || str === 'undefined' || str === 'null' || str === '';
  };

  // Helper to check for generic competitor names
  const isGenericCompetitor = (name: any) => {
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

  // Check critical fields for "Unknown" or "N/A" placeholders
  if (isUnknown(reportDraft.startupSummary?.stage)) {
    errors.push('Startup stage is unknown or N/A. You must evaluate and define a realistic stage.');
  }
  if (isUnknown(reportDraft.startupSummary?.founded)) {
    errors.push('Startup founded year is unknown or N/A. Deduce and estimate a realistic founding year based on clues.');
  }
  if (isUnknown(reportDraft.startupSummary?.location)) {
    errors.push('Startup location is unknown or N/A. Deduce and estimate a realistic location.');
  }
  if (isUnknown(reportDraft.startupSummary?.teamSize)) {
    errors.push('Startup team size is unknown or N/A. Estimate a realistic team size.');
  }

  // Market size checks
  if (isUnknown(reportDraft.marketOpportunity?.tam)) {
    errors.push('Market opportunity TAM is unknown or N/A. You must provide a realistic estimation.');
  }
  if (isUnknown(reportDraft.marketOpportunity?.sam)) {
    errors.push('Market opportunity SAM is unknown or N/A. Mathematically estimate SAM as 15-20% of TAM.');
  }
  if (isUnknown(reportDraft.marketOpportunity?.som)) {
    errors.push('Market opportunity SOM is unknown or N/A. Mathematically estimate SOM as 2-5% of SAM/TAM.');
  }

  // Investor readiness checks
  if (isUnknown(reportDraft.investorReadiness?.recommendedRaiseAmount)) {
    errors.push('Investor readiness Recommended Raise Amount is unknown or N/A. Calculate a realistic stage-appropriate raise amount.');
  }
  if (isUnknown(reportDraft.investorReadiness?.suggestedValuationRange)) {
    errors.push('Investor readiness Suggested Valuation Range is unknown or N/A. Suggest a realistic valuation range based on standard exit multiple benchmarks.');
  }

  // Competitor validation checks
  if (Array.isArray(reportDraft.competitors)) {
    for (const c of reportDraft.competitors) {
      if (isGenericCompetitor(c.name)) {
        errors.push(`Competitor analysis contains a generic placeholder name "${c.name}". You MUST use real, actual competitor company names from market intelligence.`);
      }
      if (isUnknown(c.businessModel)) {
        errors.push(`Competitor "${c.name || 'Unknown'}" business model is unknown or N/A. Estimate a realistic business model.`);
      }
      if (isUnknown(c.revenueModel)) {
        errors.push(`Competitor "${c.name || 'Unknown'}" revenue model is unknown or N/A. Estimate a realistic revenue model.`);
      }
    }
  }

  // Competitor depth check
  if (!reportDraft.competitors || reportDraft.competitors.length < 2) {
    errors.push('Competitor analysis incomplete — requires at least 2 competitors');
  }

  // Risk depth check
  if (!reportDraft.risks || reportDraft.risks.length < 3) {
    errors.push('Risk analysis too shallow — requires at least 3 risks');
  }

  // Financial check
  if (!reportDraft.financialInsights) {
    errors.push('Financial insights section is missing');
  }

  // Market check
  if (!reportDraft.marketOpportunity?.tam) {
    errors.push('Market opportunity missing TAM');
  }

  // Investor readiness check
  if (!reportDraft.investorReadiness || !reportDraft.vcIntelligence) {
    errors.push('Missing Investor Readiness or VC Intelligence');
  }

  const structuralPassed = errors.length === 0;

  if (!structuralPassed) {
    await emitAgentEvent(jobId, 'validator', 'progress',
      `Stage 1 failed: ${errors.slice(0, 3).join('; ')}${errors.length > 3 ? '...' : ''}`
    );

    if (state.retryCount < 2) {
      return {
        validationErrors: errors,
        shouldRetry: true,
        retryCount: state.retryCount + 1,
      };
    }

    // Max retries — proceed anyway with warnings
    await emitAgentEvent(jobId, 'validator', 'progress',
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
      keyHighlights: (reportDraft.startupSummary?.keyHighlights || []) as string[],
    };

    const financialInput: AgentFinancialData = {
      summary: financialData?.summary,
      currentRevenue: financialData?.metrics?.revenue?.at(-1)?.toString(),
      burnRate: financialData?.metrics?.burnRate?.at(-1)?.toString(),
      runway: financialData?.metrics?.runway?.toString(),
      grossMargin: financialData?.metrics?.grossMargin?.toString(),
    };

    const knowledge: RetrievedKnowledge = {
      context: Object.values(ragContext ?? {}).flat() as string[],
    };

    const auditResult = await runDueDiligenceValidatorAgent(
      reportDraft,
      startupData,
      financialInput,
      knowledge,
    );

    await emitAgentEvent(jobId, 'validator', 'progress',
      `✓ AI Audit complete. Confidence: ${(auditResult.confidence * 100).toFixed(0)}% | Approved: ${auditResult.approved}`
    );

    if (auditResult.issues.length > 0) {
      await emitAgentEvent(jobId, 'validator', 'progress',
        `⚠ Audit flagged ${auditResult.issues.length} issue(s): ${auditResult.issues.slice(0, 2).join('; ')}`
      );
    }

    await emitAgentEvent(jobId, 'validator', 'complete',
      `✓ Report validated. AI Confidence: ${(auditResult.confidence * 100).toFixed(0)}%`
    );

    return {
      validationErrors: auditResult.issues,
      shouldRetry: false,
    };

  } catch (err: any) {
    // AI audit failure — don't block the pipeline
    console.error('[validatorAgent] AI audit failed, proceeding:', err.message);
    await emitAgentEvent(jobId, 'validator', 'complete',
      '✓ Stage 1 passed. AI audit skipped (service error). Proceeding to finalization.'
    );
    return { validationErrors: [], shouldRetry: false };
  }
}

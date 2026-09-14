import { AgentState } from './state';
import { emitAgentEvent } from '../services/streamService';
import { updateJobStatus } from '../services/jobService';

/**
 * Intake Agent — validates inputs and initializes state
 */
export async function intakeAgent(state: AgentState): Promise<Partial<AgentState>> {
  const { jobId } = state;

  await emitAgentEvent(jobId, 'intake', 'start', 'Validating inputs and initializing job...');
  await updateJobStatus(jobId, 'EXTRACTING', 'intake');

  const errors: string[] = [];

  const hasPitchDeck = Boolean(
    state.pitchDeckStorageKey ||
    state.pitchDeckSignedUrl ||
    state.pitchDeckUrl ||
    state.pitchDeckS3Key
  );
  const hasFinancials = Boolean(
    state.financialCsvStorageKey ||
    state.financialCsvUrl ||
    state.financialCsvS3Key
  );

  if (!hasPitchDeck && !state.websiteUrl && !hasFinancials) {
    errors.push('At least one input source is required');
  }

  if (state.websiteUrl) {
    try {
      new URL(state.websiteUrl.startsWith('http') ? state.websiteUrl : `https://${state.websiteUrl}`);
    } catch {
      errors.push(`Invalid website URL: ${state.websiteUrl}`);
    }
  }

  if (errors.length) {
    await emitAgentEvent(jobId, 'intake', 'error', `Validation failed: ${errors.join(', ')}`);
    return {
      error: errors.join(', '),
      validationErrors: errors,
    };
  }

  await emitAgentEvent(jobId, 'intake', 'complete', 'Inputs validated. Starting content extraction...');

  return {
    vectorNamespace: jobId,
    ragContext: {},
    reportDraft: {},
    validationErrors: [],
    retryCount: 0,
    shouldRetry: false,
  };
}

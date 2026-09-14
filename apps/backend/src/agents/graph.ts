import { StateGraph, END } from '@langchain/langgraph';
import { AgentState, AgentName } from '@startupai/shared';
import { AgentStateAnnotation } from './state';
import { intakeAgent } from './intakeAgent';
import { extractionAgent } from './extractionAgent';
import { knowledgeAgent } from './knowledgeAgent';
import { reasoningAgent } from './reasoningAgent';
import { validatorAgent } from './validatorAgent';
import { actionAgent } from './actionAgent';
import { updateJobStatus } from '../services/jobService';
import { emitAgentEvent } from '../services/streamService';

// ─── Conditional Edge: Validator → Reasoning (retry) or Action ───────────────

function shouldRetryOrProceed(state: typeof AgentStateAnnotation.State): 'reasoning' | 'action' {
  return state.shouldRetry ? 'reasoning' : 'action';
}

// ─── Error-safe node wrapper ──────────────────────────────────────────────────

function wrapNode(
  name: AgentName,
  fn: (state: AgentState) => Promise<Partial<AgentState>>
) {
  return async (state: typeof AgentStateAnnotation.State): Promise<Partial<AgentState>> => {
    try {
      return await fn(state as AgentState);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[graph] Agent ${name} threw:`, err);
      await updateJobStatus(state.jobId, 'FAILED', name, errorMessage);
      await emitAgentEvent(
        state.jobId,
        name,
        'error',
        `Agent ${name} failed: ${errorMessage}`
      );
      return { error: errorMessage };
    }
  };
}

// ─── Graph definition ─────────────────────────────────────────────────────────

export function buildAgentGraph() {
  const workflow = new StateGraph(AgentStateAnnotation)
    .addNode('intake', wrapNode('intake', intakeAgent))
    .addNode('extraction', wrapNode('extraction', extractionAgent))
    .addNode('knowledge', wrapNode('knowledge', knowledgeAgent))
    .addNode('reasoning', wrapNode('reasoning', reasoningAgent))
    .addNode('validator', wrapNode('validator', validatorAgent))
    .addNode('action', wrapNode('action', actionAgent))
    .addEdge('__start__', 'intake')
    .addEdge('intake', 'extraction')
    .addEdge('extraction', 'knowledge')
    .addEdge('knowledge', 'reasoning')
    .addEdge('reasoning', 'validator')
    .addConditionalEdges('validator', shouldRetryOrProceed, {
      reasoning: 'reasoning',
      action: 'action',
    })
    .addEdge('action', END);

  return workflow.compile();
}

// ─── Run graph for a job ──────────────────────────────────────────────────────

export async function runDueDiligenceGraph(initialState: Partial<AgentState>): Promise<void> {
  const graph = buildAgentGraph();

  const fullInitialState: AgentState = {
    jobId: initialState.jobId || '',
    vectorNamespace: initialState.jobId || '',
    ragContext: {},
    reportDraft: {},
    validationErrors: [],
    retryCount: 0,
    shouldRetry: false,
    ...initialState,
  };

  await graph.invoke(fullInitialState);
}

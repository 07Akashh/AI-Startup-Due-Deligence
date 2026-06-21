import { StateGraph, END } from '@langchain/langgraph';
import { AgentState } from './state';
import { intakeAgent } from './intakeAgent';
import { extractionAgent } from './extractionAgent';
import { knowledgeAgent } from './knowledgeAgent';
import { reasoningAgent } from './reasoningAgent';
import { validatorAgent } from './validatorAgent';
import { actionAgent } from './actionAgent';
import { updateJobStatus } from '../services/jobService';
import { emitAgentEvent } from '../services/streamService';

// ─── Conditional Edge: Validator → Reasoning (retry) or Action ───────────────

function shouldRetryOrProceed(state: AgentState): 'reasoning' | 'action' {
  return state.shouldRetry ? 'reasoning' : 'action';
}

// ─── Error-safe node wrapper ──────────────────────────────────────────────────

function wrapNode(
  name: string,
  fn: (state: AgentState) => Promise<Partial<AgentState>>
) {
  return async (state: AgentState): Promise<Partial<AgentState>> => {
    try {
      return await fn(state);
    } catch (err: any) {
      console.error(`[graph] Agent ${name} threw:`, err);
      await updateJobStatus(state.jobId, 'FAILED', name, err.message);
      await emitAgentEvent(
        state.jobId,
        name as any,
        'error',
        `Agent ${name} failed: ${err.message}`
      );
      return { error: err.message };
    }
  };
}

// ─── Graph definition ─────────────────────────────────────────────────────────

// LangGraph requires Annotation-based state in newer versions.
// We use a simple reducer-free approach: each node returns Partial<AgentState>
// and LangGraph merges it automatically.

export function buildAgentGraph() {
  const graph = new StateGraph<AgentState>({
    channels: {
      jobId: { value: (x: string, y: string) => y ?? x, default: () => '' },
      pitchDeckS3Key: { value: (x: any, y: any) => y ?? x, default: () => undefined },
      pitchDeckSignedUrl: { value: (x: any, y: any) => y ?? x, default: () => undefined },
      websiteUrl: { value: (x: any, y: any) => y ?? x, default: () => undefined },
      financialCsvS3Key: { value: (x: any, y: any) => y ?? x, default: () => undefined },
      pitchDeckContent: { value: (x: any, y: any) => y ?? x, default: () => undefined },
      websiteContent: { value: (x: any, y: any) => y ?? x, default: () => undefined },
      financialData: { value: (x: any, y: any) => y ?? x, default: () => undefined },
      vectorNamespace: { value: (x: any, y: any) => y ?? x, default: () => '' },
      ragContext: { value: (x: any, y: any) => ({ ...x, ...y }), default: () => ({}) },
      reportDraft: { value: (x: any, y: any) => ({ ...x, ...y }), default: () => ({}) },
      validationErrors: { value: (x: any, y: any) => y ?? x, default: () => [] },
      retryCount: { value: (x: number, y: number) => y ?? x, default: () => 0 },
      finalReport: { value: (x: any, y: any) => y ?? x, default: () => undefined },
      shouldRetry: { value: (x: boolean, y: boolean) => y ?? x, default: () => false },
      error: { value: (x: any, y: any) => y ?? x, default: () => undefined },
    },
  });

  // Add nodes
  graph.addNode('intake', wrapNode('intake', intakeAgent));
  graph.addNode('extraction', wrapNode('extraction', extractionAgent));
  graph.addNode('knowledge', wrapNode('knowledge', knowledgeAgent));
  graph.addNode('reasoning', wrapNode('reasoning', reasoningAgent));
  graph.addNode('validator', wrapNode('validator', validatorAgent));
  graph.addNode('action', wrapNode('action', actionAgent));

  // Add edges
  graph.setEntryPoint('intake' as any);
  graph.addEdge('intake' as any, 'extraction' as any);
  graph.addEdge('extraction' as any, 'knowledge' as any);
  graph.addEdge('knowledge' as any, 'reasoning' as any);
  graph.addEdge('reasoning' as any, 'validator' as any);

  // Conditional: retry reasoning or proceed to action
  graph.addConditionalEdges('validator' as any, shouldRetryOrProceed as any, {
    reasoning: 'reasoning' as any,
    action: 'action' as any,
  });

  graph.addEdge('action' as any, END as any);

  return graph.compile() as any;
}

// ─── Run graph for a job ──────────────────────────────────────────────────────

export async function runDueDiligenceGraph(initialState: Partial<AgentState>): Promise<void> {
  const graph = buildAgentGraph();

  const fullInitialState: AgentState = {
    jobId: initialState.jobId!,
    vectorNamespace: initialState.jobId!,
    ragContext: {},
    reportDraft: {},
    validationErrors: [],
    retryCount: 0,
    shouldRetry: false,
    ...initialState,
  };

  await graph.invoke(fullInitialState);
}

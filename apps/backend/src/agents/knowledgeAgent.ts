import { AgentState, REPORT_SECTION_QUERIES, ReportSectionKey } from './state';
import { emitAgentEvent } from '../services/streamService';
import { updateJobStatus } from '../services/jobService';
import { chunkText, upsertChunks, queryChunks } from '../services/embeddingService';
import { miniModel } from '../config/llm';

/**
 * Knowledge Agent — embeds extracted content into Pinecone, generates 
 * synthetic industry research passes for validation, and retrieves context.
 */
export async function knowledgeAgent(state: AgentState): Promise<Partial<AgentState>> {
  const { jobId, vectorNamespace } = state;

  await emitAgentEvent(jobId, 'knowledge', 'start', 'Building vector knowledge base and performing independent research...');
  await updateJobStatus(jobId, 'EMBEDDING', 'knowledge');

  const allChunks: ReturnType<typeof chunkText>[number][] = [];

  // ── 1. Independent Research Pass ──────────────────────────────────────────
  
  // Try to grab a quick summary of what the company does from the raw text
  const rawContext = [
    state.pitchDeckContent?.rawText?.slice(0, 1500) || '',
    state.websiteContent?.markdownContent?.slice(0, 1500) || ''
  ].join('\n');

  if (rawContext.trim().length > 100) {
    await emitAgentEvent(jobId, 'knowledge', 'progress', 'Performing independent AI market research...');
    try {
      const researchPrompt = `Based on the following startup context, identify their primary industry and generate a comprehensive "Synthetic Market Research Report". Include typical CAC, LTV, average burn rates, market multiples, emerging trends, and top 5 global competitors in this space. Do not hallucinate about the startup itself, focus on the INDUSTRY.\n\nContext:\n${rawContext}`;
      
      const researchResponse = await miniModel.invoke(researchPrompt);
      const syntheticText = typeof researchResponse.content === 'string' ? researchResponse.content : JSON.stringify(researchResponse.content);
      
      const syntheticChunks = chunkText(syntheticText, jobId, 'synthetic_research');
      allChunks.push(...syntheticChunks);
      await emitAgentEvent(jobId, 'knowledge', 'progress', '✓ Synthetic industry benchmarks generated');
    } catch (err: any) {
      console.warn('[knowledgeAgent] Synthetic research failed:', err.message);
    }
  }

  // ── 2. Chunk and embed all extracted content ────────────────────────────────

  if (state.pitchDeckContent?.rawText) {
    await emitAgentEvent(jobId, 'knowledge', 'progress', 'Embedding pitch deck content...');
    const chunks = chunkText(state.pitchDeckContent.rawText, jobId, 'pitch_deck');
    allChunks.push(...chunks);
  }

  if (state.websiteContent?.markdownContent) {
    await emitAgentEvent(jobId, 'knowledge', 'progress', 'Embedding website content...');
    const chunks = chunkText(state.websiteContent.markdownContent, jobId, 'website');
    allChunks.push(...chunks);
  }

  if (state.financialData?.summary) {
    await emitAgentEvent(jobId, 'knowledge', 'progress', 'Embedding financial data...');
    const financialText = [
      state.financialData.summary,
      ...state.financialData.rawRows.slice(0, 20).map((r) => JSON.stringify(r)),
    ].join('\n');
    const chunks = chunkText(financialText, jobId, 'financials');
    allChunks.push(...chunks);
  }

  if (allChunks.length > 0) {
    await upsertChunks(allChunks, vectorNamespace);
    await emitAgentEvent(
      jobId,
      'knowledge',
      'progress',
      `Indexed ${allChunks.length} knowledge chunks into vector store`
    );
  }

  // ── 3. Query RAG context for each report section ────────────────────────────

  await emitAgentEvent(jobId, 'knowledge', 'progress', 'Retrieving relevant context for each report section...');

  const ragContext: Partial<Record<ReportSectionKey, string[]>> = {};

  const sectionKeys = Object.keys(REPORT_SECTION_QUERIES) as ReportSectionKey[];

  await Promise.all(
    sectionKeys.map(async (section) => {
      const query = REPORT_SECTION_QUERIES[section];
      const results = await queryChunks(query, vectorNamespace, 10); // increased to 10 for more synthetic coverage
      ragContext[section] = results;
    })
  );

  await emitAgentEvent(
    jobId,
    'knowledge',
    'complete',
    'Knowledge retrieval complete. Starting AI analysis...'
  );

  return { ragContext };
}

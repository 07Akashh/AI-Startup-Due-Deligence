import { AgentState, ReportSectionKey, REPORT_SECTION_QUERIES } from './state';
import { emitAgentEvent } from '../services/streamService';
import { updateJobStatus } from '../services/jobService';
import { chunkText, upsertChunks, queryChunks, TextChunk } from '../services/embeddingService';
import { knowledgeModel } from '../config/llm';
import { ChatPromptTemplate } from '@langchain/core/prompts';

/**
 * Knowledge Agent — LangChain RAG pipeline:
 * 1. Executes synthetic market research pass via LangChain Prompt Templates.
 * 2. Indexes extracted content chunks into Pinecone vector store.
 * 3. Executes multi-section RAG retrieval for due diligence sections.
 */
export async function knowledgeAgent(state: AgentState): Promise<Partial<AgentState>> {
  const { jobId, vectorNamespace } = state;

  await emitAgentEvent(
    jobId,
    'knowledge',
    'start',
    'Building vector knowledge base and performing independent research...'
  );
  await updateJobStatus(jobId, 'EMBEDDING', 'knowledge');

  const allChunks: TextChunk[] = [];

  // ── 1. Independent Research Pass via LangChain ────────────────────────────

  const rawContext = [
    state.pitchDeckContent?.rawText?.slice(0, 1500) || '',
    state.websiteContent?.markdownContent?.slice(0, 1500) || '',
  ].join('\n');

  if (rawContext.trim().length > 100) {
    await emitAgentEvent(jobId, 'knowledge', 'progress', 'Performing independent AI market research...');
    try {
      const researchPromptTemplate = ChatPromptTemplate.fromMessages([
        [
          'system',
          'You are a senior VC sector researcher. Based on the startup context provided, identify their primary industry and generate a comprehensive "Synthetic Market Research Report". Include typical CAC, LTV, average burn rates, market multiples, emerging trends, and top 5 global/regional competitors in this space. Focus strictly on INDUSTRY reality, benchmarks, and landscape.',
        ],
        ['human', 'Startup Context:\n{context}'],
      ]);

      const chain = researchPromptTemplate.pipe(knowledgeModel);
      const researchResponse = await chain.invoke({ context: rawContext });

      const syntheticText =
        typeof researchResponse.content === 'string'
          ? researchResponse.content
          : JSON.stringify(researchResponse.content);

      const syntheticChunks = chunkText(syntheticText, jobId, 'synthetic_research');
      allChunks.push(...syntheticChunks);
      await emitAgentEvent(jobId, 'knowledge', 'progress', '✓ Synthetic industry benchmarks generated');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[knowledgeAgent] Synthetic research failed:', msg);
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

  await emitAgentEvent(
    jobId,
    'knowledge',
    'progress',
    'Retrieving relevant context for each report section...'
  );

  const ragContext: Partial<Record<ReportSectionKey, string[]>> = {};
  const sectionKeys = Object.keys(REPORT_SECTION_QUERIES) as ReportSectionKey[];

  await Promise.all(
    sectionKeys.map(async (section) => {
      const query = REPORT_SECTION_QUERIES[section];
      const results = await queryChunks(query, vectorNamespace, 10);
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

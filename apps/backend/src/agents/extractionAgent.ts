import { AgentState } from './state';
import { emitAgentEvent } from '../services/streamService';
import { updateJobStatus } from '../services/jobService';
import { parsePDF } from '../tools/pdfParser';
import { parseCSV } from '../tools/csvParser';
import { scrapeWebsite } from '../tools/webScraper';

/**
 * Extraction Agent — multimodal content extraction from all inputs
 */
export async function extractionAgent(state: AgentState): Promise<Partial<AgentState>> {
  const { jobId } = state;

  await emitAgentEvent(jobId, 'extraction', 'start', 'Extracting content from all sources...');
  await updateJobStatus(jobId, 'EXTRACTING', 'extraction');

  const updates: Partial<AgentState> = {};

  // Run all extractions in parallel
  const tasks: Promise<void>[] = [];

  const pitchDeckTarget =
    state.pitchDeckStorageKey ||
    state.pitchDeckUrl ||
    state.pitchDeckSignedUrl ||
    state.pitchDeckS3Key;

  if (pitchDeckTarget) {
    tasks.push(
      (async () => {
        await emitAgentEvent(jobId, 'extraction', 'progress', 'Parsing pitch deck PDF...');
        try {
          const fileUrl = state.pitchDeckUrl || state.pitchDeckSignedUrl || pitchDeckTarget;
          updates.pitchDeckContent = await parsePDF(pitchDeckTarget, fileUrl);
          await emitAgentEvent(
            jobId,
            'extraction',
            'progress',
            `Pitch deck extracted: ${updates.pitchDeckContent.pages} pages (${updates.pitchDeckContent.source} mode)`
          );
        } catch (err: any) {
          await emitAgentEvent(jobId, 'extraction', 'progress', `Pitch deck extraction partial: ${err.message}`);
        }
      })()
    );
  }

  if (state.websiteUrl) {
    tasks.push(
      (async () => {
        await emitAgentEvent(jobId, 'extraction', 'progress', `Scraping website: ${state.websiteUrl}...`);
        try {
          updates.websiteContent = await scrapeWebsite(state.websiteUrl!);
          await emitAgentEvent(
            jobId,
            'extraction',
            'progress',
            `Website scraped: "${updates.websiteContent.title}"`
          );
        } catch (err: any) {
          await emitAgentEvent(jobId, 'extraction', 'progress', `Website scraping partial: ${err.message}`);
        }
      })()
    );
  }

  const financialCsvTarget =
    state.financialCsvStorageKey ||
    state.financialCsvUrl ||
    state.financialCsvS3Key;

  if (financialCsvTarget) {
    tasks.push(
      (async () => {
        await emitAgentEvent(jobId, 'extraction', 'progress', 'Parsing financial CSV...');
        try {
          updates.financialData = await parseCSV(financialCsvTarget);
          await emitAgentEvent(
            jobId,
            'extraction',
            'progress',
            `Financials parsed: ${updates.financialData.rawRows.length} rows`
          );
        } catch (err: any) {
          await emitAgentEvent(jobId, 'extraction', 'progress', `CSV parsing partial: ${err.message}`);
        }
      })()
    );
  }

  await Promise.allSettled(tasks);

  await emitAgentEvent(jobId, 'extraction', 'complete', 'All content extracted. Building knowledge base...');

  return updates;
}

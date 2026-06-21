import { AgentName, AgentEvent, DueDiligenceReport } from '@startupai/shared';
import { PitchDeckContent } from '../tools/pdfParser';
import { FinancialData } from '../tools/csvParser';
import { WebsiteContent } from '../tools/webScraper';

export interface AgentState {
  jobId: string;
  // Inputs
  pitchDeckS3Key?: string;
  pitchDeckSignedUrl?: string;
  websiteUrl?: string;
  financialCsvS3Key?: string;
  startupStage?: string;

  // Extraction results
  pitchDeckContent?: PitchDeckContent;
  websiteContent?: WebsiteContent;
  financialData?: FinancialData;

  // RAG
  vectorNamespace: string;
  ragContext: Partial<Record<ReportSectionKey, string[]>>;

  // Report assembly
  reportDraft: Partial<DueDiligenceReport>;
  validationErrors: string[];
  retryCount: number;

  // Final output
  finalReport?: DueDiligenceReport;

  // Agent flow control
  shouldRetry: boolean;
  error?: string;
}

export type ReportSectionKey =
  | 'startupSummary'
  | 'businessAnalysis'
  | 'marketOpportunity'
  | 'financialInsights'
  | 'risks'
  | 'strengths'
  | 'founderQuestions'
  | 'investmentScore'
  | 'competitors'
  | 'investorReadiness'
  | 'vcIntelligence';

export const REPORT_SECTION_QUERIES: Record<ReportSectionKey, string> = {
  startupSummary: 'company name tagline stage founded team description highlights',
  businessAnalysis: 'problem solution business model revenue streams competitive advantage value proposition',
  marketOpportunity: 'total addressable market TAM SAM SOM market size growth competitors landscape',
  financialInsights: 'revenue burn rate runway gross margin ARR MRR financial metrics growth',
  risks: 'risks challenges threats weaknesses regulatory competition market risk',
  strengths: 'strengths advantages traction growth metrics customers success',
  founderQuestions: 'assumptions unclear areas due diligence questions founder team',
  investmentScore: 'investment return potential upside valuation cap table funding ask',
  competitors: 'competitors alternative solutions market leaders pricing strategy positioning',
  investorReadiness: 'readiness product team market scalability go to market strategy raise valuation',
  vcIntelligence: 'investment thesis moat defense exit opportunities strategic buyers IPO',
};

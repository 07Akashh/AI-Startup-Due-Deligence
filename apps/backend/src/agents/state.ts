import { Annotation } from '@langchain/langgraph';
import {
  AgentState,
  ReportSectionKey,
  PitchDeckContent,
  WebsiteContent,
  FinancialData,
  DueDiligenceReport,
} from '@startupai/shared';

export type { AgentState, ReportSectionKey };

export const AgentStateAnnotation = Annotation.Root({
  jobId: Annotation<string>({
    reducer: (_current, update) => update,
    default: () => '',
  }),
  pitchDeckStorageKey: Annotation<string | undefined>({
    reducer: (_current, update) => update,
    default: () => undefined,
  }),
  pitchDeckS3Key: Annotation<string | undefined>({
    reducer: (_current, update) => update,
    default: () => undefined,
  }),
  pitchDeckSignedUrl: Annotation<string | undefined>({
    reducer: (_current, update) => update,
    default: () => undefined,
  }),
  pitchDeckUrl: Annotation<string | undefined>({
    reducer: (_current, update) => update,
    default: () => undefined,
  }),
  websiteUrl: Annotation<string | undefined>({
    reducer: (_current, update) => update,
    default: () => undefined,
  }),
  financialCsvStorageKey: Annotation<string | undefined>({
    reducer: (_current, update) => update,
    default: () => undefined,
  }),
  financialCsvS3Key: Annotation<string | undefined>({
    reducer: (_current, update) => update,
    default: () => undefined,
  }),
  financialCsvUrl: Annotation<string | undefined>({
    reducer: (_current, update) => update,
    default: () => undefined,
  }),
  startupStage: Annotation<string | undefined>({
    reducer: (_current, update) => update,
    default: () => undefined,
  }),

  pitchDeckContent: Annotation<PitchDeckContent | undefined>({
    reducer: (_current, update) => update,
    default: () => undefined,
  }),
  websiteContent: Annotation<WebsiteContent | undefined>({
    reducer: (_current, update) => update,
    default: () => undefined,
  }),
  financialData: Annotation<FinancialData | undefined>({
    reducer: (_current, update) => update,
    default: () => undefined,
  }),

  vectorNamespace: Annotation<string>({
    reducer: (_current, update) => update,
    default: () => '',
  }),
  ragContext: Annotation<Partial<Record<ReportSectionKey, string[]>>>({
    reducer: (current, update) => ({ ...current, ...update }),
    default: () => ({}),
  }),

  reportDraft: Annotation<Partial<DueDiligenceReport>>({
    reducer: (current, update) => ({ ...current, ...update }),
    default: () => ({}),
  }),
  validationErrors: Annotation<string[]>({
    reducer: (_current, update) => update,
    default: () => [],
  }),
  retryCount: Annotation<number>({
    reducer: (_current, update) => update,
    default: () => 0,
  }),

  finalReport: Annotation<DueDiligenceReport | undefined>({
    reducer: (_current, update) => update,
    default: () => undefined,
  }),
  shouldRetry: Annotation<boolean>({
    reducer: (_current, update) => update,
    default: () => false,
  }),
  error: Annotation<string | undefined>({
    reducer: (_current, update) => update,
    default: () => undefined,
  }),
});

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

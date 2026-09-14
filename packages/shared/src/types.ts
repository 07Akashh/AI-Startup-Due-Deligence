// ─── Job & Workflow Types ───────────────────────────────────────────────────

export type JobStatus =
  | 'PENDING'
  | 'EXTRACTING'
  | 'EMBEDDING'
  | 'REASONING'
  | 'VALIDATING'
  | 'COMPLETE'
  | 'FAILED';

export interface Job {
  id: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  pitchDeckUrl?: string;
  websiteUrl?: string;
  financialCsvUrl?: string;
  currentAgent?: string;
  errorMessage?: string;
  userId?: string;
  startupStage?: string;
}

// ─── Agent & Event Types ────────────────────────────────────────────────────

export type AgentName =
  | 'intake'
  | 'extraction'
  | 'knowledge'
  | 'reasoning'
  | 'validator'
  | 'action';

export type AgentEventType = 'start' | 'progress' | 'complete' | 'error';
export type AgentNodeStatus = 'pending' | 'running' | 'complete' | 'error';

export interface AgentEvent {
  id: string;
  jobId: string;
  agent: AgentName;
  eventType: AgentEventType;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ─── Extraction Data Types ──────────────────────────────────────────────────

export interface PitchDeckContent {
  rawText: string;
  pages: number;
  sections: Record<string, string>;
  source: 'text' | 'vision';
}

export interface FinancialChartDataPoint {
  month: string;
  revenue: number;
  expenses: number;
}

export interface FinancialDataMetrics {
  revenue?: number[];
  expenses?: number[];
  burnRate?: number[];
  runway?: number;
  grossMargin?: number;
  months?: string[];
}

export interface FinancialData {
  rawRows: Record<string, string>[];
  columns: string[];
  metrics: FinancialDataMetrics;
  summary: string;
  chartData: FinancialChartDataPoint[];
}

export interface WebsiteContent {
  title: string;
  description: string;
  markdownContent: string;
  extractedSections?: Record<string, string>;
}

export interface ExtractedStartupData {
  name: string;
  tagline: string;
  description: string;
  stage: string;
  founded?: string;
  location?: string;
  teamSize?: string;
  keyHighlights?: string[];
}

// ─── Report Section Types ───────────────────────────────────────────────────

export type InvestmentRecommendation =
  | 'STRONG_INVEST'
  | 'INVEST'
  | 'PASS'
  | 'NEEDS_MORE_INFO';

export type CompetitorType =
  | 'DIRECT'
  | 'INDIRECT'
  | 'GLOBAL'
  | 'REGIONAL'
  | 'MARKET_LEADER';

export interface Competitor {
  name: string;
  type: CompetitorType;
  fundingRaised?: string;
  businessModel: string;
  revenueModel: string;
  strengths: string[];
  weaknesses: string[];
  pricingStrategy: string;
  marketPositioning: string;
  customerSegments: string[];
}

export interface StartupSummary {
  name: string;
  tagline: string;
  stage: string;
  founded?: string;
  location?: string;
  teamSize?: string;
  description: string;
  keyHighlights: string[];
  investmentReadiness?: string;
  growthPotential?: string;
}

export interface BusinessAnalysis {
  problem: string;
  solution: string;
  valueProposition: string;
  businessModel: string;
  revenueStreams: string[];
  competitiveAdvantage: string;
}

export interface MarketOpportunity {
  tam: string;
  sam: string;
  som: string;
  marketGrowthRate?: string;
  keyTrends: string[];
  emergingTrends: string[];
  futureOpportunities: string[];
  industryChallenges: string[];
  competitorLandscape: string;
}

export interface FinancialBenchmark {
  label: string;
  value: string;
}

export interface KeyMetric {
  label: string;
  value: string;
}

export type FinancialHealth = 'STRONG' | 'STABLE' | 'CONCERNING' | 'CRITICAL';

export interface FinancialInsights {
  isFinancialEstimated?: boolean;
  currentRevenue?: string;
  burnRate?: string;
  runway?: string;
  grossMargin?: string;
  cac?: string;
  ltv?: string;
  marketMultiples?: string;
  industryBenchmarks?: FinancialBenchmark[];
  keyMetrics: KeyMetric[];
  financialHealth: FinancialHealth;
  commentary: string;
  chartData?: FinancialChartDataPoint[];
}

export interface InvestorReadiness {
  fundingReadinessScore: number;
  vcPerspective?: string;
  preSeedSuitability?: string;
  seedSuitability?: string;
  seriesASuitability?: string;
  recommendedRaiseAmount?: string;
  suggestedValuationRange?: string;
}

export interface VCIntelligence {
  investmentThesis?: string;
  marketTiming?: string;
  competitiveMoat?: string;
  exitOpportunities: string[];
}

export type RiskSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RiskItem {
  title: string;
  severity: RiskSeverity;
  description: string;
}

export interface StrengthItem {
  title: string;
  description: string;
}

export interface DueDiligenceReport {
  id: string;
  jobId: string;
  startupSummary: StartupSummary;
  businessAnalysis: BusinessAnalysis;
  marketOpportunity: MarketOpportunity;
  competitors: Competitor[];
  financialInsights: FinancialInsights;
  risks: RiskItem[];
  strengths: StrengthItem[];
  founderQuestions: string[];
  investorReadiness: InvestorReadiness;
  vcIntelligence: VCIntelligence;
  investmentScore: number; // 0–100
  recommendation: InvestmentRecommendation;
  confidenceScore: number; // 0.0–1.0
  confidenceMetrics?: Record<string, number>;
  sourcesUsed?: string[];
  pdfUrl?: string;
  createdAt: string;
}

// ─── Agent State & RAG Types ────────────────────────────────────────────────

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

export interface AgentState {
  jobId: string;
  pitchDeckStorageKey?: string;
  pitchDeckS3Key?: string;
  pitchDeckSignedUrl?: string;
  pitchDeckUrl?: string;
  websiteUrl?: string;
  financialCsvStorageKey?: string;
  financialCsvS3Key?: string;
  financialCsvUrl?: string;
  startupStage?: string;

  pitchDeckContent?: PitchDeckContent;
  websiteContent?: WebsiteContent;
  financialData?: FinancialData;

  vectorNamespace: string;
  ragContext: Partial<Record<ReportSectionKey, string[]>>;

  reportDraft: Partial<DueDiligenceReport>;
  validationErrors: string[];
  retryCount: number;

  finalReport?: DueDiligenceReport;
  shouldRetry: boolean;
  error?: string;
}

export interface FullDueDiligenceOutput {
  thinking: string;
  name: string;
  tagline: string;
  stage: string;
  founded: string;
  location: string;
  teamSize: string;
  description: string;
  keyHighlights: string[];
  investmentReadiness: string;
  growthPotential: string;

  problem: string;
  solution: string;
  valueProposition: string;
  businessModel: string;
  revenueStreams: string[];
  competitiveAdvantage: string;

  tam: string;
  sam: string;
  som: string;
  marketGrowthRate: string;
  keyTrends: string[];
  emergingTrends: string[];
  futureOpportunities: string[];
  industryChallenges: string[];
  competitorLandscape: string;

  competitors: Competitor[];

  isFinancialEstimated: boolean;
  currentRevenue: string;
  burnRate: string;
  runway: string;
  grossMargin: string;
  cac: string;
  ltv: string;
  marketMultiples: string;
  industryBenchmarks: FinancialBenchmark[];
  keyMetrics: KeyMetric[];
  financialHealth: FinancialHealth;
  financialCommentary: string;

  risks: RiskItem[];
  strengths: StrengthItem[];

  fundingReadinessScore: number;
  vcPerspective: string;
  preSeedSuitability: string;
  seedSuitability: string;
  seriesASuitability: string;
  recommendedRaiseAmount: string;
  suggestedValuationRange: string;

  investmentThesis: string;
  marketTiming: string;
  competitiveMoat: string;
  exitOpportunities: string[];

  investmentScore: number;
  recommendation: InvestmentRecommendation;
  founderQuestions: string[];
  confidenceScore: number;
  sourcesUsed: string[];
}

// ─── API Request / Response DTOs ────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CreateJobRequest {
  pitchDeckUrl?: string;
  websiteUrl?: string;
  financialCsvUrl?: string;
  startupStage?: string;
}

export interface CreateJobResponse {
  jobId: string;
  status: JobStatus;
}

export interface UploadResponse {
  url: string;
  key: string;
  filename: string;
}

export interface CloudinarySignatureData {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
  uploadUrl: string;
  publicId?: string;
  uploadPreset?: string;
}

export interface DashboardStats {
  totalReports: number;
  creditsRemaining: number;
  avgScore: number;
  recentReports: Array<{
    id: string;
    jobId: string;
    companyName: string;
    score: number;
    recommendation: InvestmentRecommendation;
    createdAt: string;
  }>;
}

export interface ReportListItem {
  id: string;
  jobId: string;
  companyName: string;
  tagline: string;
  investmentScore: number;
  recommendation: InvestmentRecommendation;
  createdAt: string;
}

export interface ReportsListResponse {
  reports: ReportListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AuthUser {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  credits: number;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

// ─── Crawler & Tools Types ──────────────────────────────────────────────────

export interface CrawlerTechnology {
  name: string;
  category: string;
  patterns: RegExp[];
}

export interface CrawlerOptions {
  maxDepth?: number;
  maxPages?: number;
  timeoutMs?: number;
  concurrency?: number;
}

export interface CrawlerResult {
  url: string;
  title: string;
  description: string;
  markdownContent: string;
  technologies: string[];
  extractedSections: Record<string, string>;
  discoveredUrls: string[];
}

// ─── Job Types ───────────────────────────────────────────────────────────────

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

// ─── Agent Types ──────────────────────────────────────────────────────────────

export type AgentName =
  | 'intake'
  | 'extraction'
  | 'knowledge'
  | 'reasoning'
  | 'validator'
  | 'action';

export type AgentEventType = 'start' | 'progress' | 'complete' | 'error';

export interface AgentEvent {
  id: string;
  jobId: string;
  agent: AgentName;
  eventType: AgentEventType;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ─── Report Types ─────────────────────────────────────────────────────────────

export type InvestmentRecommendation =
  | 'STRONG_INVEST'
  | 'INVEST'
  | 'PASS'
  | 'NEEDS_MORE_INFO';

export interface RiskItem {
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
}

export interface StrengthItem {
  title: string;
  description: string;
}

export interface Competitor {
  name: string;
  type: 'DIRECT' | 'INDIRECT' | 'GLOBAL' | 'REGIONAL' | 'MARKET_LEADER';
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

export interface FinancialInsights {
  isFinancialEstimated?: boolean;
  currentRevenue?: string;
  burnRate?: string;
  runway?: string;
  grossMargin?: string;
  cac?: string;
  ltv?: string;
  marketMultiples?: string;
  industryBenchmarks?: Array<{ label: string; value: string }>;
  keyMetrics: Array<{ label: string; value: string }>;
  financialHealth: 'STRONG' | 'STABLE' | 'CONCERNING' | 'CRITICAL';
  commentary: string;
  chartData?: Array<{ month: string; revenue: number; expenses: number }>;
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

// ─── API Response Types ───────────────────────────────────────────────────────

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

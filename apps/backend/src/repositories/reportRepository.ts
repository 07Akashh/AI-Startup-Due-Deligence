/**
 * Report Repository — all Prisma queries for the Report model.
 */
import { Report as PrismaReport, Prisma } from '@prisma/client';
import { DueDiligenceReport, InvestmentRecommendation, Competitor } from '@startupai/shared';
import { BaseRepository } from './baseRepository';
import { NotFoundError } from '../types/errors';
import { ReportQueryResult } from '../types/api';

export class ReportRepository extends BaseRepository {

  // ─── Create / Update ─────────────────────────────────────────────────────────

  async upsert(jobId: string, data: Omit<DueDiligenceReport, 'id' | 'createdAt' | 'jobId'>): Promise<DueDiligenceReport> {
    const payload = this.toDbPayload(data);

    const report = await this.db.report.upsert({
      where: { jobId },
      create: { jobId, ...payload },
      update: payload,
    });

    return this.map(report);
  }

  // ─── Read ────────────────────────────────────────────────────────────────────

  async findByJobId(jobId: string): Promise<DueDiligenceReport | null> {
    const report = await this.db.report.findUnique({ where: { jobId } });
    return report ? this.map(report) : null;
  }

  async findByJobIdOrThrow(jobId: string): Promise<DueDiligenceReport> {
    const report = await this.findByJobId(jobId);
    if (!report) throw new NotFoundError('Report', jobId);
    return report;
  }

  async findSummaries(limit: number = 20): Promise<ReportQueryResult[]> {
    const reports = await this.db.report.findMany({
      select: {
        jobId: true,
        investmentScore: true,
        recommendation: true,
        confidenceScore: true,
        createdAt: true,
        startupName: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return reports.map(r => ({
      jobId: r.jobId,
      investmentScore: r.investmentScore,
      recommendation: r.recommendation as InvestmentRecommendation,
      confidenceScore: r.confidenceScore,
      createdAt: r.createdAt.toISOString(),
      startupName: r.startupName ?? undefined,
    }));
  }

  // ─── Delete ──────────────────────────────────────────────────────────────────

  async deleteByJobId(jobId: string): Promise<void> {
    await this.db.report.deleteMany({ where: { jobId } });
  }

  // ─── Mapper ──────────────────────────────────────────────────────────────────

  private toDbPayload(data: Omit<DueDiligenceReport, 'id' | 'createdAt' | 'jobId'>): any {
    return {
      startupName: data.startupSummary.name,
      startupTagline: data.startupSummary.tagline,
      startupStage: data.startupSummary.stage,
      startupFounded: data.startupSummary.founded,
      startupLocation: data.startupSummary.location,
      startupTeamSize: data.startupSummary.teamSize,
      startupDescription: data.startupSummary.description,
      startupHighlights: data.startupSummary.keyHighlights,
      investmentReadiness: data.startupSummary.investmentReadiness,
      growthPotential: data.startupSummary.growthPotential,

      businessProblem: data.businessAnalysis.problem,
      businessSolution: data.businessAnalysis.solution,
      valueProposition: data.businessAnalysis.valueProposition,
      businessModel: data.businessAnalysis.businessModel,
      revenueStreams: data.businessAnalysis.revenueStreams,
      competitiveAdvantage: data.businessAnalysis.competitiveAdvantage,

      marketTam: data.marketOpportunity.tam,
      marketSam: data.marketOpportunity.sam,
      marketSom: data.marketOpportunity.som,
      marketGrowthRate: data.marketOpportunity.marketGrowthRate,
      marketTrends: data.marketOpportunity.keyTrends,
      emergingTrends: data.marketOpportunity.emergingTrends,
      futureOpportunities: data.marketOpportunity.futureOpportunities,
      industryChallenges: data.marketOpportunity.industryChallenges,
      competitorLandscape: data.marketOpportunity.competitorLandscape,
      
      competitors: (data.competitors as any) ?? [],

      isFinancialEstimated: data.financialInsights.isFinancialEstimated ?? false,
      currentRevenue: data.financialInsights.currentRevenue,
      burnRate: data.financialInsights.burnRate,
      runway: data.financialInsights.runway,
      grossMargin: data.financialInsights.grossMargin,
      cac: data.financialInsights.cac,
      ltv: data.financialInsights.ltv,
      marketMultiples: data.financialInsights.marketMultiples,
      industryBenchmarks: (data.financialInsights.industryBenchmarks as any) ?? [],
      keyMetrics: (data.financialInsights.keyMetrics as any) ?? [],
      financialHealth: data.financialInsights.financialHealth,
      financialCommentary: data.financialInsights.commentary,
      chartData: (data.financialInsights.chartData as any) ?? [],

      risks: (data.risks as any) ?? [],
      strengths: (data.strengths as any) ?? [],
      founderQuestions: data.founderQuestions,

      fundingReadinessScore: data.investorReadiness.fundingReadinessScore,
      vcPerspective: data.investorReadiness.vcPerspective,
      preSeedSuitability: data.investorReadiness.preSeedSuitability,
      seedSuitability: data.investorReadiness.seedSuitability,
      seriesASuitability: data.investorReadiness.seriesASuitability,
      recommendedRaiseAmount: data.investorReadiness.recommendedRaiseAmount,
      suggestedValuationRange: data.investorReadiness.suggestedValuationRange,

      investmentThesis: data.vcIntelligence.investmentThesis,
      marketTiming: data.vcIntelligence.marketTiming,
      competitiveMoat: data.vcIntelligence.competitiveMoat,
      exitOpportunities: data.vcIntelligence.exitOpportunities,

      investmentScore: data.investmentScore,
      recommendation: data.recommendation,
      confidenceScore: data.confidenceScore,
      confidenceMetrics: data.confidenceMetrics ?? {},
      sourcesUsed: data.sourcesUsed ?? [],
      pdfUrl: data.pdfUrl,
    };
  }

  private map(r: PrismaReport): DueDiligenceReport {
    return {
      id: r.id,
      jobId: r.jobId,
      startupSummary: {
        name: r.startupName ?? 'Unknown',
        tagline: r.startupTagline ?? '',
        stage: r.startupStage ?? '',
        founded: r.startupFounded ?? undefined,
        location: r.startupLocation ?? undefined,
        teamSize: r.startupTeamSize ?? undefined,
        description: r.startupDescription ?? '',
        keyHighlights: (r.startupHighlights as string[]) ?? [],
        investmentReadiness: r.investmentReadiness ?? undefined,
        growthPotential: r.growthPotential ?? undefined,
      },
      businessAnalysis: {
        problem: r.businessProblem ?? '',
        solution: r.businessSolution ?? '',
        valueProposition: r.valueProposition ?? '',
        businessModel: r.businessModel ?? '',
        revenueStreams: (r.revenueStreams as string[]) ?? [],
        competitiveAdvantage: r.competitiveAdvantage ?? '',
      },
      marketOpportunity: {
        tam: r.marketTam ?? '',
        sam: r.marketSam ?? '',
        som: r.marketSom ?? '',
        marketGrowthRate: r.marketGrowthRate ?? undefined,
        keyTrends: (r.marketTrends as string[]) ?? [],
        emergingTrends: (r.emergingTrends as string[]) ?? [],
        futureOpportunities: (r.futureOpportunities as string[]) ?? [],
        industryChallenges: (r.industryChallenges as string[]) ?? [],
        competitorLandscape: r.competitorLandscape ?? '',
      },
      competitors: (r.competitors as unknown as Competitor[]) ?? [],
      financialInsights: {
        isFinancialEstimated: r.isFinancialEstimated ?? false,
        currentRevenue: r.currentRevenue ?? undefined,
        burnRate: r.burnRate ?? undefined,
        runway: r.runway ?? undefined,
        grossMargin: r.grossMargin ?? undefined,
        cac: r.cac ?? undefined,
        ltv: r.ltv ?? undefined,
        marketMultiples: r.marketMultiples ?? undefined,
        industryBenchmarks: (r.industryBenchmarks as any[]) ?? [],
        keyMetrics: (r.keyMetrics as any[]) ?? [],
        financialHealth: (r.financialHealth as any) ?? 'STABLE',
        commentary: r.financialCommentary ?? '',
        chartData: (r.chartData as any[]) ?? [],
      },
      risks: (r.risks as any[]) ?? [],
      strengths: (r.strengths as any[]) ?? [],
      founderQuestions: (r.founderQuestions as string[]) ?? [],
      investorReadiness: {
        fundingReadinessScore: r.fundingReadinessScore,
        vcPerspective: r.vcPerspective ?? undefined,
        preSeedSuitability: r.preSeedSuitability ?? undefined,
        seedSuitability: r.seedSuitability ?? undefined,
        seriesASuitability: r.seriesASuitability ?? undefined,
        recommendedRaiseAmount: r.recommendedRaiseAmount ?? undefined,
        suggestedValuationRange: r.suggestedValuationRange ?? undefined,
      },
      vcIntelligence: {
        investmentThesis: r.investmentThesis ?? undefined,
        marketTiming: r.marketTiming ?? undefined,
        competitiveMoat: r.competitiveMoat ?? undefined,
        exitOpportunities: (r.exitOpportunities as string[]) ?? [],
      },
      investmentScore: r.investmentScore,
      recommendation: r.recommendation as InvestmentRecommendation,
      confidenceScore: r.confidenceScore,
      confidenceMetrics: (r.confidenceMetrics as Record<string, number>) ?? {},
      sourcesUsed: (r.sourcesUsed as string[]) ?? [],
      pdfUrl: r.pdfUrl ?? undefined,
      createdAt: r.createdAt.toISOString(),
    };
  }
}

export const reportRepository = new ReportRepository();

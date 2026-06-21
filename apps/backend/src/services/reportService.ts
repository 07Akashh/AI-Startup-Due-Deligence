/**
 * Report Service — business logic for report assembly and retrieval.
 * Depends on ReportRepository.
 */
import { DueDiligenceReport } from '@startupai/shared';
import { reportRepository } from '../repositories/reportRepository';
import { NotFoundError } from '../types/errors';
import { ReportQueryResult } from '../types/api';
import { logger } from '../utils/logger';

class ReportService {
  private readonly log = logger.child({ service: 'ReportService' });

  async saveReport(
    jobId: string,
    report: Omit<DueDiligenceReport, 'id' | 'createdAt' | 'jobId'>
  ): Promise<DueDiligenceReport> {
    this.log.info('Saving report', { jobId, score: report.investmentScore });
    return reportRepository.upsert(jobId, report);
  }

  async getReport(jobId: string): Promise<DueDiligenceReport> {
    return reportRepository.findByJobIdOrThrow(jobId);
  }

  async getReportOrNull(jobId: string): Promise<DueDiligenceReport | null> {
    return reportRepository.findByJobId(jobId);
  }

  async listRecentSummaries(limit: number = 20): Promise<ReportQueryResult[]> {
    return reportRepository.findSummaries(limit);
  }
}

export const reportService = new ReportService();
export const saveReport = reportService.saveReport.bind(reportService);
export const getReport = reportService.getReport.bind(reportService);
export const getReportOrNull = reportService.getReportOrNull.bind(reportService);
export const listRecentSummaries = reportService.listRecentSummaries.bind(reportService);


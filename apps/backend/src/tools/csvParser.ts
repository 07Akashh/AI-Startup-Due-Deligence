import { parse } from 'csv-parse/sync';
import { downloadFromStorage } from '../services/storageService';

export interface FinancialData {
  rawRows: Record<string, string>[];
  columns: string[];
  metrics: {
    revenue?: number[];
    expenses?: number[];
    burnRate?: number[];
    runway?: number;
    grossMargin?: number;
    months?: string[];
  };
  summary: string;
  chartData: Array<{ month: string; revenue: number; expenses: number }>;
}

// Common aliases for financial column names
const COLUMN_MAP: Record<string, string[]> = {
  month: ['month', 'date', 'period', 'month_year', 'time'],
  revenue: ['revenue', 'mrr', 'arr', 'income', 'sales', 'total_revenue', 'net_revenue'],
  expenses: ['expenses', 'costs', 'opex', 'total_expenses', 'burn', 'total_costs'],
  burnRate: ['burn_rate', 'burn', 'net_burn', 'monthly_burn'],
  grossMargin: ['gross_margin', 'margin', 'gm'],
};

export async function parseCSV(s3Key: string): Promise<FinancialData> {
  const buffer = await downloadFromStorage(s3Key);
  const csvText = buffer.toString('utf-8');

  let rows: Record<string, string>[];
  try {
    rows = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];
  } catch {
    return emptyFinancialData();
  }

  if (!rows.length) return emptyFinancialData();

  const columns = Object.keys(rows[0]);
  const mapped = detectColumns(columns);

  const revenue = extractNumericColumn(rows, mapped.revenue);
  const expenses = extractNumericColumn(rows, mapped.expenses);
  const months = extractStringColumn(rows, mapped.month);
  const burnRates = extractNumericColumn(rows, mapped.burnRate);
  const grossMarginRaw = extractNumericColumn(rows, mapped.grossMargin);

  const avgRevenue = average(revenue);
  const avgExpenses = average(expenses);
  const avgBurn = burnRates.length ? average(burnRates) : avgExpenses > 0 ? avgExpenses : undefined;
  const runway = avgBurn && avgRevenue ? Math.round((avgRevenue / avgBurn) * 12) : undefined;
  const grossMargin = grossMarginRaw.length ? average(grossMarginRaw) : undefined;

  const chartData = months.map((month, i) => ({
    month,
    revenue: revenue[i] ?? 0,
    expenses: expenses[i] ?? 0,
  }));

  const revenueGrowth = revenue.length > 1
    ? ((revenue[revenue.length - 1] - revenue[0]) / (revenue[0] || 1)) * 100
    : 0;

  const summary = buildSummary({ avgRevenue, avgBurn, runway, grossMargin, revenueGrowth });

  return {
    rawRows: rows.slice(0, 50), // limit
    columns,
    metrics: {
      revenue,
      expenses,
      burnRate: burnRates,
      runway,
      grossMargin,
      months,
    },
    summary,
    chartData,
  };
}

function detectColumns(columns: string[]): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};

  for (const [key, aliases] of Object.entries(COLUMN_MAP)) {
    result[key] = columns.find((col) =>
      aliases.some((alias) => col.toLowerCase().includes(alias))
    );
  }

  return result;
}

function extractNumericColumn(
  rows: Record<string, string>[],
  colName?: string
): number[] {
  if (!colName) return [];
  return rows
    .map((row) => parseFloat(String(row[colName] ?? '').replace(/[$,%]/g, '')))
    .filter((n) => !isNaN(n));
}

function extractStringColumn(
  rows: Record<string, string>[],
  colName?: string
): string[] {
  if (!colName) return rows.map((_, i) => `Month ${i + 1}`);
  return rows.map((row) => String(row[colName] ?? ''));
}

function average(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function buildSummary(data: {
  avgRevenue: number;
  avgBurn?: number;
  runway?: number;
  grossMargin?: number;
  revenueGrowth: number;
}): string {
  const parts: string[] = [];

  if (data.avgRevenue > 0) {
    parts.push(`Average monthly revenue: $${data.avgRevenue.toFixed(0)}`);
  }
  if (data.avgBurn) {
    parts.push(`Average monthly burn: $${data.avgBurn.toFixed(0)}`);
  }
  if (data.runway) {
    parts.push(`Estimated runway: ${data.runway} months`);
  }
  if (data.grossMargin !== undefined) {
    parts.push(`Gross margin: ${data.grossMargin.toFixed(1)}%`);
  }
  if (data.revenueGrowth !== 0) {
    parts.push(`Revenue growth: ${data.revenueGrowth.toFixed(1)}% over the period`);
  }

  return parts.join('. ') || 'Financial data extracted from CSV.';
}

function emptyFinancialData(): FinancialData {
  return {
    rawRows: [],
    columns: [],
    metrics: {},
    summary: 'No financial data available.',
    chartData: [],
  };
}

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { getReport, getJob, createJob } from '@/lib/api';
import type { DueDiligenceReport, RiskItem, StrengthItem } from '@startupai/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, TrendingUp, HelpCircle, Briefcase, Globe, DollarSign, Loader2, Printer, Crosshair, Target, Zap, BrainCircuit, ShieldAlert, RefreshCw } from 'lucide-react';

function ScoreGauge({ score, label = '', colorClass = '' }: { score: number, label?: string, colorClass?: string }) {
  let color = colorClass;
  if (!color) {
    color = score >= 70 ? 'text-emerald-500 stroke-emerald-500' : score >= 50 ? 'text-blue-500 stroke-blue-500' : score >= 30 ? 'text-amber-500 stroke-amber-500' : 'text-rose-500 stroke-rose-500';
  }
  const circumference = 2 * Math.PI * 54;
  const dash = (score / 100) * circumference;

  return (
    <div className="text-center relative flex flex-col items-center justify-center">
      <svg width={140} height={140} className="transform -rotate-90">
        <circle cx={70} cy={70} r={54} fill="none" className="stroke-muted" strokeWidth={12} />
        <circle
          cx={70} cy={70} r={54} fill="none" strokeWidth={12}
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
          className={`transition-all duration-1000 ease-out ${color.split(' ')[1]}`}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <div className={`text-4xl font-black ${color.split(' ')[0]}`}>{score}</div>
        {label && <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1">{label}</div>}
      </div>
    </div>
  );
}

function RecBadge({ rec }: { rec: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    STRONG_INVEST: { label: 'Strong Invest', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200 shadow-emerald-500/20' },
    INVEST:        { label: 'Invest',         cls: 'bg-blue-100 text-blue-800 border-blue-200 shadow-blue-500/20' },
    PASS:          { label: 'Pass',            cls: 'bg-rose-100 text-rose-800 border-rose-200 shadow-rose-500/20' },
    NEEDS_MORE_INFO: { label: 'Needs Info', cls: 'bg-amber-100 text-amber-800 border-amber-200 shadow-amber-500/20' },
  };
  const { label, cls } = map[rec] ?? { label: rec, cls: 'bg-slate-100 text-slate-800 border-slate-200' };
  return (
    <Badge variant="outline" className={`px-4 py-1.5 text-sm font-black uppercase tracking-widest shadow-sm ${cls}`}>
      {label}
    </Badge>
  );
}

function MetricPill({ label, value, estimated = false }: { label: string; value: string; estimated?: boolean }) {
  return (
    <div className="p-4 rounded-xl border border-border bg-slate-50/50 relative overflow-hidden group hover:bg-slate-50 transition-colors">
      <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">{label}</div>
      <div className="text-xl font-bold text-foreground">{value}</div>
      {estimated && (
        <div className="absolute top-0 right-0 bg-amber-100 text-amber-700 text-[9px] px-2 py-0.5 font-bold uppercase tracking-widest rounded-bl-lg border-b border-l border-amber-200">
          Estimated
        </div>
      )}
    </div>
  );
}

export default function ReportPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [report, setReport] = useState<DueDiligenceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reanalyzing, setReanalyzing] = useState(false);
  const router = useRouter();

  const handleReanalyze = async () => {
    try {
      setReanalyzing(true);
      
      const job = await getJob(jobId);
      if (!job) throw new Error("Could not fetch job details");

      const newJob = await createJob({
        pitchDeckUrl: job.pitchDeckUrl,
        websiteUrl: job.websiteUrl,
        financialCsvUrl: job.financialCsvUrl,
      });

      router.push(`/dashboard/reports/${newJob.jobId}`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      alert(error.response?.data?.error || error.message || 'Failed to reanalyze. Make sure you have enough credits.');
      setReanalyzing(false);
    }
  };

  useEffect(() => {
    let retries = 0;
    const load = async () => {
      try {
        const r = await getReport(jobId);
        setReport(r);
        setLoading(false);
      } catch {
        if (retries < 5) {
          retries++;
          setTimeout(load, 2000);
        } else {
          setError('Report not available yet. Please wait and refresh.');
          setLoading(false);
        }
      }
    };
    load();
  }, [jobId]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center animate-fade-in-up">
        <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
        <h2 className="text-xl font-semibold">Loading Report...</h2>
        <p className="text-muted-foreground">Assembling your due diligence analysis</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center animate-fade-in-up">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-4">{error ?? 'Report not found'}</h2>
        <Link href="/dashboard/new">
          <Button>Start New Analysis</Button>
        </Link>
      </div>
    );
  }

  const { startupSummary: ss, businessAnalysis: ba, marketOpportunity: mo, financialInsights: fi, competitors, investorReadiness: ir, vcIntelligence: vci } = report;

  const getFundraisingData = () => {
    const isPlaceholder = (val?: string) => {
      if (!val) return true;
      const lower = val.toLowerCase().trim();
      return lower === 'unknown' || lower === 'n/a' || lower === 'tbd' || lower === 'undefined' || lower === 'null';
    };

    let raise = ir?.recommendedRaiseAmount;
    let valuation = ir?.suggestedValuationRange;

    if (isPlaceholder(raise) || isPlaceholder(valuation)) {
      const stage = (ss.stage || '').toLowerCase();
      if (stage.includes('pre-seed')) {
        raise = '$500K - $1M';
        valuation = '$3M - $5M';
      } else if (stage.includes('seed')) {
        raise = '$1.5M - $2.5M';
        valuation = '$8M - $12M';
      } else if (stage.includes('series a')) {
        raise = '$5M - $10M';
        valuation = '$25M - $40M';
      } else if (stage.includes('series b')) {
        raise = '$15M - $25M';
        valuation = '$75M - $120M';
      } else {
        raise = '$1.5M - $2.5M';
        valuation = '$8M - $12M';
      }
    }

    return { raise, valuation };
  };

  const getSuitabilityText = (suitability?: string, defaultVal = 'Potential') => {
    if (!suitability) return defaultVal;
    const lower = suitability.toLowerCase().trim();
    if (lower === 'unknown' || lower === 'n/a' || lower === 'tbd') return defaultVal;
    return suitability;
  };

  const { raise, valuation } = getFundraisingData();

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight">Investment Memo</h1>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => window.print()} className="hidden sm:flex">
            <Printer className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="secondary" onClick={handleReanalyze} disabled={reanalyzing}>
            {reanalyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Reanalyze (1 Credit)
          </Button>
          <Link href="/dashboard/new">
            <Button>New Analysis</Button>
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <Card className="border-border shadow-lg overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Briefcase className="w-96 h-96 transform translate-x-1/4 -translate-y-1/4" />
        </div>
        <CardContent className="p-8 sm:p-12 flex flex-col lg:flex-row gap-10 justify-between items-center bg-gradient-to-br from-white to-slate-50 relative z-10">
          <div className="flex-1 space-y-6">
            <div>
              <p className="text-sm font-bold text-primary uppercase tracking-widest mb-2">Target Company</p>
              <h2 className="text-5xl sm:text-6xl font-black text-foreground tracking-tight">{ss.name}</h2>
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">{ss.tagline}</p>
            
            <div className="flex flex-wrap gap-2 pt-2">
              {[
                ss.stage,
                ss.location,
                ss.founded && `Founded ${ss.founded}`,
                ss.teamSize && `${ss.teamSize} team`
              ]
                .filter((tag): tag is string => {
                  if (!tag) return false;
                  const lower = tag.toLowerCase();
                  return !lower.includes('unknown') && !lower.includes('n/a') && !lower.includes('undefined') && !lower.includes('null') && !lower.includes('tbd');
                })
                .map((tag, idx) => (
                  <Badge key={`${tag}-${idx}`} variant="secondary" className="px-3 py-1 text-sm bg-secondary/60">{tag}</Badge>
                ))}
            </div>
            
            <div className="pt-6">
              <RecBadge rec={report.recommendation} />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 items-center bg-white p-6 rounded-3xl shadow-sm border border-border">
            <div className="flex flex-col items-center">
              <ScoreGauge score={report.investmentScore} label="Investment" />
            </div>
            <div className="w-px h-24 bg-border hidden sm:block"></div>
            <div className="flex flex-col items-center">
              <ScoreGauge score={ir?.fundingReadinessScore || 0} label="Readiness" colorClass="text-indigo-500 stroke-indigo-500" />
            </div>
          </div>
        </CardContent>

        <div className="bg-slate-900 text-slate-50 p-6 sm:px-12 flex justify-between items-center text-sm border-t border-slate-800">
          <div className="flex gap-6 items-center">
            <span className="font-semibold uppercase tracking-widest text-slate-400">Confidence Match</span>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-emerald-400" />
              <span className="font-bold text-lg">{Math.round((report.confidenceScore || 0) * 100)}%</span>
            </div>
          </div>
          <div className="hidden sm:block text-slate-400 text-xs">
            Powered by VentureLens AI • Multi-Agent Validation
          </div>
        </div>
      </Card>

      {/* VC Intelligence & Executive Summary */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader className="bg-slate-50/50 border-b border-border">
              <CardTitle className="flex items-center gap-2 text-xl">
                <BrainCircuit className="w-5 h-5 text-primary" /> VC Intelligence
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">Investment Thesis</h4>
                <p className="text-foreground leading-relaxed text-lg">{vci?.investmentThesis || ss.description}</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">Market Timing</h4>
                  <p className="text-foreground leading-relaxed">{vci?.marketTiming || 'N/A'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">Competitive Moat</h4>
                  <p className="text-foreground leading-relaxed">{vci?.competitiveMoat || ba.competitiveAdvantage}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Target className="w-5 h-5 text-primary" /> Business Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl bg-rose-50 border border-rose-100">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-rose-800 mb-2">The Problem</h4>
                  <p className="text-rose-950 leading-relaxed">{ba.problem}</p>
                </div>
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-emerald-800 mb-2">The Solution</h4>
                  <p className="text-emerald-950 leading-relaxed">{ba.solution}</p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">Value Proposition</h4>
                <p className="text-foreground leading-relaxed font-medium">{ba.valueProposition}</p>
              </div>

              {ba.revenueStreams?.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Revenue Streams</h4>
                  <div className="flex flex-wrap gap-2">
                    {ba.revenueStreams.map((r: string) => (
                      <Badge key={r} variant="outline" className="bg-primary/5 text-primary border-primary/20">{r}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-8">
          <Card className="bg-indigo-950 text-indigo-50 border-indigo-900 shadow-xl">
            <CardHeader className="border-b border-indigo-900/50">
              <CardTitle className="flex items-center gap-2 text-xl text-white">
                <Zap className="w-5 h-5 text-indigo-400" /> Fundraising
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div>
                <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Recommended Raise</div>
                <div className="text-3xl font-black text-white">{raise}</div>
              </div>
              <div>
                <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Valuation Range</div>
                <div className="text-xl font-bold text-white">{valuation}</div>
              </div>
              <div>
                <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">Stage Suitability</div>
                <div className="space-y-2">
                  {ir?.preSeedSuitability && <div className="text-sm"><span className="text-indigo-300 font-semibold">Pre-Seed:</span> {getSuitabilityText(ir.preSeedSuitability, 'Potential')}</div>}
                  {ir?.seedSuitability && <div className="text-sm"><span className="text-indigo-300 font-semibold">Seed:</span> {getSuitabilityText(ir.seedSuitability, 'Highly Suitable')}</div>}
                  {ir?.seriesASuitability && <div className="text-sm"><span className="text-indigo-300 font-semibold">Series A:</span> {getSuitabilityText(ir.seriesASuitability, 'Too Early')}</div>}
                </div>
              </div>
              {vci?.exitOpportunities?.length > 0 && (
                <div className="pt-4 border-t border-indigo-900/50">
                  <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">Exit Opportunities</div>
                  <ul className="space-y-1">
                    {vci.exitOpportunities.map((e, i) => (
                      <li key={i} className="text-sm text-indigo-200 flex gap-2">
                        <span className="text-indigo-400">•</span> {e}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {ss.keyHighlights?.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">Key Highlights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ss.keyHighlights.map((h: string, i: number) => (
                    <div key={i} className="flex gap-3 text-sm text-foreground">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Market Opportunity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Globe className="w-5 h-5 text-primary" /> Market Opportunity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricPill label="TAM" value={mo.tam} />
            <MetricPill label="SAM" value={mo.sam} />
            <MetricPill label="SOM" value={mo.som} />
            <MetricPill label="Growth Rate" value={mo.marketGrowthRate || 'N/A'} />
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {mo.keyTrends?.length > 0 && (
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Key Market Trends</h4>
                <ul className="space-y-3">
                  {mo.keyTrends.map((t: string, i: number) => (
                    <li key={i} className="flex gap-3 text-foreground items-start bg-slate-50 p-3 rounded-lg border border-border">
                      <TrendingUp className="w-5 h-5 text-primary shrink-0" /> {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {mo.industryChallenges?.length > 0 && (
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Industry Challenges</h4>
                <ul className="space-y-3">
                  {mo.industryChallenges.map((t: string, i: number) => (
                    <li key={i} className="flex gap-3 text-foreground items-start bg-rose-50 p-3 rounded-lg border border-rose-100">
                      <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" /> {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Competitor Analysis Matrix */}
      {competitors && competitors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Crosshair className="w-5 h-5 text-primary" /> Competitor Landscape
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-slate-100 text-slate-500 rounded-t-lg">
                  <tr>
                    <th className="px-4 py-3 font-bold rounded-tl-lg">Competitor</th>
                    <th className="px-4 py-3 font-bold">Type</th>
                    <th className="px-4 py-3 font-bold">Funding</th>
                    <th className="px-4 py-3 font-bold">Business Model</th>
                    <th className="px-4 py-3 font-bold min-w-[200px]">Key Strength</th>
                    <th className="px-4 py-3 font-bold min-w-[200px] rounded-tr-lg">Key Weakness</th>
                  </tr>
                </thead>
                <tbody>
                  {competitors.map((c, i) => (
                    <tr key={i} className="border-b border-border hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4 font-bold text-slate-900">{c.name}</td>
                      <td className="px-4 py-4">
                        <Badge variant="outline" className="text-[10px] tracking-wider">{c.type}</Badge>
                      </td>
                      <td className="px-4 py-4 font-medium">{c.fundingRaised || 'Unknown'}</td>
                      <td className="px-4 py-4 text-slate-600">{c.businessModel}</td>
                      <td className="px-4 py-4 text-emerald-700">{c.strengths[0] || '-'}</td>
                      <td className="px-4 py-4 text-rose-700">{c.weaknesses[0] || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financial Insights */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl">
            <DollarSign className="w-5 h-5 text-emerald-600" /> Financial Intelligence
          </CardTitle>
          {fi.isFinancialEstimated && (
            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
              AI Estimated Benchmarks
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {fi.currentRevenue && <MetricPill label="Revenue" value={fi.currentRevenue} estimated={fi.isFinancialEstimated} />}
            {fi.burnRate && <MetricPill label="Burn Rate" value={fi.burnRate} estimated={fi.isFinancialEstimated} />}
            {fi.cac && <MetricPill label="CAC" value={fi.cac} estimated={fi.isFinancialEstimated} />}
            {fi.ltv && <MetricPill label="LTV" value={fi.ltv} estimated={fi.isFinancialEstimated} />}
            {fi.grossMargin && <MetricPill label="Gross Margin" value={fi.grossMargin} />}
            {fi.runway && <MetricPill label="Runway" value={fi.runway} />}
            {fi.marketMultiples && <MetricPill label="Market Multiples" value={fi.marketMultiples} estimated={fi.isFinancialEstimated} />}
          </div>

          <div className={`p-6 border rounded-2xl ${
            fi.financialHealth === 'STRONG' ? 'bg-emerald-50 border-emerald-200' :
            fi.financialHealth === 'STABLE' ? 'bg-blue-50 border-blue-200' :
            fi.financialHealth === 'CONCERNING' ? 'bg-amber-50 border-amber-200' : 'bg-rose-50 border-rose-200'
          }`}>
            <h4 className="text-sm font-black uppercase tracking-widest mb-3 text-slate-800">Financial Health: {fi.financialHealth}</h4>
            <p className="text-slate-800 leading-relaxed font-medium">{fi.commentary}</p>
          </div>
          
          {fi.chartData && fi.chartData.length > 0 && (
            <div className="pt-4 border-t border-border">
              <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-6">Revenue vs Expenses</h4>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fi.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                    <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="revenue" name="Revenue" fill="#0F172A" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    <Bar dataKey="expenses" name="Expenses" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Risks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ShieldAlert className="w-5 h-5 text-rose-500" /> Risk Heatmap
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.risks?.map((r: RiskItem, i: number) => (
              <div key={i} className={`p-5 rounded-2xl border ${
                r.severity === 'LOW' ? 'bg-emerald-50 border-emerald-200' :
                r.severity === 'MEDIUM' ? 'bg-amber-50 border-amber-200' :
                r.severity === 'HIGH' ? 'bg-orange-50 border-orange-200' : 'bg-rose-50 border-rose-200'
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-slate-900">{r.title}</h4>
                  <Badge variant="outline" className={`ml-2 font-black uppercase tracking-widest text-[10px] bg-white shadow-sm ${
                    r.severity === 'LOW' ? 'text-emerald-700 border-emerald-200' :
                    r.severity === 'MEDIUM' ? 'text-amber-700 border-amber-200' :
                    r.severity === 'HIGH' ? 'text-orange-700 border-orange-200' : 'text-rose-700 border-rose-200'
                  }`}>{r.severity}</Badge>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed font-medium">{r.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Strengths */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Key Strengths
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.strengths?.map((s: StrengthItem, i: number) => (
              <div key={i} className="p-5 rounded-2xl border border-emerald-100 bg-emerald-50/50">
                <h4 className="font-bold text-emerald-900 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" /> {s.title}
                </h4>
                <p className="text-sm text-emerald-800 leading-relaxed font-medium">{s.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Founder Questions */}
      <Card className="bg-slate-900 text-slate-50 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-white">
            <HelpCircle className="w-5 h-5 text-slate-300" /> Due Diligence Questions
          </CardTitle>
          <CardDescription className="text-slate-400">Critical questions an investor should ask the founding team before committing capital.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {report.founderQuestions?.map((q: string, i: number) => (
            <div key={i} className="flex items-start gap-4 p-5 rounded-xl bg-slate-800/50 border border-slate-700">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-black text-sm shadow-lg">
                {i + 1}
              </div>
              <p className="text-slate-200 pt-1 leading-relaxed font-medium">{q}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

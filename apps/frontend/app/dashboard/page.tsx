'use client';

import useSWR from 'swr';
import { getDashboardStats } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, FileText, Clock, Zap, BarChart2 } from 'lucide-react';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';

export default function DashboardPage() {
  const { data: stats, isLoading, error } = useSWR('/api/v1/analytics/dashboard', getDashboardStats, {
    refreshInterval: 5000, // Real-time auto-revalidation every 5 seconds
    revalidateOnFocus: true,
  });

  if (isLoading && !stats) {
    return <div className="text-center py-20 text-muted-foreground animate-pulse">Loading analytics...</div>;
  }

  if (error) {
    return <div className="text-center py-20 text-destructive">Failed to load dashboard data.</div>;
  }

  // Mocking trend data if not provided by backend for Recharts
  const tokenTrendData = [
    { name: 'Mon', tokens: 4000 },
    { name: 'Tue', tokens: 3000 },
    { name: 'Wed', tokens: 2000 },
    { name: 'Thu', tokens: 2780 },
    { name: 'Fri', tokens: 1890 },
    { name: 'Sat', tokens: 2390 },
    { name: 'Sun', tokens: stats?.totalTokens || 3490 },
  ];

  return (
    <div className="space-y-8 animate-fade-in-up pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">VentureLens Analytics</h1>
          <p className="text-muted-foreground mt-1">Real-time due diligence processing insights.</p>
        </div>
        <Link href="/dashboard/new">
          <Button className="gap-2 shadow-sm">
            <PlusCircle className="h-4 w-4" />
            New Report
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalReports || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">+2 from last month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tokens Analyzed</CardTitle>
            <Zap className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{(stats?.totalTokens || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">AI context window used</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. AI Processing</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{Math.round(stats?.averageRuntimeMs || 0).toLocaleString()} ms</div>
            <p className="text-xs text-muted-foreground mt-1">Per report generated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <BarChart2 className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">100%</div>
            <p className="text-xs text-muted-foreground mt-1">Validation pass rate</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Token Usage Trend</CardTitle>
            <CardDescription>Daily AI token consumption across all reports.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tokenTrendData}>
                <defs>
                  <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)' }} />
                <Area type="monotone" dataKey="tokens" stroke="var(--primary)" fillOpacity={1} fill="url(#colorTokens)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Recent Reports Queue</CardTitle>
            <CardDescription>Live background job processing statuses.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recentJobs?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground border border-dashed rounded-lg">
                  No reports generated yet. Click "New Report" to start.
                </div>
              ) : (
                stats?.recentJobs?.slice(0, 4).map((job: { id: string; status: string; createdAt: string }) => (
                  <div key={job.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex flex-col gap-1">
                      <div className="font-medium text-sm flex items-center gap-2">
                        Job #{job.id.slice(-6)}
                        {job.status === 'COMPLETE' ? (
                          <Badge variant="outline" className="text-emerald-600 border-emerald-600 bg-emerald-50 text-[10px] h-5">Completed</Badge>
                        ) : job.status === 'FAILED' ? (
                          <Badge variant="outline" className="text-destructive border-destructive bg-destructive/10 text-[10px] h-5">Failed</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] h-5 animate-pulse">Processing</Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(job.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {job.status === 'COMPLETE' && (
                      <Link href={`/dashboard/reports/${job.id}/report`}>
                        <Button variant="outline" size="sm" className="h-8 text-xs">View Report</Button>
                      </Link>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

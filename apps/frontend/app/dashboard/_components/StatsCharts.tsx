'use client';

import { use } from 'react';
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
  Legend,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardStats } from '@/app/actions/reports';

interface StatsChartsProps {

  statsPromise: Promise<DashboardStats>;
}

export function StatsCharts({ statsPromise }: StatsChartsProps) {
  const stats = use(statsPromise);

  const tokenTrendData = [
    { name: 'Mon', tokens: 4000 },
    { name: 'Tue', tokens: 3000 },
    { name: 'Wed', tokens: 2000 },
    { name: 'Thu', tokens: 2780 },
    { name: 'Fri', tokens: 1890 },
    { name: 'Sat', tokens: 2390 },
    { name: 'Sun', tokens: stats.totalTokens || 3490 },
  ];

  const jobStatusData = [
    {
      name: 'This Week',
      Completed: stats.recentJobs?.filter((j) => j.status === 'COMPLETE').length ?? 0,
      Failed: stats.recentJobs?.filter((j) => j.status === 'FAILED').length ?? 0,
      Processing: stats.recentJobs?.filter(
        (j) => j.status !== 'COMPLETE' && j.status !== 'FAILED',
      ).length ?? 0,
    },
  ];

  return (
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
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)' }} />
              <Area
                type="monotone"
                dataKey="tokens"
                stroke="var(--primary)"
                fillOpacity={1}
                fill="url(#colorTokens)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Job Status Bar Chart */}
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Job Status Breakdown</CardTitle>
          <CardDescription>Current week report processing outcomes.</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={jobStatusData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)' }} />
              <Legend />
              <Bar dataKey="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Processing" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Failed" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

export function StatsChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[0, 1].map((i) => (
        <Card key={i} className="col-span-1">
          <CardHeader>
            <div className="h-5 w-40 bg-muted animate-pulse rounded" />
            <div className="h-3 w-56 bg-muted/60 animate-pulse rounded mt-1" />
          </CardHeader>
          <CardContent className="h-72 flex items-center justify-center">
            <div className="w-full h-full bg-muted/30 animate-pulse rounded-lg" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

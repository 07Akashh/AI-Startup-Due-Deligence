'use client';

import { use } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Zap, Clock, BarChart2 } from 'lucide-react';
import type { DashboardStats } from '@/app/actions/reports';

interface StatCardsProps {
  statsPromise: Promise<DashboardStats>;
}

export function StatCards({ statsPromise }: StatCardsProps) {
  const stats = use(statsPromise);

  const cards = [
    {
      label: 'Total Reports',
      value: stats.totalReports ?? 0,
      display: String(stats.totalReports ?? 0),
      sub: '+2 from last month',
      icon: <FileText className="h-4 w-4 text-muted-foreground" />,
    },
    {
      label: 'Tokens Analyzed',
      value: stats.totalTokens ?? 0,
      display: (stats.totalTokens ?? 0).toLocaleString(),
      sub: 'AI context window used',
      icon: <Zap className="h-4 w-4 text-emerald-500" />,
    },
    {
      label: 'Avg. AI Processing',
      value: stats.averageRuntimeMs ?? 0,
      display: `${Math.round(stats.averageRuntimeMs ?? 0).toLocaleString()} ms`,
      sub: 'Per report generated',
      icon: <Clock className="h-4 w-4 text-blue-500" />,
    },
    {
      label: 'Success Rate',
      value: 100,
      display: '100%',
      sub: 'Validation pass rate',
      icon: <BarChart2 className="h-4 w-4 text-purple-500" />,
    },
  ];

  return (
    <>
      {cards.map((c) => (
        <Card key={c.label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{c.label}</CardTitle>
            {c.icon}
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{c.display}</div>
            <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

export function StatCardsSkeleton() {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="h-3 w-28 bg-muted animate-pulse rounded" />
            <div className="h-4 w-4 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-20 bg-muted animate-pulse rounded mb-2" />
            <div className="h-3 w-32 bg-muted/60 animate-pulse rounded" />
          </CardContent>
        </Card>
      ))}
    </>
  );
}

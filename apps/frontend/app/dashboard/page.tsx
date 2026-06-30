import { Suspense } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { getDashboardStatsAction } from '@/app/actions/reports';
import { StatCards, StatCardsSkeleton } from './_components/StatCards';
import { StatsCharts, StatsChartsSkeleton } from './_components/StatsCharts';
import { RecentJobsCard, RecentJobsCardSkeleton } from './_components/RecentJobsCard';

export default function DashboardPage() {
  const statsPromise = getDashboardStatsAction();

  return (
    <div className="space-y-8 animate-fade-in-up pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            VentureLens Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time due diligence processing insights.
          </p>
        </div>
        <Link href="/dashboard/new">
          <Button className="gap-2 shadow-sm">
            <PlusCircle className="h-4 w-4" />
            New Report
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Suspense fallback={<StatCardsSkeleton />}>
          <StatCards statsPromise={statsPromise} />
        </Suspense>
      </div>
      <Suspense
        fallback={
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StatsChartsSkeleton />
            <RecentJobsCardSkeleton />
          </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="contents">
            <StatsCharts statsPromise={statsPromise} />
          </div>
          <RecentJobsCard statsPromise={statsPromise} />
        </div>
      </Suspense>
    </div>
  );
}

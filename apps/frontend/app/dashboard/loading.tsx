import { StatCardsSkeleton } from './_components/StatCards';
import { StatsChartsSkeleton } from './_components/StatsCharts';
import { RecentJobsCardSkeleton } from './_components/RecentJobsCard';

export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-fade-in-up pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="h-9 w-64 bg-muted animate-pulse rounded-md" />
          <div className="h-4 w-80 bg-muted/60 animate-pulse rounded-md mt-2" />
        </div>
        <div className="h-10 w-32 bg-muted animate-pulse rounded-md" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCardsSkeleton />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatsChartsSkeleton />
        <RecentJobsCardSkeleton />
      </div>
    </div>
  );
}

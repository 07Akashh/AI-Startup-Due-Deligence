'use client';

import { use } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { DashboardStats } from '@/app/actions/reports';

interface RecentJobsCardProps {
  statsPromise: Promise<DashboardStats>;
}

export function RecentJobsCard({ statsPromise }: RecentJobsCardProps) {
  const stats = use(statsPromise);

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Recent Reports Queue</CardTitle>
        <CardDescription>Live background job processing statuses.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {!stats.recentJobs || stats.recentJobs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground border border-dashed rounded-lg">
              No reports generated yet. Click &quot;New Report&quot; to start.
            </div>
          ) : (
            stats.recentJobs.slice(0, 4).map(
              (job: { id: string; status: string; createdAt: string }) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex flex-col gap-1">
                    <div className="font-medium text-sm flex items-center gap-2">
                      Job #{job.id.slice(-6)}
                      {job.status === 'COMPLETE' ? (
                        <Badge
                          variant="outline"
                          className="text-emerald-600 border-emerald-600 bg-emerald-50 text-[10px] h-5"
                        >
                          Completed
                        </Badge>
                      ) : job.status === 'FAILED' ? (
                        <Badge
                          variant="outline"
                          className="text-destructive border-destructive bg-destructive/10 text-[10px] h-5"
                        >
                          Failed
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="bg-primary/10 text-primary text-[10px] h-5 animate-pulse"
                        >
                          Processing
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(job.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {job.status === 'COMPLETE' && (
                    <Link href={`/dashboard/reports/${job.id}/report`}>
                      <Button variant="outline" size="sm" className="h-8 text-xs">
                        View Report
                      </Button>
                    </Link>
                  )}
                </div>
              ),
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function RecentJobsCardSkeleton() {
  return (
    <Card className="col-span-1">
      <CardHeader>
        <div className="h-5 w-44 bg-muted animate-pulse rounded" />
        <div className="h-3 w-52 bg-muted/60 animate-pulse rounded mt-1" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="flex flex-col gap-2 w-full">
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                <div className="h-3 w-24 bg-muted/60 animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

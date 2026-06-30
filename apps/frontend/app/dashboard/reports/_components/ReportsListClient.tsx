'use client';

import { useTransition, useOptimistic } from 'react';
import { useRouter } from 'next/navigation';
import { archiveReportAction, type CompletedReport } from '@/app/actions/reports';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, FileText, Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface ReportsListClientProps {
  initialReports: CompletedReport[];
  page: number;
  totalPages: number;
  totalReports: number;
}

export function ReportsListClient({
  initialReports,
  page,
  totalPages,
  totalReports,
}: ReportsListClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [optimisticReports, addOptimisticArchive] = useOptimistic<
    CompletedReport[],
    string
  >(initialReports, (current, idToRemove) =>
    current.filter((r) => r.id !== idToRemove),
  );

  const handleArchive = (reportId: string) => {
    startTransition(async () => {
      addOptimisticArchive(reportId);
      const result = await archiveReportAction(reportId);
      if (!result.success) {
        alert(result.error || 'Failed to archive report.');
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className={`transition-opacity duration-200 ${isPending ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Startup Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Recommendation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {optimisticReports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center py-6 space-y-2">
                      <FileText className="w-10 h-10 text-muted-foreground/50" />
                      <p>No completed reports found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                optimisticReports.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-black text-slate-900">{job.startupName}</TableCell>
                    <TableCell>{new Date(job.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {job.report ? (
                        <span className="font-bold">{job.report.investmentScore}/100</span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {job.report?.recommendation === 'STRONG_INVEST' && <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Strong Invest</Badge>}
                      {job.report?.recommendation === 'INVEST' && <Badge className="bg-blue-100 text-blue-800 border-blue-200">Invest</Badge>}
                      {job.report?.recommendation === 'NEEDS_MORE_INFO' && <Badge className="bg-amber-100 text-amber-800 border-amber-200">Needs Info</Badge>}
                      {job.report?.recommendation === 'PASS' && <Badge className="bg-rose-100 text-rose-800 border-rose-200">Pass</Badge>}
                      {!job.report && '-'}
                    </TableCell>
                    <TableCell>
                      {job.status === 'COMPLETE' ? (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-600 bg-emerald-50">Completed</Badge>
                      ) : job.status === 'FAILED' ? (
                        <Badge variant="outline" className="text-destructive border-destructive bg-destructive/10">Failed</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-primary/10 text-primary">In Progress</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {job.status === 'COMPLETE' ? (
                          <Link href={`/dashboard/reports/${job.id}/report`}>
                            <Button variant="outline" size="sm">View Report</Button>
                          </Link>
                        ) : job.status !== 'FAILED' ? (
                          <Link href={`/dashboard/reports/${job.id}`}>
                            <Button variant="ghost" size="sm">Watch Progress</Button>
                          </Link>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Archive report"
                          onClick={() => handleArchive(job.id)}
                          disabled={isPending}
                        >
                          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalReports > 0 && (
        <div className="flex items-center justify-between pt-4 bg-white p-4 rounded-xl border border-border mt-4">
          <div className="text-sm text-muted-foreground">
            Showing{' '}
            <span className="font-semibold text-foreground">
              {(page - 1) * 10 + 1}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-foreground">
              {Math.min(page * 10, totalReports)}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-foreground">{totalReports}</span>{' '}
            completed reports
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              className="gap-1"
              nativeButton={false}
              render={<Link href={`/dashboard/reports?page=${Math.max(1, page - 1)}`} />}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              className="gap-1"
              nativeButton={false}
              render={<Link href={`/dashboard/reports?page=${Math.min(totalPages, page + 1)}`} />}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

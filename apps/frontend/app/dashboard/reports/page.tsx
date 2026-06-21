'use client';

import { useEffect, useState } from 'react';
import { getReportsList } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, FileText, PlusCircle } from 'lucide-react';
import Link from 'next/link';

interface CompletedReport {
  id: string;
  createdAt: string;
  status: string;
  startupName: string;
  startupTagline: string;
  report?: {
    investmentScore?: number;
    recommendation?: string;
  };
}

export default function ReportsPage() {
  const [reports, setReports] = useState<CompletedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReports, setTotalReports] = useState(0);

  useEffect(() => {
    let active = true;
    getReportsList(page, 10)
      .then((data) => {
        if (!active) return;
        setReports(data.reports || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalReports(data.pagination?.total || 0);
      })
      .catch(console.error)
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page]);

  const handlePageChange = (newPage: number) => {
    setLoading(true);
    setPage(newPage);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">My Reports</h1>
          <p className="text-muted-foreground mt-1">A list of all the due diligence reports you&apos;ve generated.</p>
        </div>
        <Link href="/dashboard/new">
          <Button className="gap-2">
            <PlusCircle className="w-4 h-4" />
            New Report
          </Button>
        </Link>
      </div>

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
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Loading reports...</TableCell>
                </TableRow>
              ) : reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center py-6 space-y-2">
                      <FileText className="w-10 h-10 text-muted-foreground/50" />
                      <p>No completed reports found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                reports.map((job) => (
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
                      {job.status === 'COMPLETE' ? (
                        <Link href={`/dashboard/reports/${job.id}/report`}>
                          <Button variant="outline" size="sm">View Report</Button>
                        </Link>
                      ) : job.status !== 'FAILED' ? (
                        <Link href={`/dashboard/reports/${job.id}`}>
                          <Button variant="ghost" size="sm">Watch Progress</Button>
                        </Link>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalReports > 0 && (
        <div className="flex items-center justify-between pt-4 bg-white p-4 rounded-xl border border-border">
          <div className="text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{(page - 1) * 10 + 1}</span> to{' '}
            <span className="font-semibold text-foreground">{Math.min(page * 10, totalReports)}</span> of{' '}
            <span className="font-semibold text-foreground">{totalReports}</span> completed reports
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="gap-1"
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

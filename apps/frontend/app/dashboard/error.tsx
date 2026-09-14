'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, RotateCcw, PlusCircle, FileText } from 'lucide-react';

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    console.error('[Dashboard Error Boundary]:', error);
  }, [error]);

  return (
    <div className="space-y-6 animate-fade-in-up py-6">
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className="bg-destructive/10 text-destructive border-destructive/20 text-xs font-semibold px-3 py-1"
        >
          <AlertCircle className="w-3.5 h-3.5 mr-1" />
          Dashboard Stream Interrupted
        </Badge>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Unable to Load Dashboard Data
        </h1>
        <p className="text-muted-foreground max-w-xl text-sm leading-relaxed">
          We encountered a synchronization issue while loading your analytics or report records.
        </p>
      </div>

      <Card className="border-border shadow-sm bg-card overflow-hidden max-w-2xl">
        <CardContent className="p-6 space-y-4">
          <div className="p-3.5 bg-muted/60 rounded-lg text-xs font-mono text-foreground/80 space-y-1">
            <span className="font-semibold text-destructive">Error Details:</span>
            <p className="text-muted-foreground break-words">
              {error.message || 'An unexpected rendering error occurred in the dashboard.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={() => reset()} className="gap-2 shadow-sm">
              <RotateCcw className="w-4 h-4" />
              Reload View
            </Button>

            <Link href="/dashboard/new">
              <Button variant="outline" className="gap-2">
                <PlusCircle className="w-4 h-4" />
                Generate New Report
              </Button>
            </Link>

            <Link href="/dashboard/reports">
              <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
                <FileText className="w-4 h-4" />
                View All Reports
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

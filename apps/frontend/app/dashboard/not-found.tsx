'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileQuestion, PlusCircle, ArrowLeft } from 'lucide-react';

export default function DashboardNotFound() {
  return (
    <div className="space-y-6 animate-fade-in-up py-6">
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className="bg-amber-50 text-amber-800 border-amber-200 text-xs font-semibold px-3 py-1"
        >
          <FileQuestion className="w-3.5 h-3.5 mr-1 text-amber-600" />
          Record Not Found
        </Badge>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Due Diligence Report Not Found
        </h1>
        <p className="text-muted-foreground max-w-xl text-sm leading-relaxed">
          The report or job ID you requested does not exist or has been archived.
        </p>
      </div>

      <Card className="border-border shadow-sm bg-card overflow-hidden max-w-2xl">
        <CardContent className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            You can generate a new AI due diligence analysis or view your completed reports list.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/dashboard/new">
              <Button className="gap-2 shadow-sm">
                <PlusCircle className="w-4 h-4" />
                Start New Report
              </Button>
            </Link>

            <Link href="/dashboard/reports">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to My Reports
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { getReportsListAction } from "@/app/actions/reports";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import Link from "next/link";
import { ReportsListClient } from "./_components/ReportsListClient";

interface ReportsPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const params = await searchParams;
  const page = Number(params.page || "1");

  const result = await getReportsListAction(page, 10);

  if (!result.success) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              My Reports
            </h1>
            <p className="text-muted-foreground mt-1">
              A list of all the due diligence reports you&apos;ve generated.
            </p>
          </div>
        </div>
        <div
          role="alert"
          className="p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md"
        >
          {result.error ?? "Failed to load reports."}
        </div>
      </div>
    );
  }

  const reports = result.reports ?? [];
  const totalPages = result.pagination?.totalPages ?? 1;
  const totalReports = result.pagination?.total ?? 0;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            My Reports
          </h1>
          <p className="text-muted-foreground mt-1">
            A list of all the due diligence reports you&apos;ve generated.
          </p>
        </div>
        <Link href="/dashboard/new">
          <Button className="gap-2">
            <PlusCircle className="w-4 h-4" />
            New Report
          </Button>
        </Link>
      </div>

      <ReportsListClient
        key={page}
        initialReports={reports}
        page={page}
        totalPages={totalPages}
        totalReports={totalReports}
      />
    </div>
  );
}

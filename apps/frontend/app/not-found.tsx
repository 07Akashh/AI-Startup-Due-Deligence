'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Compass,
  LayoutDashboard,
  FileText,
  Home,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-slate-50 to-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 selection:bg-primary selection:text-primary-foreground">
      <div className="max-w-xl w-full text-center space-y-8 animate-fade-in-up">
        {/* Top badge */}
        <div className="flex justify-center">
          <Badge
            variant="outline"
            className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider bg-white/80 backdrop-blur-sm border-slate-200 text-slate-700 shadow-sm flex items-center gap-1.5"
          >
            <Compass className="w-3.5 h-3.5 text-indigo-500 animate-spin" style={{ animationDuration: '10s' }} />
            404 · Page Not Found
          </Badge>
        </div>

        {/* Hero Visual */}
        <div className="relative flex justify-center items-center py-4">
          <div className="absolute w-44 h-44 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="relative text-8xl sm:text-9xl font-black tracking-tighter text-slate-900 select-none">
            4<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-violet-600">0</span>4
          </div>
        </div>

        {/* Messaging */}
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Lost in the Deal Flow?
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-md mx-auto leading-relaxed">
            The due diligence page or report you are looking for has moved, expired, or does not exist in our system.
          </p>
        </div>

        {/* Action Card */}
        <Card className="border-border/80 shadow-lg shadow-slate-200/50 bg-white/90 backdrop-blur-md overflow-hidden text-left">
          <CardContent className="p-6 space-y-4">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              Recommended Navigation
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link href="/dashboard" className="w-full">
                <Button className="w-full justify-start gap-2.5 h-11 text-sm shadow-sm">
                  <LayoutDashboard className="w-4 h-4 text-primary-foreground/80" />
                  <span>Go to Overview</span>
                </Button>
              </Link>

              <Link href="/dashboard/reports" className="w-full">
                <Button variant="outline" className="w-full justify-start gap-2.5 h-11 text-sm bg-white hover:bg-slate-50">
                  <FileText className="w-4 h-4 text-slate-600" />
                  <span>Browse My Reports</span>
                </Button>
              </Link>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Looking for the landing page?</span>
              <Link
                href="/"
                className="font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group"
              >
                <span>VentureLens Home</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer info */}
        <div className="text-xs text-slate-400">
          VentureLens AI Due Diligence System · Enterprise Intelligence
        </div>
      </div>
    </div>
  );
}

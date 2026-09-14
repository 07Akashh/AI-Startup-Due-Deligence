'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wrench, RefreshCw, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function ServiceUnavailablePage() {
  const [checking, setChecking] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  const checkHealth = async () => {
    setChecking(true);
    try {
      const res = await fetch('/api/health').catch(() => null);
      if (res && res.ok) {
        setIsOnline(true);
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
      } else {
        setIsOnline(false);
      }
    } catch {
      setIsOnline(false);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-amber-50/30 to-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 selection:bg-amber-500 selection:text-white">
      <div className="max-w-xl w-full text-center space-y-8 animate-fade-in-up">
        {/* Status Badge */}
        <div className="flex justify-center">
          <Badge
            variant="outline"
            className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider bg-amber-50 border-amber-200 text-amber-800 shadow-sm flex items-center gap-1.5"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            503 · Service Upgrading & Maintenance
          </Badge>
        </div>

        {/* Hero Visual */}
        <div className="relative flex justify-center items-center py-2">
          <div className="absolute w-44 h-44 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="relative text-7xl sm:text-8xl font-black tracking-tighter text-slate-900 select-none">
            5<span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">0</span>3
          </div>
        </div>

        {/* Messaging */}
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Engine Temporarily Unavailable
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-md mx-auto leading-relaxed">
            We are performing essential scheduled maintenance and multi-agent model upgrades to improve due diligence speed and accuracy.
          </p>
        </div>

        {/* Action Card */}
        <Card className="border-border/80 shadow-lg shadow-slate-200/50 bg-white/95 backdrop-blur-md overflow-hidden text-left">
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={checkHealth}
                disabled={checking}
                className="w-full justify-center gap-2 h-11 text-sm shadow-sm bg-slate-900 hover:bg-slate-800"
              >
                <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
                <span>{checking ? 'Checking Status...' : 'Check Connection & Retry'}</span>
              </Button>

              <Link href="/" className="w-full">
                <Button
                  variant="outline"
                  className="w-full justify-center gap-2 h-11 text-sm bg-white hover:bg-slate-50"
                >
                  <Wrench className="w-4 h-4 text-slate-600" />
                  <span>Platform Overview</span>
                </Button>
              </Link>
            </div>

            {isOnline === true && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2 animate-fade-in-up">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Service restored! Redirecting to your dashboard...</span>
              </div>
            )}

            {isOnline === false && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2 animate-fade-in-up">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Maintenance still underway. Please check back in a few minutes.</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer info */}
        <div className="text-xs text-slate-400">
          VentureLens Autonomous Due Diligence Infrastructure · 99.9% Target Uptime
        </div>
      </div>
    </div>
  );
}

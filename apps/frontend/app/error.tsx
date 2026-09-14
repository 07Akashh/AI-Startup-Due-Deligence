'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  RotateCcw,
  LayoutDashboard,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  LifeBuoy,
} from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootError({ error, reset }: ErrorProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Log exception for telemetry
    console.error('[RootError Boundary Captured]:', error);
  }, [error]);

  const handleCopy = () => {
    const errorPayload = `Error: ${error.message}\nDigest: ${error.digest ?? 'N/A'}\nStack:\n${error.stack ?? 'N/A'}`;
    navigator.clipboard.writeText(errorPayload).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-rose-50/30 to-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 selection:bg-rose-500 selection:text-white">
      <div className="max-w-xl w-full text-center space-y-8 animate-fade-in-up">
        {/* Error Status Badge */}
        <div className="flex justify-center">
          <Badge
            variant="outline"
            className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider bg-rose-50 border-rose-200 text-rose-700 shadow-sm flex items-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            500 · System Anomaly Detected
          </Badge>
        </div>

        {/* Hero Visual */}
        <div className="relative flex justify-center items-center py-2">
          <div className="absolute w-44 h-44 bg-rose-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="relative text-7xl sm:text-8xl font-black tracking-tighter text-slate-900 select-none">
            5<span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-amber-600">0</span>0
          </div>
        </div>

        {/* Messaging */}
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Something Went Unexpectedly Wrong
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-md mx-auto leading-relaxed">
            Our multi-agent pipeline encountered an unexpected state. Your data is safe, and we have recorded this incident.
          </p>
        </div>

        {/* Action Card */}
        <Card className="border-border/80 shadow-lg shadow-slate-200/50 bg-white/95 backdrop-blur-md overflow-hidden text-left">
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                onClick={() => reset()}
                className="w-full justify-center gap-2 h-11 text-sm shadow-sm bg-slate-900 hover:bg-slate-800"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Try Again</span>
              </Button>

              <Link href="/dashboard" className="w-full">
                <Button
                  variant="outline"
                  className="w-full justify-center gap-2 h-11 text-sm bg-white hover:bg-slate-50"
                >
                  <LayoutDashboard className="w-4 h-4 text-slate-600" />
                  <span>Return to Dashboard</span>
                </Button>
              </Link>
            </div>

            {/* Diagnostic Details Accordion */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 hover:text-slate-700 py-1"
              >
                <span>Technical Diagnostics & Digest</span>
                {showDetails ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {showDetails && (
                <div className="mt-3 p-3.5 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono text-left space-y-2 relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 text-slate-400">
                    <span>Digest: {error.digest ?? 'unknown'}</span>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="flex items-center gap-1 hover:text-white transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Trace</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-rose-400 break-words font-medium">
                    {error.message || 'An unhandled application error occurred.'}
                  </p>
                  {error.stack && (
                    <div className="max-h-32 overflow-y-auto text-[11px] text-slate-400 whitespace-pre-wrap leading-relaxed">
                      {error.stack}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Support Note */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <LifeBuoy className="w-3.5 h-3.5 text-slate-400" />
          <span>If this persists, contact support or refresh your browser cache.</span>
        </div>
      </div>
    </div>
  );
}

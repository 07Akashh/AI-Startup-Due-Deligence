'use client';

import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('[Global Root Layout Error]:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans antialiased">
        <div className="max-w-lg w-full text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <span>Critical Application Exception</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              VentureLens Engine Error
            </h1>
            <p className="text-sm text-slate-400">
              The root application shell crashed unexpectedly. Please try resetting the app session.
            </p>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-left space-y-3 font-mono text-xs">
            <div className="text-rose-400 font-medium break-words">
              {error.message || 'Fatal system error'}
            </div>
            {error.digest && (
              <div className="text-slate-500 text-[11px]">
                Digest Reference: {error.digest}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => reset()}
              className="px-5 py-2.5 bg-white text-slate-950 font-semibold text-sm rounded-lg hover:bg-slate-200 transition-colors shadow-sm"
            >
              Reload Application
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = '/dashboard';
              }}
              className="px-5 py-2.5 bg-slate-800 text-slate-200 font-medium text-sm rounded-lg hover:bg-slate-700 transition-colors border border-slate-700"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

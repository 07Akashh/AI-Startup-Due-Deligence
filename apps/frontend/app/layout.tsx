import type { Metadata } from 'next';
import './globals.css';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'VentureLens.ai | Institutional AI Startup Due Diligence Platform',
  description:
    'Institutional-grade AI due diligence for Venture Capital, Angel Investors, and Founders. Upload pitch deck PDFs, financials, and websites for automated deep intelligence reports.',
  keywords: 'VentureLens, startup due diligence, AI venture capital, pitch deck analysis, investor memo, VC intelligence, rahulkr',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    title: 'VentureLens.ai | AI Startup Due Diligence Platform',
    description: 'AI-powered due diligence reports for investors and founders',
    type: 'website',
  },
};

import { AuthProvider } from '@/components/AuthProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import './globals.css';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'AI Startup Due Diligence Assistant | StartupAI',
  description:
    'Upload your pitch deck, website, and financials — receive a comprehensive AI-powered due diligence report in minutes. Built for investors and founders.',
  keywords: 'startup due diligence, AI analysis, pitch deck, venture capital, investor tools',
  openGraph: {
    title: 'AI Startup Due Diligence Assistant',
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

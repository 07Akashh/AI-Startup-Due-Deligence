'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/components/AuthProvider';
import { Search, Brain, FileText, Zap, ShieldCheck, PieChart, ArrowRight, LayoutDashboard } from 'lucide-react';

const FEATURES = [
  {
    icon: <Brain className="h-6 w-6 text-primary" />,
    title: 'Multi-Agent AI Pipeline',
    desc: '6 specialized AI agents — Intake, Extraction, Knowledge, Reasoning, Validator, Action — work in concert to analyze your startup.',
  },
  {
    icon: <FileText className="h-6 w-6 text-primary" />,
    title: 'Multimodal Analysis',
    desc: 'Upload pitch deck PDFs, paste your website URL, and attach financial CSVs. Every format, processed intelligently.',
  },
  {
    icon: <Search className="h-6 w-6 text-primary" />,
    title: 'RAG-Powered Insights',
    desc: 'Pinecone vector search retrieves the most relevant context for each report section — no hallucinations, grounded analysis.',
  },
  {
    icon: <PieChart className="h-6 w-6 text-primary" />,
    title: 'Investment Score',
    desc: 'A weighted 0–100 investment attractiveness score with a clear recommendation: Strong Invest, Invest, Pass, or Needs More Info.',
  },
  {
    icon: <Zap className="h-6 w-6 text-primary" />,
    title: 'Real-Time Progress',
    desc: 'Watch each agent complete in real-time via live event streaming. No waiting in the dark.',
  },
  {
    icon: <ShieldCheck className="h-6 w-6 text-primary" />,
    title: 'Production Grade',
    desc: 'Rate limiting, Zod validation, quality gates, retry logic, and structured output — built for reliability.',
  },
];

export default function LandingPage() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
              V
            </div>
            <span className="font-bold text-lg tracking-tight">VentureLens AI</span>
          </div>
          <nav className="flex items-center gap-4">
            {!loading && user ? (
              <Link href="/dashboard">
                <Button variant="default" size="sm">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">Log in</Button>
                </Link>
                <Link href="/signup">
                  <Button variant="default" size="sm">Get Started</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden py-24 lg:py-32">
          {/* Background Gradient */}
          <div className="absolute inset-0 -z-10 h-full w-full bg-white [background:radial-gradient(125%_125%_at_50%_10%,#fff_40%,#e2e8f0_100%)]"></div>
          
          <div className="container mx-auto max-w-6xl px-4 md:px-8 text-center">
            <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 mb-8">
              <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
              Powered by GPT-4o, LangGraph & Pinecone
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground mb-6">
              AI-Powered <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-500">Due Diligence</span> in Minutes
            </h1>

            <p className="mx-auto max-w-2xl text-lg text-muted-foreground mb-10 leading-relaxed">
              Upload your pitch deck, website URL, and financial model. Six specialized AI agents analyze everything and deliver a comprehensive investment report — scored, validated, and ready to share.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!loading && user ? (
                <Link href="/dashboard/new">
                  <Button size="lg" className="px-8 h-12 text-md">
                    Start Free Analysis <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <Link href="/signup">
                  <Button size="lg" className="px-8 h-12 text-md">
                    Start Free Analysis <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              )}
              <Link href="#how-it-works">
                <Button variant="outline" size="lg" className="px-8 h-12 text-md bg-white">
                  See How It Works
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-20 grid grid-cols-2 gap-8 border-t border-border/50 pt-10 md:grid-cols-4 lg:mx-20">
              {[
                { value: '~3min', label: 'Analysis Time' },
                { value: '9', label: 'Report Sections' },
                { value: '6', label: 'AI Agents' },
                { value: '10', label: 'Free Reports' },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col items-center justify-center space-y-2">
                  <h3 className="text-3xl font-bold">{stat.value}</h3>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="how-it-works" className="py-24 bg-slate-50 border-t border-b border-border">
          <div className="container mx-auto max-w-6xl px-4 md:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Built for Real Due Diligence</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Not a chatbot. A structured, multi-agent analysis pipeline with validation at every step.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature, index) => (
                <Card key={index} className="border-border shadow-sm bg-card hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base text-muted-foreground">
                      {feature.desc}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-24 relative overflow-hidden">
          <div className="container mx-auto max-w-4xl px-4 text-center">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">Ready to streamline your deal flow?</h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
              Join top founders and investors using VentureLens AI to uncover risks, validate strengths, and make smarter investment decisions.
            </p>
            {!loading && user ? (
              <Link href="/dashboard">
                <Button size="lg" className="px-10 h-14 text-lg">Go to Dashboard</Button>
              </Link>
            ) : (
              <Link href="/signup">
                <Button size="lg" className="px-10 h-14 text-lg">Create Free Account</Button>
              </Link>
            )}
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t py-8 bg-slate-50">
        <div className="container mx-auto max-w-6xl px-4 md:px-8 flex flex-col md:flex-row items-center justify-between text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} VentureLens AI. All rights reserved.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <span>Powered by Next.js, LangGraph & OpenAI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

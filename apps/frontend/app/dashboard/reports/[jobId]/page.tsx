'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSSE, SSEEvent } from '@/hooks/useSSE';
import { getJob } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Search, Cog, Brain, Lightbulb, CheckCircle2, ClipboardList } from 'lucide-react';

type AgentStatus = 'pending' | 'running' | 'complete' | 'error';

interface AgentInfo {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: AgentStatus;
  messages: string[];
}

const INITIAL_AGENTS: AgentInfo[] = [
  { id: 'intake',     name: 'Intake Agent',     icon: <Search className="w-5 h-5" />,       description: 'Validating inputs and initializing job',        status: 'pending', messages: [] },
  { id: 'extraction', name: 'Extraction Agent', icon: <Cog className="w-5 h-5" />,          description: 'Extracting content from all uploaded sources',   status: 'pending', messages: [] },
  { id: 'knowledge',  name: 'Knowledge Agent',  icon: <Brain className="w-5 h-5" />,        description: 'Building RAG vector index in Pinecone',          status: 'pending', messages: [] },
  { id: 'reasoning',  name: 'Reasoning Agent',  icon: <Lightbulb className="w-5 h-5" />,    description: 'Generating all 8 report sections with AI',       status: 'pending', messages: [] },
  { id: 'validator',  name: 'Validator Agent',  icon: <CheckCircle2 className="w-5 h-5" />, description: 'Quality gate — schema and completeness check',    status: 'pending', messages: [] },
  { id: 'action',     name: 'Action Agent',     icon: <ClipboardList className="w-5 h-5" />,description: 'Persisting final report and delivering results', status: 'pending', messages: [] },
];

export default function AnalysisProgressPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();

  const [agents, setAgents] = useState<AgentInfo[]>(INITIAL_AGENTS);
  // Remove unused events state
  const [done, setDone] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [startedAt] = useState(() => Date.now());

  useEffect(() => {
    getJob(jobId).then((job: { status?: string }) => {
      if (job?.status === 'COMPLETE') {
        setDone(true);
        setTimeout(() => router.push(`/dashboard/reports/${jobId}/report`), 1000);
      } else if (job?.status === 'FAILED') {
        setAgents(a => a.map(ag => ag.status === 'running' ? { ...ag, status: 'error' } : ag));
      }
    }).catch(() => {});
  }, [jobId, router]);

  useEffect(() => {
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  const handleEvent = useCallback((event: SSEEvent) => {

    setAgents(prev => prev.map(ag => {
      if (ag.id !== event.agent) return ag;

      const newStatus: AgentStatus =
        event.eventType === 'start'    ? 'running' :
        event.eventType === 'complete' ? 'complete' :
        event.eventType === 'error'    ? 'error' : ag.status;

      return {
        ...ag,
        status: newStatus,
        messages: [...ag.messages, event.message],
      };
    }));
  }, []);

  const handleDone = useCallback(() => {
    setDone(true);
    setTimeout(() => router.push(`/dashboard/reports/${jobId}/report`), 1500);
  }, [jobId, router]);

  useSSE(jobId, { onEvent: handleEvent, onDone: handleDone });

  const completedCount = agents.filter(a => a.status === 'complete').length;
  const progressPercent = Math.round((completedCount / agents.length) * 100);
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Analysis in Progress</h1>
          <p className="text-muted-foreground mt-1">Job ID: {jobId}</p>
        </div>
        <Badge variant="outline" className="px-3 py-1 font-mono text-sm bg-background">
          ⏱️ {fmt(elapsed)}
        </Badge>
      </div>

      <Card className="mb-8">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-end">
            <div>
              <CardTitle>Pipeline Status</CardTitle>
              <CardDescription>{completedCount} of {agents.length} agents completed</CardDescription>
            </div>
            <span className="font-bold text-xl">{progressPercent}%</span>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={progressPercent} className="h-2" />
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {agents.map(agent => (
          <Card 
            key={agent.id} 
            className={`transition-all duration-500 overflow-hidden ${
              agent.status === 'running' ? 'border-primary ring-1 ring-primary/20 shadow-md' :
              agent.status === 'complete' ? 'border-emerald-500/50 bg-emerald-50/10' :
              agent.status === 'error' ? 'border-destructive/50 bg-destructive/5' : ''
            }`}
          >
            <div className="p-4 flex items-start gap-4">
              <div className={`mt-1 p-2 rounded-lg flex-shrink-0 ${
                agent.status === 'running' ? 'bg-primary/10 text-primary animate-pulse' :
                agent.status === 'complete' ? 'bg-emerald-100 text-emerald-600' :
                agent.status === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
              }`}>
                {agent.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold">{agent.name}</h3>
                  <Badge variant={
                    agent.status === 'running' ? 'default' :
                    agent.status === 'complete' ? 'outline' :
                    agent.status === 'error' ? 'destructive' : 'secondary'
                  } className={agent.status === 'complete' ? 'text-emerald-600 border-emerald-600 bg-emerald-50' : ''}>
                    {agent.status === 'pending' ? 'Waiting' :
                     agent.status === 'running' ? 'Running...' :
                     agent.status === 'complete' ? 'Complete' : 'Error'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {agent.messages.length > 0 ? agent.messages[agent.messages.length - 1] : agent.description}
                </p>
                
                {agent.status === 'running' && agent.messages.length > 1 && (
                  <div className="mt-4 p-3 bg-slate-50 border border-border rounded-md text-xs font-mono text-muted-foreground max-h-32 overflow-y-auto space-y-2">
                    {agent.messages.slice(-5).map((msg, idx) => (
                      <div key={idx} className="flex gap-2">
                        <span className="text-primary/70">{'>'}</span>
                        <span className="break-all">{msg}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {done && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-fade-in-up">
          <CheckCircle2 className="w-24 h-24 text-emerald-500 mb-6" />
          <h2 className="text-4xl font-bold tracking-tight mb-2">Analysis Complete!</h2>
          <p className="text-xl text-muted-foreground">Redirecting to your report...</p>
        </div>
      )}
    </div>
  );
}

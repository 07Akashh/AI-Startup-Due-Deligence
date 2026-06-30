'use client';

import { useState, useCallback, useRef, useTransition, useOptimistic } from 'react';
import { useRouter } from 'next/navigation';
import { uploadPitchDeck, uploadFinancials } from '@/lib/api';
import { createJobAction } from '@/app/actions/jobs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Globe, DollarSign, CheckCircle2, ArrowRight, UploadCloud, Loader2 } from 'lucide-react';

type Step = 1 | 2 | 3 | 4;

interface UploadState {
  pitchDeckFile: File | null;
  pitchDeckUrl: string | null;
  websiteUrl: string;
  financialFile: File | null;
  financialCsvUrl: string | null;
  startupStage: string;
}

const STEPS = [
  { n: 1, label: 'Pitch Deck', icon: <FileText className="w-5 h-5" /> },
  { n: 2, label: 'Website', icon: <Globe className="w-5 h-5" /> },
  { n: 3, label: 'Financials', icon: <DollarSign className="w-5 h-5" /> },
  { n: 4, label: 'Review', icon: <CheckCircle2 className="w-5 h-5" /> },
];

export default function NewReportPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [state, setState] = useState<UploadState>({
    pitchDeckFile: null, pitchDeckUrl: null,
    websiteUrl: '',
    financialFile: null, financialCsvUrl: null,
    startupStage: '',
  });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<'pdf' | 'csv' | null>(null);
  const [isPending, startTransition] = useTransition();
  const [optimisticBtnLabel, setOptimisticBtnLabel] =
    useOptimistic<string>('Generate Report (-1 Credit)');

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const handlePdfFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('PDF must be under 50 MB.');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const result = await uploadPitchDeck(file);
      setState(s => ({ ...s, pitchDeckFile: file, pitchDeckUrl: result.url }));
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(`Upload failed: ${err.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  }, []);

  const handleCsvFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a CSV file.');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const result = await uploadFinancials(file);
      setState(s => ({ ...s, financialFile: file, financialCsvUrl: result.url }));
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(`Upload failed: ${err.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  }, []);

  const handleSubmit = () => {
    if (!state.pitchDeckUrl && !state.websiteUrl && !state.financialCsvUrl) {
      setError('Please provide at least one input.');
      return;
    }
    setError(null);
    startTransition(async () => {
      setOptimisticBtnLabel('Queuing Analysis…');
      const result = await createJobAction({
        pitchDeckUrl: state.pitchDeckUrl ?? undefined,
        websiteUrl: state.websiteUrl || undefined,
        financialCsvUrl: state.financialCsvUrl ?? undefined,
        startupStage: state.startupStage || undefined,
      });

      if (!result.success || !result.jobId) {
        setError(`Failed to start analysis: ${result.error ?? 'Unknown error'}`);
        return;
      }

      router.push(`/dashboard/reports/${result.jobId}`);
    });
  };

  return (
    <div className="max-w-3xl mx-auto py-8 animate-fade-in-up">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">New Due Diligence Report</h1>
        <p className="text-muted-foreground mt-2">Upload your assets. 1 credit will be deducted.</p>
      </div>

      {/* Step Progress */}
      <div className="flex justify-center items-center mb-10">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center">
            <div
              className={`flex flex-col items-center gap-2 cursor-pointer ${step === s.n ? 'opacity-100' : 'opacity-60'}`}
              onClick={() => { if (s.n < step) setStep(s.n as Step); }}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors ${
                step === s.n ? 'bg-primary text-primary-foreground border-primary' : 
                step > s.n ? 'bg-emerald-50 text-emerald-600 border-emerald-500' : 'bg-card text-muted-foreground border-border'
              }`}>
                {s.icon}
              </div>
              <span className="text-xs font-semibold">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-16 h-1 mx-2 rounded-full ${step > s.n ? 'bg-emerald-500' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="p-4 mb-6 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md text-center font-medium">
          {error}
        </div>
      )}

      <Card className="shadow-sm border-border">
        {/* STEP 1 */}
        {step === 1 && (
          <>
            <CardHeader>
              <CardTitle>Pitch Deck</CardTitle>
              <CardDescription>Upload the startup&apos;s pitch deck (PDF only, max 50MB).</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                onClick={() => pdfInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver('pdf'); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => { e.preventDefault(); setDragOver(null); const f = e.dataTransfer.files[0]; if (f) handlePdfFile(f); }}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                  dragOver === 'pdf' ? 'border-primary bg-primary/5' : 
                  state.pitchDeckFile ? 'border-emerald-500 bg-emerald-50/50' : 'border-border hover:border-primary/50 hover:bg-slate-50'
                }`}
              >
                <input ref={pdfInputRef} type="file" accept=".pdf" className="hidden" onChange={e => e.target.files?.[0] && handlePdfFile(e.target.files[0])} />
                
                {uploading ? (
                  <div className="flex flex-col items-center">
                    <UploadCloud className="w-12 h-12 text-primary animate-pulse mb-4" />
                    <p className="font-semibold text-primary">Uploading...</p>
                  </div>
                ) : state.pitchDeckFile ? (
                  <div className="flex flex-col items-center">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4" />
                    <p className="font-bold text-emerald-600">{state.pitchDeckFile.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">Click to replace</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="font-semibold mb-1">Drop your pitch deck here</p>
                    <p className="text-sm text-muted-foreground">or click to browse</p>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t p-6">
              <Button variant="ghost" onClick={() => setStep(2)}>Skip (no deck)</Button>
              <Button disabled={!state.pitchDeckFile || uploading} onClick={() => setStep(2)}>
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardFooter>
          </>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <>
            <CardHeader>
              <CardTitle>Website URL</CardTitle>
              <CardDescription>We&apos;ll scrape their public site for context.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 pt-4 pb-12">
                <Label>URL</Label>
                <div className="flex items-center">
                  <span className="flex items-center justify-center px-4 border border-r-0 border-border rounded-l-md bg-muted text-muted-foreground h-10">
                    https://
                  </span>
                  <Input 
                    value={state.websiteUrl.replace(/^https?:\/\//, '')}
                    onChange={e => setState(s => ({ ...s, websiteUrl: e.target.value }))}
                    placeholder="startup.com"
                    className="rounded-l-none"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t p-6">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep(3)}>Skip</Button>
                <Button onClick={() => setStep(3)}>Continue <ArrowRight className="w-4 h-4 ml-2" /></Button>
              </div>
            </CardFooter>
          </>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <>
            <CardHeader>
              <CardTitle>Financials</CardTitle>
              <CardDescription>Upload a CSV of their monthly financials (revenue, burn, etc).</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                onClick={() => csvInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver('csv'); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => { e.preventDefault(); setDragOver(null); const f = e.dataTransfer.files[0]; if (f) handleCsvFile(f); }}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                  dragOver === 'csv' ? 'border-primary bg-primary/5' : 
                  state.financialFile ? 'border-emerald-500 bg-emerald-50/50' : 'border-border hover:border-primary/50 hover:bg-slate-50'
                }`}
              >
                <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={e => e.target.files?.[0] && handleCsvFile(e.target.files[0])} />
                
                {uploading ? (
                  <div className="flex flex-col items-center">
                    <UploadCloud className="w-12 h-12 text-primary animate-pulse mb-4" />
                    <p className="font-semibold text-primary">Uploading...</p>
                  </div>
                ) : state.financialFile ? (
                  <div className="flex flex-col items-center">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4" />
                    <p className="font-bold text-emerald-600">{state.financialFile.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">Click to replace</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <DollarSign className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="font-semibold mb-1">Drop your financial CSV here</p>
                    <p className="text-sm text-muted-foreground">or click to browse</p>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t p-6">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep(4)}>Skip</Button>
                <Button onClick={() => setStep(4)}>Review <ArrowRight className="w-4 h-4 ml-2" /></Button>
              </div>
            </CardFooter>
          </>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <>
            <CardHeader>
              <CardTitle>Review & Submit</CardTitle>
              <CardDescription>Confirm your assets to generate the report.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-6">
                <div className="flex flex-col space-y-2 pb-4">
                  <Label>Current Funding Stage (Optional)</Label>
                  <select
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    value={state.startupStage}
                    onChange={(e) => setState(s => ({ ...s, startupStage: e.target.value }))}
                  >
                    <option value="">Select Stage...</option>
                    <option value="Bootstrapped / Not Raising">Bootstrapped / Not Raising</option>
                    <option value="Pre-Seed">Pre-Seed</option>
                    <option value="Seed">Seed</option>
                    <option value="Series A">Series A</option>
                    <option value="Series B+">Series B+</option>
                    <option value="Pre-IPO / Public">Pre-IPO / Public</option>
                  </select>
                  <p className="text-xs text-muted-foreground">Select the current funding stage for a more accurate analysis.</p>
                </div>

                {[
                  { label: 'Pitch Deck', value: state.pitchDeckFile?.name, icon: <FileText className="w-4 h-4 text-muted-foreground" /> },
                  { label: 'Website URL', value: state.websiteUrl, icon: <Globe className="w-4 h-4 text-muted-foreground" /> },
                  { label: 'Financials', value: state.financialFile?.name, icon: <DollarSign className="w-4 h-4 text-muted-foreground" /> },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between p-4 rounded-lg border border-border bg-slate-50">
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-sm text-muted-foreground">{item.value || 'Not provided'}</p>
                      </div>
                    </div>
                    {item.value ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <div className="w-5 h-5 border-2 border-muted-foreground rounded-full opacity-30" />}
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t p-6">
              <Button variant="outline" onClick={() => setStep(3)} disabled={isPending}>Back</Button>
              <Button
                id="generate-report-btn"
                onClick={handleSubmit}
                disabled={isPending || (!state.pitchDeckFile && !state.websiteUrl && !state.financialFile)}
                className="w-56 gap-2"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {optimisticBtnLabel}
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FileUpload } from '@/components/ui/FileUpload';
import { ProgressBar } from '@/components/ui/Progress';
import { Badge } from '@/components/ui/Badge';

interface AnalysisJob {
  id: string;
  file: File;
  status: 'pending' | 'analyzing' | 'complete' | 'error';
  progress: number;
  stage: string;
  error?: string;
}

export default function HomePage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [jobs, setJobs] = useState<AnalysisJob[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);

  const handleFilesSelected = useCallback((selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setJobs(
      selectedFiles.map((file) => ({
        id: crypto.randomUUID(),
        file,
        status: 'pending',
        progress: 0,
        stage: 'Waiting...',
      }))
    );
  }, []);

  const analyzeDocuments = async () => {
    if (files.length === 0) return;

    setIsAnalyzing(true);
    setOverallProgress(0);

    const results: any[] = [];
    const totalFiles = files.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const jobId = jobs[i].id;

      setJobs((prev) =>
        prev.map((job) =>
          job.id === jobId ? { ...job, status: 'analyzing', stage: 'Starting...' } : job
        )
      );

      const stages = [
        { stage: 'Uploading...', progress: 10 },
        { stage: 'Extracting metadata...', progress: 25 },
        { stage: 'Analyzing compression...', progress: 40 },
        { stage: 'Checking structure...', progress: 55 },
        { stage: 'Running visual analysis...', progress: 75 },
        { stage: 'Generating report...', progress: 90 },
      ];

      let stageIndex = 0;
      const progressInterval = setInterval(() => {
        if (stageIndex < stages.length) {
          const { stage, progress } = stages[stageIndex];
          setJobs((prev) =>
            prev.map((job) =>
              job.id === jobId ? { ...job, stage, progress } : job
            )
          );
          stageIndex++;
        }
      }, 600);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/analyze', {
          method: 'POST',
          body: formData,
        });

        clearInterval(progressInterval);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Analysis failed');
        }

        const report = await response.json();
        results.push(report);

        saveToHistory(report);

        setJobs((prev) =>
          prev.map((job) =>
            job.id === jobId ? { ...job, status: 'complete', progress: 100, stage: 'Complete' } : job
          )
        );
      } catch (error) {
        clearInterval(progressInterval);
        setJobs((prev) =>
          prev.map((job) =>
            job.id === jobId
              ? { ...job, status: 'error', error: error instanceof Error ? error.message : 'Failed' }
              : job
          )
        );
      }

      setOverallProgress(((i + 1) / totalFiles) * 100);
    }

    if (results.length === 1) {
      sessionStorage.setItem('forensicReport', JSON.stringify(results[0]));
      router.push('/results');
    } else if (results.length > 1) {
      setIsAnalyzing(false);
    }
  };

  const saveToHistory = (report: any) => {
    const historyItem = {
      id: crypto.randomUUID(),
      documentName: report.documentName,
      documentType: report.documentType,
      documentSize: report.documentSize,
      analysisTimestamp: report.analysisTimestamp,
      overallRisk: report.overallRisk,
      riskScore: report.riskScore,
      findingCount: report.findings.length,
      report,
    };

    const existing = localStorage.getItem('analysisHistory');
    const history = existing ? JSON.parse(existing) : [];
    history.unshift(historyItem);
    localStorage.setItem('analysisHistory', JSON.stringify(history.slice(0, 100)));
  };

  const allComplete = jobs.every((job) => job.status === 'complete' || job.status === 'error');
  const hasErrors = jobs.some((job) => job.status === 'error');

  return (
    <div className="min-h-screen bg-grid">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-forensic-highlight/5 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative">
          <div className="text-center max-w-3xl mx-auto animate-fade-in">
            <Badge variant="danger" className="mb-6">
              Document Fraud Up 244% in 2024
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              Enterprise Document
              <span className="block text-forensic-highlight">Authenticity Analysis</span>
            </h1>
            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              Professional-grade forensic analysis for legal professionals, compliance teams, and security experts.
              Detect manipulation, forgery, and tampering with AI-powered precision.
            </p>

            <div className="flex flex-wrap justify-center gap-8 mb-12">
              <StatItem value="$30B+" label="Annual Fraud Losses" />
              <StatItem value="<2min" label="Average Analysis Time" />
              <StatItem value="6+" label="Analysis Engines" />
            </div>
          </div>
        </div>
      </section>

      {/* Main Upload Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-16">
        <Card variant="elevated" padding="lg" className="animate-slide-up">
          {!isAnalyzing ? (
            <>
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-white mb-2">Upload Documents</h2>
                <p className="text-gray-400">
                  Drag and drop files or click to browse. Analyze multiple documents at once.
                </p>
              </div>

              <FileUpload
                onFilesSelected={handleFilesSelected}
                maxFiles={10}
                className="mb-6"
              />

              {files.length > 0 && (
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={analyzeDocuments}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Analyze {files.length} Document{files.length !== 1 ? 's' : ''}
                </Button>
              )}
            </>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-white mb-2">
                  {allComplete ? 'Analysis Complete' : 'Analyzing Documents'}
                </h2>
                <p className="text-gray-400">
                  {allComplete
                    ? hasErrors
                      ? 'Some analyses completed with errors.'
                      : 'All documents have been analyzed successfully.'
                    : `Processing ${jobs.filter((j) => j.status === 'analyzing').length} of ${jobs.length} documents...`}
                </p>
              </div>

              <ProgressBar
                value={overallProgress}
                variant="gradient"
                showLabel
                label="Overall Progress"
              />

              <div className="grid gap-3 max-h-80 overflow-y-auto">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className={`
                      flex items-center gap-4 p-4 rounded-xl border transition-all
                      ${job.status === 'complete' ? 'bg-green-500/10 border-green-500/30' : ''}
                      ${job.status === 'error' ? 'bg-red-500/10 border-red-500/30' : ''}
                      ${job.status === 'analyzing' ? 'bg-forensic-highlight/10 border-forensic-highlight/30' : ''}
                      ${job.status === 'pending' ? 'bg-forensic-dark/50 border-gray-700/30' : ''}
                    `}
                  >
                    <div className="flex-shrink-0">
                      {job.status === 'complete' && (
                        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                      {job.status === 'error' && (
                        <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      )}
                      {job.status === 'analyzing' && (
                        <div className="w-8 h-8 rounded-full bg-forensic-highlight flex items-center justify-center animate-pulse">
                          <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        </div>
                      )}
                      {job.status === 'pending' && (
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{job.file.name}</p>
                      <p className="text-xs text-gray-400">
                        {job.status === 'error' ? job.error : job.stage}
                      </p>
                    </div>

                    {job.status === 'analyzing' && (
                      <span className="text-sm font-mono text-forensic-highlight">
                        {Math.round(job.progress)}%
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {allComplete && (
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => {
                      setIsAnalyzing(false);
                      setFiles([]);
                      setJobs([]);
                    }}
                  >
                    Analyze More
                  </Button>
                  <Button variant="primary" className="flex-1" onClick={() => router.push('/history')}>
                    View History
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Comprehensive Analysis Suite</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Six specialized analysis engines work in parallel to detect even the most sophisticated manipulations.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            title="Metadata Analysis"
            description="Extract creation software, edit history, device info, GPS coordinates, and detect timeline inconsistencies."
          />
          <FeatureCard
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
            }
            title="Compression Analysis"
            description="Detect resave artifacts, quality variance, JPEG block patterns, and compression inconsistencies."
          />
          <FeatureCard
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            }
            title="Structure Analysis"
            description="Check for hidden layers, embedded JavaScript, form fields, redactions, and incremental updates."
          />
          <FeatureCard
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            }
            title="Font Analysis"
            description="Detect mixed font usage, unusual typefaces, copy-paste indicators, and font embedding issues."
          />
          <FeatureCard
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            }
            title="Visual Analysis"
            description="Error Level Analysis (ELA), clone detection, edge analysis, and noise pattern examination."
          />
          <FeatureCard
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            }
            title="ML Detection"
            description="AI-powered forgery detection using deep learning models trained on millions of documents."
          />
        </div>
      </section>

      {/* Trust Banner */}
      <section className="border-t border-gray-800/50 bg-forensic-mid/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Enterprise Ready</h3>
              <p className="text-gray-400">
                Built for legal professionals, compliance teams, and security experts.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <TrustBadge label="SOC 2 Ready" />
              <TrustBadge label="GDPR Compliant" />
              <TrustBadge label="End-to-End Encryption" />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              DocForensics provides indicators, not guarantees. Professional forensic examination may be required for legal purposes.
            </p>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">API Docs</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl md:text-3xl font-bold text-forensic-highlight mb-1">{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card hover className="card-hover">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-forensic-highlight/20 flex items-center justify-center text-forensic-highlight">
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-white mb-2">{title}</h3>
          <p className="text-sm text-gray-400">{description}</p>
        </div>
      </div>
    </Card>
  );
}

function TrustBadge({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/30">
      <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
      <span className="text-xs font-medium text-green-400">{label}</span>
    </div>
  );
}

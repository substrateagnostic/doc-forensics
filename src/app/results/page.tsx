'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ForensicReport, Finding, RiskLevel } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RiskBadge, Badge } from '@/components/ui/Badge';
import { CircularProgress } from '@/components/ui/Progress';

export default function ResultsPage() {
  const router = useRouter();
  const [report, setReport] = useState<ForensicReport | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showEla, setShowEla] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('forensicReport');
    if (!stored) {
      router.push('/');
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      setReport(parsed);
      saveToHistory(parsed);
    } catch {
      router.push('/');
    }
  }, [router]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const saveToHistory = (report: ForensicReport) => {
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

    // Avoid duplicates based on hash
    if (!history.some((h: any) => h.report?.documentHash === report.documentHash)) {
      history.unshift(historyItem);
      localStorage.setItem('analysisHistory', JSON.stringify(history.slice(0, 100)));
    }
  };

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-forensic-highlight/20 flex items-center justify-center animate-pulse">
            <svg className="w-8 h-8 text-forensic-highlight animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <p className="text-gray-400">Loading report...</p>
        </div>
      </div>
    );
  }

  const categories = [
    { id: 'all', label: 'All', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
    { id: 'metadata', label: 'Metadata', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 'compression', label: 'Compression', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7' },
    { id: 'structure', label: 'Structure', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2' },
    { id: 'fonts', label: 'Fonts', icon: 'M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129' },
    { id: 'visual', label: 'Visual', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' },
    { id: 'ml', label: 'ML', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  ];

  const filteredFindings = activeCategory === 'all'
    ? report.findings
    : report.findings.filter(f => f.category === activeCategory);

  const downloadJson = () => {
    const exportData = { ...report };
    delete (exportData as any).visual?.elaImageBase64; // Remove large base64 for JSON
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forensic-report-${report.documentName.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const downloadMarkdown = () => {
    const md = generateMarkdownReport(report);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forensic-report-${report.documentName.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const printReport = () => {
    window.print();
    setShowExportMenu(false);
  };

  const criticalCount = report.findings.filter(f => f.severity === 'critical').length;
  const suspiciousCount = report.findings.filter(f => f.severity === 'suspicious').length;
  const warningCount = report.findings.filter(f => f.severity === 'warning').length;
  const infoCount = report.findings.filter(f => f.severity === 'info').length;

  return (
    <div className="min-h-screen bg-grid">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 no-print">
          <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            New Analysis
          </Link>

          <div className="relative" ref={exportMenuRef}>
            <Button
              variant="secondary"
              onClick={() => setShowExportMenu(!showExportMenu)}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Report
              <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-forensic-mid border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden animate-scale-in">
                <button
                  onClick={downloadJson}
                  className="w-full px-4 py-3 text-left text-sm text-white hover:bg-white/5 flex items-center gap-3 transition-colors"
                >
                  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download JSON
                </button>
                <button
                  onClick={downloadMarkdown}
                  className="w-full px-4 py-3 text-left text-sm text-white hover:bg-white/5 flex items-center gap-3 transition-colors"
                >
                  <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Markdown
                </button>
                <button
                  onClick={printReport}
                  className="w-full px-4 py-3 text-left text-sm text-white hover:bg-white/5 flex items-center gap-3 transition-colors border-t border-gray-700/50"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Report
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Document Summary & Risk Score */}
        <div className="grid lg:grid-cols-4 gap-6 mb-8">
          <Card className="lg:col-span-3 animate-fade-in">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">Forensic Analysis Report</h1>
                <p className="text-gray-400">
                  Analyzed on {new Date(report.analysisTimestamp).toLocaleDateString()} at {new Date(report.analysisTimestamp).toLocaleTimeString()}
                </p>
              </div>
              <RiskBadge risk={report.overallRisk} size="lg" />
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-forensic-dark/50">
                <p className="text-sm text-gray-400 mb-1">Document</p>
                <p className="text-white font-medium truncate">{report.documentName}</p>
              </div>
              <div className="p-4 rounded-xl bg-forensic-dark/50">
                <p className="text-sm text-gray-400 mb-1">Type</p>
                <p className="text-white font-medium">{report.documentType}</p>
              </div>
              <div className="p-4 rounded-xl bg-forensic-dark/50">
                <p className="text-sm text-gray-400 mb-1">Size</p>
                <p className="text-white font-medium">{formatBytes(report.documentSize)}</p>
              </div>
              <div className="sm:col-span-2 lg:col-span-3 p-4 rounded-xl bg-forensic-dark/50">
                <p className="text-sm text-gray-400 mb-1">SHA-256 Hash</p>
                <p className="text-white font-mono text-sm break-all">{report.documentHash}</p>
              </div>
            </div>
          </Card>

          <Card className="flex flex-col items-center justify-center animate-fade-in-delay-1">
            <CircularProgress
              value={report.riskScore}
              size={140}
              strokeWidth={10}
              label="Risk Score"
            />
            <p className="text-sm text-gray-400 mt-4 text-center">
              {report.riskScore < 25 ? 'Document appears authentic' :
               report.riskScore < 50 ? 'Minor concerns detected' :
               report.riskScore < 75 ? 'Significant concerns' :
               'High likelihood of manipulation'}
            </p>
          </Card>
        </div>

        {/* Finding Counts */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <CountCard severity="critical" count={criticalCount} />
          <CountCard severity="suspicious" count={suspiciousCount} />
          <CountCard severity="warning" count={warningCount} />
          <CountCard severity="info" count={infoCount} />
        </div>

        {/* Recommendations */}
        {report.recommendations.length > 0 && (
          <Card className="mb-8 animate-slide-up">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Recommendations
            </h2>
            <ul className="space-y-3">
              {report.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-300">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-forensic-highlight/20 text-forensic-highlight flex items-center justify-center text-xs font-medium">
                    {i + 1}
                  </span>
                  {rec}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* ELA Visualization */}
        {report.visual.elaImageBase64 && (
          <Card className="mb-8">
            <button
              onClick={() => setShowEla(!showEla)}
              className="flex items-center justify-between w-full"
            >
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Error Level Analysis (ELA)
              </h2>
              <svg className={`w-5 h-5 text-gray-400 transition-transform ${showEla ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showEla && (
              <div className="mt-4 animate-fade-in">
                <p className="text-sm text-gray-400 mb-4">
                  Bright areas indicate regions with different compression levels, which may suggest editing.
                  Uniform brightness typically indicates an unmodified image.
                </p>
                <div className="relative rounded-xl overflow-hidden border border-gray-700">
                  <img
                    src={`data:image/png;base64,${report.visual.elaImageBase64}`}
                    alt="Error Level Analysis"
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Category Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-print">
          {categories.map(cat => {
            const count = cat.id === 'all'
              ? report.findings.length
              : report.findings.filter(f => f.category === cat.id).length;

            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm whitespace-nowrap transition-all
                  ${activeCategory === cat.id
                    ? 'bg-forensic-highlight text-white shadow-lg shadow-forensic-highlight/20'
                    : 'bg-forensic-mid/50 text-gray-400 hover:text-white border border-gray-700/50 hover:border-gray-600'
                  }
                `}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={cat.icon} />
                </svg>
                <span>{cat.label}</span>
                {count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${activeCategory === cat.id ? 'bg-white/20' : 'bg-gray-700'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Findings List */}
        <div className="space-y-3 mb-8">
          {filteredFindings.length === 0 ? (
            <Card className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-white font-medium mb-1">No findings in this category</p>
              <p className="text-gray-400 text-sm">This is a good sign for document authenticity.</p>
            </Card>
          ) : (
            filteredFindings.map((finding, i) => (
              <FindingCard key={finding.id + i} finding={finding} />
            ))
          )}
        </div>

        {/* Metadata Summary */}
        {report.metadata.summary && Object.values(report.metadata.summary).some(v => v) && (
          <Card className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Metadata Summary
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {report.metadata.summary.creationSoftware && (
                <MetaItem label="Creation Software" value={report.metadata.summary.creationSoftware} />
              )}
              {report.metadata.summary.modificationSoftware && (
                <MetaItem label="Last Modified By" value={report.metadata.summary.modificationSoftware} />
              )}
              {report.metadata.summary.createDate && (
                <MetaItem label="Created" value={report.metadata.summary.createDate} />
              )}
              {report.metadata.summary.modifyDate && (
                <MetaItem label="Modified" value={report.metadata.summary.modifyDate} />
              )}
              {report.metadata.summary.author && (
                <MetaItem label="Author" value={report.metadata.summary.author} />
              )}
              {report.metadata.summary.deviceMake && (
                <MetaItem label="Device" value={`${report.metadata.summary.deviceMake} ${report.metadata.summary.deviceModel || ''}`} />
              )}
              {report.metadata.summary.gpsLocation && (
                <MetaItem
                  label="GPS Location"
                  value={`${report.metadata.summary.gpsLocation.lat.toFixed(6)}, ${report.metadata.summary.gpsLocation.lng.toFixed(6)}`}
                  link={`https://www.google.com/maps?q=${report.metadata.summary.gpsLocation.lat},${report.metadata.summary.gpsLocation.lng}`}
                />
              )}
            </div>
          </Card>
        )}

        {/* Disclaimer */}
        <div className="text-center text-sm text-gray-500 pb-8">
          <p>
            This analysis provides indicators that may suggest manipulation but cannot
            definitively prove or disprove authenticity. Professional forensic examination
            may be required for legal purposes.
          </p>
        </div>
      </div>
    </div>
  );
}

function CountCard({ severity, count }: { severity: string; count: number }) {
  const config: Record<string, { label: string; bg: string; text: string; border: string }> = {
    critical: { label: 'Critical', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
    suspicious: { label: 'Suspicious', bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
    warning: { label: 'Warning', bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
    info: { label: 'Info', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  };

  const c = config[severity];

  return (
    <div className={`${c.bg} rounded-xl p-4 text-center border ${c.border} animate-fade-in`}>
      <div className={`text-3xl font-bold ${c.text} mb-1`}>{count}</div>
      <div className="text-sm text-gray-400">{c.label}</div>
    </div>
  );
}

function FindingCard({ finding }: { finding: Finding }) {
  const [expanded, setExpanded] = useState(false);

  const severityConfig: Record<string, { bg: string; border: string; iconBg: string; iconColor: string }> = {
    critical: { bg: 'bg-red-500/5', border: 'border-red-500/30', iconBg: 'bg-red-500/20', iconColor: 'text-red-400' },
    suspicious: { bg: 'bg-orange-500/5', border: 'border-orange-500/30', iconBg: 'bg-orange-500/20', iconColor: 'text-orange-400' },
    warning: { bg: 'bg-yellow-500/5', border: 'border-yellow-500/30', iconBg: 'bg-yellow-500/20', iconColor: 'text-yellow-400' },
    info: { bg: 'bg-blue-500/5', border: 'border-blue-500/30', iconBg: 'bg-blue-500/20', iconColor: 'text-blue-400' },
  };

  const c = severityConfig[finding.severity];

  return (
    <div className={`${c.bg} rounded-xl border ${c.border} overflow-hidden transition-all`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left flex items-start gap-4"
      >
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${c.iconBg} flex items-center justify-center`}>
          <svg className={`w-5 h-5 ${c.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {finding.severity === 'critical' ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            ) : finding.severity === 'suspicious' ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            ) : finding.severity === 'warning' ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            )}
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="default" size="sm">{finding.category}</Badge>
          </div>
          <h3 className="font-medium text-white">{finding.title}</h3>
          <p className="text-sm text-gray-400 mt-1">{finding.description}</p>
        </div>
        <svg className={`flex-shrink-0 w-5 h-5 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (finding.technicalDetails || finding.recommendation) && (
        <div className="px-4 pb-4 border-t border-gray-700/30 pt-4 ml-14 animate-fade-in">
          {finding.technicalDetails && (
            <div className="mb-4">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Technical Details</span>
              <p className="text-sm text-gray-300 mono mt-2 p-3 bg-forensic-dark/50 rounded-lg">{finding.technicalDetails}</p>
            </div>
          )}
          {finding.recommendation && (
            <div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Recommendation</span>
              <p className="text-sm text-forensic-highlight mt-2">{finding.recommendation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetaItem({ label, value, link }: { label: string; value: string; link?: string }) {
  return (
    <div className="p-3 rounded-lg bg-forensic-dark/50">
      <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" className="block text-forensic-highlight hover:underline mt-1">
          {value}
          <svg className="inline-block w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      ) : (
        <p className="text-white mt-1">{value}</p>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function generateMarkdownReport(report: ForensicReport): string {
  const lines: string[] = [];

  lines.push('# DocForensics Analysis Report');
  lines.push('');
  lines.push(`**Generated:** ${new Date(report.analysisTimestamp).toLocaleString()}`);
  lines.push('');

  lines.push('## Document Information');
  lines.push('');
  lines.push(`| Property | Value |`);
  lines.push(`|----------|-------|`);
  lines.push(`| Document | ${report.documentName} |`);
  lines.push(`| Type | ${report.documentType} |`);
  lines.push(`| Size | ${formatBytes(report.documentSize)} |`);
  lines.push(`| SHA-256 | \`${report.documentHash}\` |`);
  lines.push('');

  lines.push('## Risk Assessment');
  lines.push('');
  lines.push(`- **Risk Level:** ${report.overallRisk.toUpperCase()}`);
  lines.push(`- **Risk Score:** ${report.riskScore}/100`);
  lines.push('');

  lines.push('### Finding Summary');
  lines.push('');
  const critical = report.findings.filter(f => f.severity === 'critical').length;
  const suspicious = report.findings.filter(f => f.severity === 'suspicious').length;
  const warning = report.findings.filter(f => f.severity === 'warning').length;
  const info = report.findings.filter(f => f.severity === 'info').length;
  lines.push(`- Critical: ${critical}`);
  lines.push(`- Suspicious: ${suspicious}`);
  lines.push(`- Warning: ${warning}`);
  lines.push(`- Info: ${info}`);
  lines.push('');

  if (report.recommendations.length > 0) {
    lines.push('## Recommendations');
    lines.push('');
    report.recommendations.forEach((rec, i) => {
      lines.push(`${i + 1}. ${rec}`);
    });
    lines.push('');
  }

  lines.push('## Detailed Findings');
  lines.push('');

  const categories = ['critical', 'suspicious', 'warning', 'info'];
  categories.forEach(severity => {
    const findings = report.findings.filter(f => f.severity === severity);
    if (findings.length > 0) {
      lines.push(`### ${severity.charAt(0).toUpperCase() + severity.slice(1)} Findings`);
      lines.push('');
      findings.forEach(finding => {
        lines.push(`#### ${finding.title}`);
        lines.push('');
        lines.push(`**Category:** ${finding.category}`);
        lines.push('');
        lines.push(finding.description);
        lines.push('');
        if (finding.technicalDetails) {
          lines.push(`**Technical Details:** \`${finding.technicalDetails}\``);
          lines.push('');
        }
        if (finding.recommendation) {
          lines.push(`**Recommendation:** ${finding.recommendation}`);
          lines.push('');
        }
      });
    }
  });

  lines.push('---');
  lines.push('');
  lines.push('*Generated by DocForensics - Enterprise Document Authenticity Analysis*');
  lines.push('');
  lines.push('*This analysis provides indicators that may suggest manipulation but cannot definitively prove or disprove authenticity.*');

  return lines.join('\n');
}

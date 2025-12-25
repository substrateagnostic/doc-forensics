'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { DonutChart, BarChart, StatCard } from '@/components/ui/Chart';
import { CircularProgress } from '@/components/ui/Progress';
import { Badge, RiskBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ForensicReport, RiskLevel } from '@/lib/types';

interface AnalysisHistoryItem {
  id: string;
  documentName: string;
  documentType: string;
  analysisTimestamp: string;
  overallRisk: RiskLevel;
  riskScore: number;
  findingCount: number;
}

export default function DashboardPage() {
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [stats, setStats] = useState({
    totalAnalyses: 0,
    criticalFindings: 0,
    averageRiskScore: 0,
    documentsThisWeek: 0,
  });

  useEffect(() => {
    // Load history from localStorage
    const stored = localStorage.getItem('analysisHistory');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AnalysisHistoryItem[];
        setHistory(parsed);

        // Calculate stats
        const total = parsed.length;
        const critical = parsed.filter((h) => h.overallRisk === 'critical').length;
        const avgScore = total > 0
          ? Math.round(parsed.reduce((sum, h) => sum + h.riskScore, 0) / total)
          : 0;
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const thisWeek = parsed.filter(
          (h) => new Date(h.analysisTimestamp).getTime() > weekAgo
        ).length;

        setStats({
          totalAnalyses: total,
          criticalFindings: critical,
          averageRiskScore: avgScore,
          documentsThisWeek: thisWeek,
        });
      } catch {
        // Invalid data
      }
    }
  }, []);

  const riskDistribution = [
    { label: 'Critical', value: history.filter((h) => h.overallRisk === 'critical').length, color: '#ef4444' },
    { label: 'High', value: history.filter((h) => h.overallRisk === 'high').length, color: '#f97316' },
    { label: 'Medium', value: history.filter((h) => h.overallRisk === 'medium').length, color: '#eab308' },
    { label: 'Low', value: history.filter((h) => h.overallRisk === 'low').length, color: '#22c55e' },
  ];

  const documentTypes = [
    { label: 'PDF', value: history.filter((h) => h.documentType.includes('pdf')).length, color: '#e94560' },
    { label: 'JPEG', value: history.filter((h) => h.documentType.includes('jpeg')).length, color: '#8b5cf6' },
    { label: 'PNG', value: history.filter((h) => h.documentType.includes('png')).length, color: '#06b6d4' },
    { label: 'Other', value: history.filter((h) => !h.documentType.includes('pdf') && !h.documentType.includes('jpeg') && !h.documentType.includes('png')).length, color: '#6b7280' },
  ];

  const recentAnalyses = history.slice(0, 5);

  return (
    <div className="min-h-screen bg-grid">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-400">
            Overview of your document forensics activity and insights.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="animate-fade-in-delay-1">
            <StatCard
              label="Total Analyses"
              value={stats.totalAnalyses}
              icon={
                <svg className="w-6 h-6 text-forensic-highlight" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            />
          </div>
          <div className="animate-fade-in-delay-2">
            <StatCard
              label="Critical Findings"
              value={stats.criticalFindings}
              color="#ef4444"
              icon={
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
            />
          </div>
          <div className="animate-fade-in-delay-3">
            <StatCard
              label="Avg Risk Score"
              value={stats.averageRiskScore}
              color="#eab308"
              icon={
                <svg className="w-6 h-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              }
            />
          </div>
          <div className="animate-fade-in">
            <StatCard
              label="This Week"
              value={stats.documentsThisWeek}
              color="#22c55e"
              icon={
                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
            />
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="animate-slide-up">
            <CardHeader>Risk Distribution</CardHeader>
            <CardContent>
              {history.length > 0 ? (
                <DonutChart data={riskDistribution} />
              ) : (
                <EmptyState message="No analyses yet. Upload a document to get started." />
              )}
            </CardContent>
          </Card>

          <Card className="animate-slide-up">
            <CardHeader>Document Types</CardHeader>
            <CardContent>
              {history.length > 0 ? (
                <BarChart data={documentTypes.filter((d) => d.value > 0)} />
              ) : (
                <EmptyState message="Document type breakdown will appear here." />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Analyses & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader
                action={
                  <Link href="/history" className="text-sm text-forensic-highlight hover:underline">
                    View All
                  </Link>
                }
              >
                Recent Analyses
              </CardHeader>
              <CardContent>
                {recentAnalyses.length > 0 ? (
                  <div className="space-y-3">
                    {recentAnalyses.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 p-3 rounded-xl bg-forensic-dark/50 border border-gray-700/30 hover:border-forensic-highlight/30 transition-colors"
                      >
                        <div className="flex-shrink-0">
                          <CircularProgress
                            value={item.riskScore}
                            size={50}
                            strokeWidth={4}
                            showValue={false}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {item.documentName}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(item.analysisTimestamp).toLocaleDateString()} &bull; {item.findingCount} findings
                          </p>
                        </div>
                        <RiskBadge risk={item.overallRisk} size="sm" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState message="Your recent analyses will appear here." />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>Quick Actions</CardHeader>
              <CardContent className="space-y-3">
                <Link href="/" className="block">
                  <Button variant="primary" className="w-full justify-start">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    New Analysis
                  </Button>
                </Link>
                <Link href="/history" className="block">
                  <Button variant="secondary" className="w-full justify-start">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    View History
                  </Button>
                </Link>
                <Button variant="ghost" className="w-full justify-start" disabled>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Generate Report
                  <Badge variant="info" size="sm" className="ml-auto">Soon</Badge>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-forensic-highlight/30 bg-gradient-to-br from-forensic-highlight/10 to-transparent">
              <CardHeader>System Status</CardHeader>
              <CardContent className="space-y-3">
                <StatusItem label="API Server" status="online" />
                <StatusItem label="ML Engine" status="online" />
                <StatusItem label="Storage" status="online" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-forensic-mid flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <p className="text-gray-400 text-sm">{message}</p>
      <Link href="/" className="mt-4">
        <Button variant="primary" size="sm">
          Analyze Document
        </Button>
      </Link>
    </div>
  );
}

function StatusItem({ label, status }: { label: string; status: 'online' | 'warning' | 'offline' }) {
  const config = {
    online: { color: 'bg-green-500', text: 'text-green-400', label: 'Online' },
    warning: { color: 'bg-yellow-500', text: 'text-yellow-400', label: 'Degraded' },
    offline: { color: 'bg-red-500', text: 'text-red-400', label: 'Offline' },
  };

  const c = config[status];

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-300">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${c.color}`} style={{ boxShadow: `0 0 8px currentColor` }} />
        <span className={`text-xs ${c.text}`}>{c.label}</span>
      </div>
    </div>
  );
}

'use client';

import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, RiskBadge } from '@/components/ui/Badge';
import { CircularProgress } from '@/components/ui/Progress';
import { ForensicReport } from '@/lib/types';

interface ComparisonResult {
  category: string;
  field: string;
  doc1Value: string | null;
  doc2Value: string | null;
  match: boolean;
  severity: 'match' | 'minor' | 'significant' | 'critical';
}

export default function ComparePage() {
  const [doc1, setDoc1] = useState<File | null>(null);
  const [doc2, setDoc2] = useState<File | null>(null);
  const [report1, setReport1] = useState<ForensicReport | null>(null);
  const [report2, setReport2] = useState<ForensicReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [comparisons, setComparisons] = useState<ComparisonResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback((fileNum: 1 | 2) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (fileNum === 1) {
        setDoc1(file);
        setReport1(null);
      } else {
        setDoc2(file);
        setReport2(null);
      }
      setComparisons([]);
    }
  }, []);

  const analyzeAndCompare = async () => {
    if (!doc1 || !doc2) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      // Analyze both documents in parallel
      const [result1, result2] = await Promise.all([
        analyzeDocument(doc1),
        analyzeDocument(doc2),
      ]);

      setReport1(result1);
      setReport2(result2);

      // Generate comparison results
      const comparisonResults = generateComparisons(result1, result2);
      setComparisons(comparisonResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeDocument = async (file: File): Promise<ForensicReport> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/analyze', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Analysis failed');
    }

    return response.json();
  };

  const generateComparisons = (r1: ForensicReport, r2: ForensicReport): ComparisonResult[] => {
    const results: ComparisonResult[] = [];

    // Compare basic document info
    results.push({
      category: 'Document',
      field: 'File Type',
      doc1Value: r1.documentType,
      doc2Value: r2.documentType,
      match: r1.documentType === r2.documentType,
      severity: r1.documentType === r2.documentType ? 'match' : 'significant',
    });

    results.push({
      category: 'Document',
      field: 'File Size',
      doc1Value: formatBytes(r1.documentSize),
      doc2Value: formatBytes(r2.documentSize),
      match: r1.documentSize === r2.documentSize,
      severity: r1.documentSize === r2.documentSize ? 'match' : 'minor',
    });

    results.push({
      category: 'Document',
      field: 'Hash (SHA-256)',
      doc1Value: r1.documentHash.substring(0, 16) + '...',
      doc2Value: r2.documentHash.substring(0, 16) + '...',
      match: r1.documentHash === r2.documentHash,
      severity: r1.documentHash === r2.documentHash ? 'match' : 'critical',
    });

    // Compare risk
    results.push({
      category: 'Risk Assessment',
      field: 'Risk Level',
      doc1Value: r1.overallRisk.toUpperCase(),
      doc2Value: r2.overallRisk.toUpperCase(),
      match: r1.overallRisk === r2.overallRisk,
      severity: r1.overallRisk === r2.overallRisk ? 'match' : 'significant',
    });

    results.push({
      category: 'Risk Assessment',
      field: 'Risk Score',
      doc1Value: `${r1.riskScore}/100`,
      doc2Value: `${r2.riskScore}/100`,
      match: r1.riskScore === r2.riskScore,
      severity: Math.abs(r1.riskScore - r2.riskScore) <= 10 ? 'match' : 'minor',
    });

    results.push({
      category: 'Risk Assessment',
      field: 'Total Findings',
      doc1Value: String(r1.findings.length),
      doc2Value: String(r2.findings.length),
      match: r1.findings.length === r2.findings.length,
      severity: r1.findings.length === r2.findings.length ? 'match' : 'minor',
    });

    // Compare metadata
    const meta1 = r1.metadata.summary;
    const meta2 = r2.metadata.summary;

    if (meta1.author || meta2.author) {
      results.push({
        category: 'Metadata',
        field: 'Author',
        doc1Value: meta1.author || 'N/A',
        doc2Value: meta2.author || 'N/A',
        match: meta1.author === meta2.author,
        severity: meta1.author === meta2.author ? 'match' : 'significant',
      });
    }

    if (meta1.creationSoftware || meta2.creationSoftware) {
      results.push({
        category: 'Metadata',
        field: 'Creation Software',
        doc1Value: meta1.creationSoftware || 'N/A',
        doc2Value: meta2.creationSoftware || 'N/A',
        match: meta1.creationSoftware === meta2.creationSoftware,
        severity: meta1.creationSoftware === meta2.creationSoftware ? 'match' : 'minor',
      });
    }

    if (meta1.createDate || meta2.createDate) {
      results.push({
        category: 'Metadata',
        field: 'Creation Date',
        doc1Value: meta1.createDate || 'N/A',
        doc2Value: meta2.createDate || 'N/A',
        match: meta1.createDate === meta2.createDate,
        severity: meta1.createDate === meta2.createDate ? 'match' : 'significant',
      });
    }

    if (meta1.modifyDate || meta2.modifyDate) {
      results.push({
        category: 'Metadata',
        field: 'Modification Date',
        doc1Value: meta1.modifyDate || 'N/A',
        doc2Value: meta2.modifyDate || 'N/A',
        match: meta1.modifyDate === meta2.modifyDate,
        severity: meta1.modifyDate === meta2.modifyDate ? 'match' : 'minor',
      });
    }

    // Compare structure (for PDFs)
    if (r1.structure.pageCount !== undefined || r2.structure.pageCount !== undefined) {
      results.push({
        category: 'Structure',
        field: 'Page Count',
        doc1Value: String(r1.structure.pageCount ?? 'N/A'),
        doc2Value: String(r2.structure.pageCount ?? 'N/A'),
        match: r1.structure.pageCount === r2.structure.pageCount,
        severity: r1.structure.pageCount === r2.structure.pageCount ? 'match' : 'significant',
      });
    }

    results.push({
      category: 'Structure',
      field: 'Has JavaScript',
      doc1Value: r1.structure.hasJavaScript ? 'Yes' : 'No',
      doc2Value: r2.structure.hasJavaScript ? 'Yes' : 'No',
      match: r1.structure.hasJavaScript === r2.structure.hasJavaScript,
      severity: r1.structure.hasJavaScript === r2.structure.hasJavaScript ? 'match' : 'critical',
    });

    results.push({
      category: 'Structure',
      field: 'Has Embedded Files',
      doc1Value: r1.structure.hasEmbeddedFiles ? 'Yes' : 'No',
      doc2Value: r2.structure.hasEmbeddedFiles ? 'Yes' : 'No',
      match: r1.structure.hasEmbeddedFiles === r2.structure.hasEmbeddedFiles,
      severity: r1.structure.hasEmbeddedFiles === r2.structure.hasEmbeddedFiles ? 'match' : 'significant',
    });

    // Compare fonts
    results.push({
      category: 'Fonts',
      field: 'Font Count',
      doc1Value: String(r1.fonts.fontCount),
      doc2Value: String(r2.fonts.fontCount),
      match: r1.fonts.fontCount === r2.fonts.fontCount,
      severity: r1.fonts.fontCount === r2.fonts.fontCount ? 'match' : 'minor',
    });

    // Compare compression (for images)
    if (r1.compression.jpegQuality !== undefined || r2.compression.jpegQuality !== undefined) {
      results.push({
        category: 'Compression',
        field: 'JPEG Quality',
        doc1Value: r1.compression.jpegQuality ? `${r1.compression.jpegQuality}%` : 'N/A',
        doc2Value: r2.compression.jpegQuality ? `${r2.compression.jpegQuality}%` : 'N/A',
        match: r1.compression.jpegQuality === r2.compression.jpegQuality,
        severity: r1.compression.jpegQuality === r2.compression.jpegQuality ? 'match' : 'minor',
      });
    }

    return results;
  };

  const matchCount = comparisons.filter(c => c.match).length;
  const mismatchCount = comparisons.length - matchCount;
  const criticalMismatches = comparisons.filter(c => c.severity === 'critical').length;

  return (
    <div className="min-h-screen bg-grid">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold text-white mb-2">Document Comparison</h1>
          <p className="text-gray-400">
            Compare two documents to identify differences in metadata, structure, and forensic indicators.
          </p>
        </div>

        {/* Upload Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <UploadCard
            title="Document 1"
            file={doc1}
            report={report1}
            onFileSelect={handleFileSelect(1)}
            disabled={isAnalyzing}
          />
          <UploadCard
            title="Document 2"
            file={doc2}
            report={report2}
            onFileSelect={handleFileSelect(2)}
            disabled={isAnalyzing}
          />
        </div>

        {/* Analyze Button */}
        {doc1 && doc2 && !isAnalyzing && comparisons.length === 0 && (
          <div className="text-center mb-8">
            <Button variant="primary" size="lg" onClick={analyzeAndCompare}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Analyze & Compare Documents
            </Button>
          </div>
        )}

        {/* Loading */}
        {isAnalyzing && (
          <Card className="text-center py-12 mb-8">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-forensic-highlight/20 flex items-center justify-center animate-pulse">
                <svg className="w-8 h-8 text-forensic-highlight animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <p className="text-white font-medium">Analyzing documents...</p>
              <p className="text-gray-400 text-sm">This may take a moment</p>
            </div>
          </Card>
        )}

        {/* Error */}
        {error && (
          <Card className="mb-8 border-red-500/30 bg-red-500/10">
            <div className="flex items-center gap-3 text-red-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          </Card>
        )}

        {/* Comparison Results */}
        {comparisons.length > 0 && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <SummaryCard
                label="Total Comparisons"
                value={comparisons.length}
                color="blue"
              />
              <SummaryCard
                label="Matching"
                value={matchCount}
                color="green"
              />
              <SummaryCard
                label="Differences"
                value={mismatchCount}
                color="yellow"
              />
              <SummaryCard
                label="Critical"
                value={criticalMismatches}
                color="red"
              />
            </div>

            {/* Identical Check */}
            {report1?.documentHash === report2?.documentHash && (
              <Card className="mb-8 border-green-500/30 bg-green-500/10">
                <div className="flex items-center gap-3 text-green-400">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-medium">Documents are Identical</p>
                    <p className="text-sm text-green-400/70">Both documents have the same SHA-256 hash, meaning they are byte-for-byte identical.</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Comparison Table */}
            <Card padding="none" className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-forensic-dark/50 border-b border-gray-700/50">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Category</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Field</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">{doc1?.name || 'Document 1'}</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">{doc2?.name || 'Document 2'}</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisons.map((comp, i) => (
                      <tr key={i} className="border-b border-gray-700/30 hover:bg-white/5">
                        <td className="px-4 py-3 text-sm text-gray-400">{comp.category}</td>
                        <td className="px-4 py-3 text-sm text-white font-medium">{comp.field}</td>
                        <td className="px-4 py-3 text-sm text-gray-300 font-mono">{comp.doc1Value}</td>
                        <td className="px-4 py-3 text-sm text-gray-300 font-mono">{comp.doc2Value}</td>
                        <td className="px-4 py-3 text-center">
                          <StatusBadge severity={comp.severity} match={comp.match} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Reset Button */}
            <div className="text-center mt-8">
              <Button
                variant="secondary"
                onClick={() => {
                  setDoc1(null);
                  setDoc2(null);
                  setReport1(null);
                  setReport2(null);
                  setComparisons([]);
                }}
              >
                Compare Different Documents
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function UploadCard({
  title,
  file,
  report,
  onFileSelect,
  disabled,
}: {
  title: string;
  file: File | null;
  report: ForensicReport | null;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled: boolean;
}) {
  return (
    <Card className={`transition-all ${file ? 'border-forensic-highlight/30' : ''}`}>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>

        {!file ? (
          <label className="block cursor-pointer">
            <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 hover:border-forensic-highlight/50 transition-colors">
              <svg className="w-12 h-12 text-gray-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-400">Click to select a document</p>
            </div>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif,.webp,.docx"
              onChange={onFileSelect}
              className="hidden"
              disabled={disabled}
            />
          </label>
        ) : (
          <div>
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-forensic-highlight/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-forensic-highlight" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-white font-medium truncate max-w-[200px]">{file.name}</p>
                <p className="text-gray-400 text-sm">{formatBytes(file.size)}</p>
              </div>
            </div>

            {report && (
              <div className="flex items-center justify-center gap-4 pt-4 border-t border-gray-700/50">
                <CircularProgress value={report.riskScore} size={60} strokeWidth={4} />
                <RiskBadge risk={report.overallRisk} />
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    green: 'bg-green-500/10 border-green-500/30 text-green-400',
    yellow: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    red: 'bg-red-500/10 border-red-500/30 text-red-400',
  };

  return (
    <div className={`rounded-xl p-4 text-center border ${colorClasses[color]}`}>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm opacity-70">{label}</div>
    </div>
  );
}

function StatusBadge({ severity, match }: { severity: string; match: boolean }) {
  if (match) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Match
      </span>
    );
  }

  const colors: Record<string, string> = {
    minor: 'bg-yellow-500/20 text-yellow-400',
    significant: 'bg-orange-500/20 text-orange-400',
    critical: 'bg-red-500/20 text-red-400',
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${colors[severity]}`}>
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </span>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

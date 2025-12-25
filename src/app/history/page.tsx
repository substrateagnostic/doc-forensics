'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RiskBadge } from '@/components/ui/Badge';
import { CircularProgress } from '@/components/ui/Progress';
import { ForensicReport, RiskLevel } from '@/lib/types';

interface AnalysisHistoryItem {
  id: string;
  documentName: string;
  documentType: string;
  documentSize: number;
  analysisTimestamp: string;
  overallRisk: RiskLevel;
  riskScore: number;
  findingCount: number;
  report?: ForensicReport;
}

type SortKey = 'date' | 'name' | 'risk' | 'findings';
type SortOrder = 'asc' | 'desc';

export default function HistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterRisk, setFilterRisk] = useState<RiskLevel | 'all'>('all');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    const stored = localStorage.getItem('analysisHistory');
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch {
        // Invalid data
      }
    }
  }, []);

  const filteredAndSorted = useMemo(() => {
    let result = [...history];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) =>
        item.documentName.toLowerCase().includes(query) ||
        item.documentType.toLowerCase().includes(query)
      );
    }

    // Filter by risk
    if (filterRisk !== 'all') {
      result = result.filter((item) => item.overallRisk === filterRisk);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case 'date':
          comparison = new Date(a.analysisTimestamp).getTime() - new Date(b.analysisTimestamp).getTime();
          break;
        case 'name':
          comparison = a.documentName.localeCompare(b.documentName);
          break;
        case 'risk':
          const riskOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          comparison = riskOrder[a.overallRisk] - riskOrder[b.overallRisk];
          break;
        case 'findings':
          comparison = a.findingCount - b.findingCount;
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [history, searchQuery, sortKey, sortOrder, filterRisk]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const handleViewReport = (item: AnalysisHistoryItem) => {
    if (item.report) {
      sessionStorage.setItem('forensicReport', JSON.stringify(item.report));
      router.push('/results');
    }
  };

  const handleDeleteSelected = () => {
    const updated = history.filter((item) => !selectedItems.has(item.id));
    setHistory(updated);
    localStorage.setItem('analysisHistory', JSON.stringify(updated));
    setSelectedItems(new Set());
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all history? This cannot be undone.')) {
      setHistory([]);
      localStorage.removeItem('analysisHistory');
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedItems(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredAndSorted.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredAndSorted.map((item) => item.id)));
    }
  };

  return (
    <div className="min-h-screen bg-grid">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Analysis History</h1>
            <p className="text-gray-400">
              {history.length} document{history.length !== 1 ? 's' : ''} analyzed
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/">
              <Button variant="primary">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Analysis
              </Button>
            </Link>
            {history.length > 0 && (
              <Button variant="ghost" onClick={handleClearAll}>
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Filters Bar */}
        <Card padding="sm" className="mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-forensic-dark border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-forensic-highlight"
              />
            </div>

            {/* Risk Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400 whitespace-nowrap">Risk:</span>
              <select
                value={filterRisk}
                onChange={(e) => setFilterRisk(e.target.value as RiskLevel | 'all')}
                className="bg-forensic-dark border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-forensic-highlight"
              >
                <option value="all">All</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Bulk Actions */}
            {selectedItems.size > 0 && (
              <Button variant="danger" size="sm" onClick={handleDeleteSelected}>
                Delete ({selectedItems.size})
              </Button>
            )}
          </div>
        </Card>

        {/* Table */}
        {filteredAndSorted.length > 0 ? (
          <Card padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700/50 bg-forensic-dark/50">
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedItems.size === filteredAndSorted.length && filteredAndSorted.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-600 bg-forensic-dark text-forensic-highlight focus:ring-forensic-highlight"
                      />
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white"
                      >
                        Document
                        <SortIcon active={sortKey === 'name'} order={sortOrder} />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">
                      <button
                        onClick={() => handleSort('date')}
                        className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white"
                      >
                        Date
                        <SortIcon active={sortKey === 'date'} order={sortOrder} />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleSort('risk')}
                        className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white"
                      >
                        Risk
                        <SortIcon active={sortKey === 'risk'} order={sortOrder} />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-center hidden sm:table-cell">
                      <button
                        onClick={() => handleSort('findings')}
                        className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white"
                      >
                        Findings
                        <SortIcon active={sortKey === 'findings'} order={sortOrder} />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSorted.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-gray-700/30 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          className="rounded border-gray-600 bg-forensic-dark text-forensic-highlight focus:ring-forensic-highlight"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            <CircularProgress
                              value={item.riskScore}
                              size={40}
                              strokeWidth={3}
                              showValue={false}
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate max-w-[200px]">
                              {item.documentName}
                            </p>
                            <p className="text-xs text-gray-400">
                              {item.documentType} &bull; {formatBytes(item.documentSize)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-sm text-gray-300">
                          {new Date(item.analysisTimestamp).toLocaleDateString()}
                        </span>
                        <span className="block text-xs text-gray-500">
                          {new Date(item.analysisTimestamp).toLocaleTimeString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <RiskBadge risk={item.overallRisk} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-center hidden sm:table-cell">
                        <span className="text-sm text-white">{item.findingCount}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewReport(item)}
                          disabled={!item.report}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <Card className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-forensic-mid flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No analyses found</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              {searchQuery || filterRisk !== 'all'
                ? 'No documents match your current filters.'
                : 'Start by analyzing a document. Your history will appear here.'}
            </p>
            <Link href="/">
              <Button variant="primary">Analyze Document</Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}

function SortIcon({ active, order }: { active: boolean; order: SortOrder }) {
  return (
    <svg
      className={`w-4 h-4 transition-colors ${active ? 'text-forensic-highlight' : 'text-gray-600'}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      {order === 'asc' ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      )}
    </svg>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

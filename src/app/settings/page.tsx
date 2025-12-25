'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Settings {
  autoSaveHistory: boolean;
  maxHistoryItems: number;
  showTechnicalDetails: boolean;
  darkMode: boolean;
  enableNotifications: boolean;
  defaultExportFormat: 'json' | 'markdown' | 'pdf';
  analysisTimeout: number;
  enableMLAnalysis: boolean;
  enableIDDetection: boolean;
  enableSignatureDetection: boolean;
}

const defaultSettings: Settings = {
  autoSaveHistory: true,
  maxHistoryItems: 100,
  showTechnicalDetails: true,
  darkMode: true,
  enableNotifications: true,
  defaultExportFormat: 'json',
  analysisTimeout: 30000,
  enableMLAnalysis: true,
  enableIDDetection: true,
  enableSignatureDetection: true,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('docforensics-settings');
    if (stored) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(stored) });
      } catch {
        // Use defaults
      }
    }
  }, []);

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const saveSettings = () => {
    localStorage.setItem('docforensics-settings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem('docforensics-settings');
    setSaved(false);
  };

  const clearHistory = () => {
    if (confirm('Are you sure you want to clear all analysis history? This cannot be undone.')) {
      localStorage.removeItem('docforensics-history');
      alert('History cleared successfully.');
    }
  };

  return (
    <main className="min-h-screen bg-forensic-dark p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400">Configure DocForensics to suit your workflow</p>
        </div>

        <div className="space-y-6">
          {/* Analysis Settings */}
          <Card variant="elevated" className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-forensic-highlight" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Analysis Features
            </h2>

            <div className="space-y-4">
              <ToggleSetting
                label="ML/Heuristic Analysis"
                description="Enable machine learning and heuristic-based forgery detection"
                checked={settings.enableMLAnalysis}
                onChange={(v) => updateSetting('enableMLAnalysis', v)}
              />

              <ToggleSetting
                label="ID Document Detection"
                description="Detect and analyze ID cards, passports, and similar documents"
                checked={settings.enableIDDetection}
                onChange={(v) => updateSetting('enableIDDetection', v)}
              />

              <ToggleSetting
                label="Signature Detection"
                description="Detect and analyze handwritten and digital signatures"
                checked={settings.enableSignatureDetection}
                onChange={(v) => updateSetting('enableSignatureDetection', v)}
              />

              <div className="pt-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Analysis Timeout
                </label>
                <select
                  value={settings.analysisTimeout}
                  onChange={(e) => updateSetting('analysisTimeout', Number(e.target.value))}
                  className="w-full bg-forensic-mid border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-forensic-highlight"
                >
                  <option value={15000}>15 seconds</option>
                  <option value={30000}>30 seconds</option>
                  <option value={60000}>1 minute</option>
                  <option value={120000}>2 minutes</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Display Settings */}
          <Card variant="elevated" className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-forensic-highlight" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Display
            </h2>

            <div className="space-y-4">
              <ToggleSetting
                label="Show Technical Details"
                description="Display detailed technical information in findings"
                checked={settings.showTechnicalDetails}
                onChange={(v) => updateSetting('showTechnicalDetails', v)}
              />

              <ToggleSetting
                label="Enable Notifications"
                description="Show browser notifications for completed analyses"
                checked={settings.enableNotifications}
                onChange={(v) => updateSetting('enableNotifications', v)}
              />

              <div className="pt-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Default Export Format
                </label>
                <select
                  value={settings.defaultExportFormat}
                  onChange={(e) => updateSetting('defaultExportFormat', e.target.value as Settings['defaultExportFormat'])}
                  className="w-full bg-forensic-mid border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-forensic-highlight"
                >
                  <option value="json">JSON</option>
                  <option value="markdown">Markdown</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>
            </div>
          </Card>

          {/* History Settings */}
          <Card variant="elevated" className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-forensic-highlight" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              History & Storage
            </h2>

            <div className="space-y-4">
              <ToggleSetting
                label="Auto-save to History"
                description="Automatically save completed analyses to history"
                checked={settings.autoSaveHistory}
                onChange={(v) => updateSetting('autoSaveHistory', v)}
              />

              <div className="pt-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Maximum History Items
                </label>
                <select
                  value={settings.maxHistoryItems}
                  onChange={(e) => updateSetting('maxHistoryItems', Number(e.target.value))}
                  className="w-full bg-forensic-mid border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-forensic-highlight"
                >
                  <option value={25}>25 items</option>
                  <option value={50}>50 items</option>
                  <option value={100}>100 items</option>
                  <option value={250}>250 items</option>
                </select>
              </div>

              <div className="pt-4 border-t border-gray-700">
                <Button variant="danger" onClick={clearHistory} className="w-full sm:w-auto">
                  Clear All History
                </Button>
              </div>
            </div>
          </Card>

          {/* API Configuration */}
          <Card variant="elevated" className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-forensic-highlight" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              API Configuration
            </h2>

            <div className="space-y-4">
              <div className="bg-forensic-mid/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-white">Roboflow ML Integration</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      For enhanced ML-based forgery detection, set the ROBOFLOW_API_KEY environment variable.
                      Without it, local heuristic analysis is used instead.
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Current status: <span className="text-yellow-400">Using Local Heuristics</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button onClick={saveSettings} className="flex-1 sm:flex-none">
              {saved ? 'Saved!' : 'Save Settings'}
            </Button>
            <Button variant="secondary" onClick={resetSettings}>
              Reset to Defaults
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

function ToggleSetting({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-medium text-white">{label}</div>
        <div className="text-xs text-gray-400">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full
          border-2 border-transparent transition-colors duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-forensic-highlight focus:ring-offset-2 focus:ring-offset-forensic-dark
          ${checked ? 'bg-forensic-highlight' : 'bg-gray-600'}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full
            bg-white shadow ring-0 transition duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );
}

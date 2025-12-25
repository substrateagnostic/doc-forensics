import { ForensicReport, Finding, RiskLevel } from './types';

export function formatReportAsText(report: ForensicReport): string {
  const lines: string[] = [];
  
  lines.push('═'.repeat(70));
  lines.push('DOCUMENT FORENSIC ANALYSIS REPORT');
  lines.push('═'.repeat(70));
  lines.push('');
  lines.push(`Document:    ${report.documentName}`);
  lines.push(`Type:        ${report.documentType}`);
  lines.push(`Size:        ${formatBytes(report.documentSize)}`);
  lines.push(`SHA-256:     ${report.documentHash}`);
  lines.push(`Analyzed:    ${new Date(report.analysisTimestamp).toLocaleString()}`);
  lines.push('');
  lines.push('─'.repeat(70));
  lines.push('RISK ASSESSMENT');
  lines.push('─'.repeat(70));
  lines.push(`Overall Risk: ${formatRiskLevel(report.overallRisk)} (Score: ${report.riskScore}/100)`);
  lines.push('');

  // Count findings by severity
  const counts = {
    critical: report.findings.filter(f => f.severity === 'critical').length,
    suspicious: report.findings.filter(f => f.severity === 'suspicious').length,
    warning: report.findings.filter(f => f.severity === 'warning').length,
    info: report.findings.filter(f => f.severity === 'info').length,
  };

  lines.push('Findings Summary:');
  lines.push(`  🔴 Critical:   ${counts.critical}`);
  lines.push(`  🟠 Suspicious: ${counts.suspicious}`);
  lines.push(`  🟡 Warning:    ${counts.warning}`);
  lines.push(`  🔵 Info:       ${counts.info}`);
  lines.push('');

  // Recommendations
  lines.push('─'.repeat(70));
  lines.push('RECOMMENDATIONS');
  lines.push('─'.repeat(70));
  for (const rec of report.recommendations) {
    lines.push(`• ${rec}`);
  }
  lines.push('');

  // Metadata summary
  if (report.metadata.summary) {
    lines.push('─'.repeat(70));
    lines.push('METADATA SUMMARY');
    lines.push('─'.repeat(70));
    const s = report.metadata.summary;
    if (s.creationSoftware) lines.push(`Creator:     ${s.creationSoftware}`);
    if (s.modificationSoftware) lines.push(`Producer:    ${s.modificationSoftware}`);
    if (s.createDate) lines.push(`Created:     ${s.createDate}`);
    if (s.modifyDate) lines.push(`Modified:    ${s.modifyDate}`);
    if (s.author) lines.push(`Author:      ${s.author}`);
    if (s.deviceMake) lines.push(`Device:      ${s.deviceMake} ${s.deviceModel || ''}`);
    if (s.gpsLocation) lines.push(`GPS:         ${s.gpsLocation.lat.toFixed(6)}, ${s.gpsLocation.lng.toFixed(6)}`);
    lines.push('');
  }

  // Detailed findings
  lines.push('─'.repeat(70));
  lines.push('DETAILED FINDINGS');
  lines.push('─'.repeat(70));

  // Group by category
  const categories = ['metadata', 'compression', 'structure', 'fonts', 'visual', 'ml'] as const;
  
  for (const category of categories) {
    const catFindings = report.findings.filter(f => f.category === category);
    if (catFindings.length === 0) continue;

    lines.push('');
    lines.push(`[${category.toUpperCase()}]`);
    
    for (const finding of catFindings) {
      lines.push('');
      lines.push(`  ${getSeverityIcon(finding.severity)} ${finding.title}`);
      lines.push(`     ${finding.description}`);
      if (finding.technicalDetails) {
        lines.push(`     Technical: ${finding.technicalDetails}`);
      }
      if (finding.recommendation) {
        lines.push(`     → ${finding.recommendation}`);
      }
    }
  }

  lines.push('');
  lines.push('═'.repeat(70));
  lines.push('END OF REPORT');
  lines.push('═'.repeat(70));
  lines.push('');
  lines.push('DISCLAIMER: This analysis provides indicators that may suggest');
  lines.push('manipulation but cannot definitively prove or disprove authenticity.');
  lines.push('Professional forensic examination may be required for legal purposes.');
  lines.push('');

  return lines.join('\n');
}

export function formatReportAsMarkdown(report: ForensicReport): string {
  const lines: string[] = [];
  
  lines.push('# Document Forensic Analysis Report');
  lines.push('');
  lines.push('## Document Information');
  lines.push('');
  lines.push('| Property | Value |');
  lines.push('|----------|-------|');
  lines.push(`| **Filename** | ${report.documentName} |`);
  lines.push(`| **Type** | ${report.documentType} |`);
  lines.push(`| **Size** | ${formatBytes(report.documentSize)} |`);
  lines.push(`| **SHA-256** | \`${report.documentHash.substring(0, 16)}...\` |`);
  lines.push(`| **Analyzed** | ${new Date(report.analysisTimestamp).toLocaleString()} |`);
  lines.push('');

  // Risk assessment
  const riskEmoji = {
    low: '🟢',
    medium: '🟡',
    high: '🟠',
    critical: '🔴',
  };

  lines.push('## Risk Assessment');
  lines.push('');
  lines.push(`**Overall Risk:** ${riskEmoji[report.overallRisk]} **${report.overallRisk.toUpperCase()}** (Score: ${report.riskScore}/100)`);
  lines.push('');

  // Findings summary
  const counts = {
    critical: report.findings.filter(f => f.severity === 'critical').length,
    suspicious: report.findings.filter(f => f.severity === 'suspicious').length,
    warning: report.findings.filter(f => f.severity === 'warning').length,
    info: report.findings.filter(f => f.severity === 'info').length,
  };

  lines.push('| Severity | Count |');
  lines.push('|----------|-------|');
  lines.push(`| 🔴 Critical | ${counts.critical} |`);
  lines.push(`| 🟠 Suspicious | ${counts.suspicious} |`);
  lines.push(`| 🟡 Warning | ${counts.warning} |`);
  lines.push(`| 🔵 Info | ${counts.info} |`);
  lines.push('');

  // Recommendations
  lines.push('## Recommendations');
  lines.push('');
  for (const rec of report.recommendations) {
    lines.push(`- ${rec}`);
  }
  lines.push('');

  // Detailed findings by category
  lines.push('## Detailed Findings');
  lines.push('');

  const categoryNames: Record<string, string> = {
    metadata: '📋 Metadata Analysis',
    compression: '🗜️ Compression Analysis',
    structure: '🏗️ Structure Analysis',
    fonts: '🔤 Font Analysis',
    visual: '👁️ Visual Analysis',
    ml: '🤖 ML Analysis',
  };

  for (const [category, name] of Object.entries(categoryNames)) {
    const catFindings = report.findings.filter(f => f.category === category);
    if (catFindings.length === 0) continue;

    lines.push(`### ${name}`);
    lines.push('');

    for (const finding of catFindings) {
      const emoji = getSeverityEmoji(finding.severity);
      lines.push(`#### ${emoji} ${finding.title}`);
      lines.push('');
      lines.push(finding.description);
      lines.push('');
      
      if (finding.technicalDetails) {
        lines.push(`> **Technical Details:** ${finding.technicalDetails}`);
        lines.push('');
      }
      
      if (finding.recommendation) {
        lines.push(`💡 **Recommendation:** ${finding.recommendation}`);
        lines.push('');
      }
    }
  }

  // ELA image if available
  if (report.visual.elaImageBase64) {
    lines.push('### Error Level Analysis Visualization');
    lines.push('');
    lines.push('![ELA Result](data:image/png;base64,' + report.visual.elaImageBase64 + ')');
    lines.push('');
    lines.push('*Bright areas in the ELA image may indicate regions that were recently edited.*');
    lines.push('');
  }

  // Disclaimer
  lines.push('---');
  lines.push('');
  lines.push('**Disclaimer:** This analysis provides indicators that may suggest manipulation but cannot definitively prove or disprove authenticity. Professional forensic examination may be required for legal purposes.');
  lines.push('');

  return lines.join('\n');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRiskLevel(level: RiskLevel): string {
  const labels: Record<RiskLevel, string> = {
    low: '🟢 LOW',
    medium: '🟡 MEDIUM',
    high: '🟠 HIGH',
    critical: '🔴 CRITICAL',
  };
  return labels[level];
}

function getSeverityIcon(severity: string): string {
  const icons: Record<string, string> = {
    critical: '🔴',
    suspicious: '🟠',
    warning: '🟡',
    info: '🔵',
  };
  return icons[severity] || '⚪';
}

function getSeverityEmoji(severity: string): string {
  const emojis: Record<string, string> = {
    critical: '🔴',
    suspicious: '🟠',
    warning: '🟡',
    info: '🔵',
  };
  return emojis[severity] || '⚪';
}

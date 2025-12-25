#!/usr/bin/env npx tsx

import * as fs from 'fs/promises';
import * as path from 'path';
import { analyzeDocument, getMimeType } from './lib/forensic-engine';
import { formatReportAsText, formatReportAsMarkdown } from './lib/report-formatter';

const HELP = `
╔═══════════════════════════════════════════════════════════════════════╗
║                      DOC-FORENSICS v1.0                                ║
║           Document Authenticity Analysis Tool                          ║
╚═══════════════════════════════════════════════════════════════════════╝

USAGE:
  npx tsx src/cli.ts <file> [options]
  npm run cli -- <file> [options]

ARGUMENTS:
  <file>              Path to document (PDF, JPEG, PNG, TIFF, DOCX)

OPTIONS:
  --output, -o        Output file path (default: stdout)
  --format, -f        Output format: text, markdown, json (default: text)
  --verbose, -v       Show detailed progress
  --help, -h          Show this help message

EXAMPLES:
  # Analyze a PDF document
  npm run cli -- contract.pdf

  # Save report as markdown
  npm run cli -- evidence.jpg -o report.md -f markdown

  # Export as JSON for programmatic use
  npm run cli -- document.pdf -o results.json -f json

ANALYSIS INCLUDES:
  • Metadata extraction and anomaly detection
  • Compression artifact analysis (for images)
  • Document structure analysis (for PDFs)
  • Font consistency checking
  • Error Level Analysis (ELA) for images
  • Clone/copy-move detection

SUPPORTED FORMATS:
  • PDF documents
  • JPEG, PNG, TIFF, WebP images
  • DOCX documents

NOTE:
  Set ROBOFLOW_API_KEY environment variable to enable ML-based
  forgery detection for enhanced analysis.
`;

interface CliArgs {
  file: string;
  output?: string;
  format: 'text' | 'markdown' | 'json';
  verbose: boolean;
  help: boolean;
}

function parseArgs(args: string[]): CliArgs {
  const result: CliArgs = {
    file: '',
    format: 'text',
    verbose: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--verbose' || arg === '-v') {
      result.verbose = true;
    } else if (arg === '--output' || arg === '-o') {
      result.output = args[++i];
    } else if (arg === '--format' || arg === '-f') {
      const format = args[++i];
      if (format === 'text' || format === 'markdown' || format === 'json') {
        result.format = format;
      } else {
        console.error(`Invalid format: ${format}. Use text, markdown, or json.`);
        process.exit(1);
      }
    } else if (!arg.startsWith('-') && !result.file) {
      result.file = arg;
    }
  }

  return result;
}

function log(verbose: boolean, message: string): void {
  if (verbose) {
    console.error(message);
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.file) {
    console.log(HELP);
    process.exit(args.help ? 0 : 1);
  }

  // Check file exists
  try {
    await fs.access(args.file);
  } catch {
    console.error(`Error: File not found: ${args.file}`);
    process.exit(1);
  }

  const filename = path.basename(args.file);
  const mimeType = getMimeType(filename);

  if (!mimeType) {
    console.error(`Error: Unsupported file type: ${filename}`);
    console.error('Supported types: PDF, JPEG, PNG, TIFF, WebP, DOCX');
    process.exit(1);
  }

  console.error('');
  console.error('╔═══════════════════════════════════════════════════════════════╗');
  console.error('║                    DOC-FORENSICS ANALYSIS                      ║');
  console.error('╚═══════════════════════════════════════════════════════════════╝');
  console.error('');
  console.error(`📄 Document: ${filename}`);
  console.error(`📁 Type: ${mimeType}`);
  console.error('');

  // Read file
  log(args.verbose, '📖 Reading file...');
  const buffer = await fs.readFile(args.file);
  console.error(`   Size: ${(buffer.length / 1024).toFixed(1)} KB`);

  // Run analysis
  console.error('');
  console.error('🔍 Running forensic analysis...');
  
  log(args.verbose, '   • Extracting metadata...');
  log(args.verbose, '   • Analyzing compression...');
  log(args.verbose, '   • Checking structure...');
  log(args.verbose, '   • Analyzing fonts...');
  log(args.verbose, '   • Running visual analysis...');
  log(args.verbose, '   • Checking ML models...');

  const report = await analyzeDocument(buffer, filename, mimeType);

  console.error('');
  console.error('─'.repeat(50));

  // Display summary
  const riskColors: Record<string, string> = {
    low: '\x1b[32m',      // Green
    medium: '\x1b[33m',   // Yellow
    high: '\x1b[38;5;208m', // Orange
    critical: '\x1b[31m', // Red
  };
  const reset = '\x1b[0m';

  console.error(`Risk Level: ${riskColors[report.overallRisk]}${report.overallRisk.toUpperCase()}${reset} (${report.riskScore}/100)`);
  console.error(`Findings: ${report.findings.length} total`);
  console.error(`  🔴 Critical: ${report.findings.filter(f => f.severity === 'critical').length}`);
  console.error(`  🟠 Suspicious: ${report.findings.filter(f => f.severity === 'suspicious').length}`);
  console.error(`  🟡 Warning: ${report.findings.filter(f => f.severity === 'warning').length}`);
  console.error(`  🔵 Info: ${report.findings.filter(f => f.severity === 'info').length}`);
  console.error('─'.repeat(50));
  console.error('');

  // Format output
  let output: string;
  switch (args.format) {
    case 'json':
      // Remove base64 ELA image from JSON output (too large)
      const jsonReport = { ...report };
      if (jsonReport.visual.elaImageBase64) {
        jsonReport.visual = { ...jsonReport.visual, elaImageBase64: '[base64 data omitted]' };
      }
      output = JSON.stringify(jsonReport, null, 2);
      break;
    case 'markdown':
      output = formatReportAsMarkdown(report);
      break;
    default:
      output = formatReportAsText(report);
  }

  // Write output
  if (args.output) {
    await fs.writeFile(args.output, output);
    console.error(`✅ Report saved to ${args.output}`);
  } else {
    console.log(output);
  }

  // Exit code based on risk
  if (report.overallRisk === 'critical') {
    process.exit(3);
  } else if (report.overallRisk === 'high') {
    process.exit(2);
  } else if (report.overallRisk === 'medium') {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

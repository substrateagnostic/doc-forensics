import { createHash } from 'crypto';
import {
  ForensicReport,
  Finding,
  RiskLevel,
  SUPPORTED_TYPES,
  SupportedMimeType,
} from './types';
import { analyzeMetadata } from './metadata-analyzer';
import { analyzeCompression } from './compression-analyzer';
import { analyzeStructure } from './structure-analyzer';
import { analyzeFonts } from './font-analyzer';
import { analyzeVisual } from './visual-analyzer';
import { analyzeWithML } from './ml-analyzer';
import { analyzeIDDocument } from './id-document-analyzer';
import { analyzeSignatures } from './signature-analyzer';

export async function analyzeDocument(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<ForensicReport> {
  // Validate file type
  if (!Object.keys(SUPPORTED_TYPES).includes(mimeType)) {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }

  const documentType = SUPPORTED_TYPES[mimeType as SupportedMimeType];
  const documentHash = createHash('sha256').update(buffer).digest('hex');
  const documentSize = buffer.length;

  // Run all analyzers in parallel where possible
  const [metadata, compression, structure, fonts, visual, ml, idDocument, signatures] = await Promise.all([
    analyzeMetadata(buffer, mimeType),
    analyzeCompression(buffer, mimeType),
    analyzeStructure(buffer, mimeType),
    analyzeFonts(buffer, mimeType),
    analyzeVisual(buffer, mimeType),
    analyzeWithML(buffer, mimeType),
    analyzeIDDocument(buffer, mimeType),
    analyzeSignatures(buffer, mimeType),
  ]);

  // Collect all findings
  const allFindings: Finding[] = [
    ...metadata.findings,
    ...compression.findings,
    ...structure.findings,
    ...fonts.findings,
    ...visual.findings,
    ...ml.findings,
    ...idDocument.findings,
    ...signatures.findings,
  ];

  // Calculate risk score
  const { riskScore, riskLevel } = calculateRisk(allFindings);

  // Generate recommendations
  const recommendations = generateRecommendations(allFindings, riskLevel);

  return {
    documentName: filename,
    documentType,
    documentSize,
    documentHash,
    analysisTimestamp: new Date().toISOString(),
    overallRisk: riskLevel,
    riskScore,
    findings: allFindings,
    metadata,
    compression,
    structure,
    fonts,
    visual,
    ml,
    idDocument,
    signatures,
    recommendations,
  };
}

function calculateRisk(findings: Finding[]): { riskScore: number; riskLevel: RiskLevel } {
  // Weight findings by severity
  const weights = {
    info: 0,
    warning: 10,
    suspicious: 25,
    critical: 50,
  };

  let totalScore = 0;
  let maxPossibleScore = 0;

  for (const finding of findings) {
    totalScore += weights[finding.severity];
    maxPossibleScore += weights.critical; // Max possible per finding
  }

  // Normalize to 0-100
  const riskScore = findings.length > 0 
    ? Math.min(100, Math.round((totalScore / Math.max(maxPossibleScore, 1)) * 100 * 2))
    : 0;

  // Determine risk level
  let riskLevel: RiskLevel;
  
  // Check for any critical findings
  const hasCritical = findings.some(f => f.severity === 'critical');
  const suspiciousCount = findings.filter(f => f.severity === 'suspicious').length;
  const warningCount = findings.filter(f => f.severity === 'warning').length;

  if (hasCritical || suspiciousCount >= 3) {
    riskLevel = 'critical';
  } else if (suspiciousCount >= 1 || warningCount >= 3) {
    riskLevel = 'high';
  } else if (warningCount >= 1) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }

  return { riskScore, riskLevel };
}

function generateRecommendations(findings: Finding[], riskLevel: RiskLevel): string[] {
  const recommendations: string[] = [];

  // Add recommendations based on risk level
  if (riskLevel === 'critical') {
    recommendations.push(
      'This document shows significant signs of potential manipulation. Do not rely on it without independent verification.',
      'Request the original document from a trusted source if possible.',
      'Consider engaging a professional forensic examiner for detailed analysis.'
    );
  } else if (riskLevel === 'high') {
    recommendations.push(
      'This document has multiple concerning indicators. Exercise caution.',
      'Verify the document through alternative channels before relying on it.',
      'Review the specific findings and assess their relevance to your use case.'
    );
  } else if (riskLevel === 'medium') {
    recommendations.push(
      'Some findings warrant attention. Review the details below.',
      'Consider the context and source of the document when evaluating findings.'
    );
  } else {
    recommendations.push(
      'No significant issues detected, but no analysis can guarantee authenticity.',
      'Standard verification practices should still be followed.'
    );
  }

  // Add specific recommendations from findings
  const findingRecs = findings
    .filter(f => f.recommendation)
    .map(f => f.recommendation as string);
  
  // Deduplicate
  const uniqueRecs = Array.from(new Set(findingRecs));
  recommendations.push(...uniqueRecs.slice(0, 5)); // Limit to 5 additional

  return recommendations;
}

// Utility to get file MIME type from extension
export function getMimeType(filename: string): string | null {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  const mimeMap: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    tiff: 'image/tiff',
    tif: 'image/tiff',
    webp: 'image/webp',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };

  return ext ? mimeMap[ext] || null : null;
}

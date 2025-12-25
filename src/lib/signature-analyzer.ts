import { Finding } from './types';

export interface SignatureAnalysis {
  findings: Finding[];
  signaturesDetected: number;
  signatures: SignatureRegion[];
  hasDigitalSignature: boolean;
}

export interface SignatureRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  type: 'handwritten' | 'stamp' | 'digital' | 'initial';
  imageBase64?: string;
}

/**
 * Analyzes documents to detect and extract signatures
 * Uses heuristic methods for signature detection
 */
export async function analyzeSignatures(
  buffer: Buffer,
  mimeType: string
): Promise<SignatureAnalysis> {
  const findings: Finding[] = [];
  const signatures: SignatureRegion[] = [];

  // Check for digital signatures in PDFs
  if (mimeType === 'application/pdf') {
    const digitalSigResult = await detectDigitalSignatures(buffer);
    findings.push(...digitalSigResult.findings);
    if (digitalSigResult.hasDigitalSignature) {
      return {
        findings,
        signaturesDetected: 1,
        signatures: digitalSigResult.signatures,
        hasDigitalSignature: true,
      };
    }
  }

  // For images, detect visual signatures
  if (mimeType.startsWith('image/')) {
    const visualSigResult = await detectVisualSignatures(buffer);
    findings.push(...visualSigResult.findings);
    signatures.push(...visualSigResult.signatures);
  }

  // For PDFs, try to detect signatures in rendered pages
  if (mimeType === 'application/pdf') {
    findings.push({
      id: 'sig-pdf-visual',
      category: 'visual',
      title: 'PDF Signature Analysis',
      description: 'Visual signature detection for PDFs requires page rendering. Upload document as image for detailed analysis.',
      severity: 'info',
    });
  }

  return {
    findings,
    signaturesDetected: signatures.length,
    signatures,
    hasDigitalSignature: false,
  };
}

// Detect digital signatures in PDFs
async function detectDigitalSignatures(
  buffer: Buffer
): Promise<{ findings: Finding[]; hasDigitalSignature: boolean; signatures: SignatureRegion[] }> {
  const findings: Finding[] = [];
  const signatures: SignatureRegion[] = [];

  try {
    const content = buffer.toString('latin1');

    // Look for PDF signature objects
    const sigPatterns = [
      /\/Type\s*\/Sig\b/gi,
      /\/SubFilter\s*\/adbe\.pkcs7\.[a-z]+/gi,
      /\/SubFilter\s*\/ETSI\.CAdES\.[a-z]+/gi,
      /\/SubFilter\s*\/adbe\.x509\.rsa_sha1/gi,
    ];

    let sigCount = 0;
    for (const pattern of sigPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        sigCount += matches.length;
      }
    }

    if (sigCount > 0) {
      // Extract signature details
      const byteRangeMatch = content.match(/\/ByteRange\s*\[([^\]]+)\]/);
      const filterMatch = content.match(/\/Filter\s*\/([^\s\/\]>]+)/);
      const subFilterMatch = content.match(/\/SubFilter\s*\/([^\s\/\]>]+)/);

      findings.push({
        id: 'sig-digital-found',
        category: 'structure',
        title: 'Digital Signature Detected',
        description: `PDF contains ${sigCount} digital signature(s). This provides cryptographic proof of document integrity.`,
        severity: 'info',
        technicalDetails: [
          filterMatch ? `Filter: ${filterMatch[1]}` : null,
          subFilterMatch ? `SubFilter: ${subFilterMatch[1]}` : null,
          byteRangeMatch ? `ByteRange: ${byteRangeMatch[1].trim()}` : null,
        ].filter(Boolean).join(', '),
      });

      // Check for signature validity indicators
      const hasTimestamp = /\/Type\s*\/DocTimeStamp/i.test(content);
      const hasCertChain = /\/Cert\s*[<\[]/i.test(content);

      if (hasTimestamp) {
        findings.push({
          id: 'sig-timestamp',
          category: 'structure',
          title: 'Document Timestamp Present',
          description: 'Digital signature includes a timestamp authority validation.',
          severity: 'info',
        });
      }

      if (!hasCertChain) {
        findings.push({
          id: 'sig-no-cert-chain',
          category: 'structure',
          title: 'Certificate Chain Not Embedded',
          description: 'Signature certificate chain is not fully embedded. Verification may require external certificates.',
          severity: 'warning',
        });
      }

      signatures.push({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        confidence: 0.95,
        type: 'digital',
      });

      return { findings, hasDigitalSignature: true, signatures };
    }
  } catch {
    // Silently fail
  }

  return { findings, hasDigitalSignature: false, signatures };
}

// Detect visual signatures in images
async function detectVisualSignatures(
  buffer: Buffer
): Promise<{ findings: Finding[]; signatures: SignatureRegion[] }> {
  const findings: Finding[] = [];
  const signatures: SignatureRegion[] = [];

  try {
    const sharp = (await import('sharp')).default;
    const image = sharp(buffer);
    const metadata = await image.metadata();
    const { width = 0, height = 0 } = metadata;

    // Resize for faster processing
    const scaleFactor = Math.min(1, 600 / Math.max(width, height));
    const scaledWidth = Math.floor(width * scaleFactor);
    const scaledHeight = Math.floor(height * scaleFactor);

    const { data } = await image
      .clone()
      .resize(scaledWidth, scaledHeight, { fit: 'fill' })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Look for signature-like regions
    // Signatures typically appear in lower portions of documents
    // They have specific characteristics: thin strokes, consistent color, cursive-like patterns

    // Scan for potential signature regions
    const candidateRegions = await findSignatureCandidates(
      data,
      scaledWidth,
      scaledHeight,
      scaleFactor,
      width,
      height
    );

    for (const region of candidateRegions) {
      // Analyze each candidate
      const analysis = analyzeSignatureCandidate(data, region, scaledWidth);

      if (analysis.isLikelySignature) {
        signatures.push({
          x: Math.round(region.x / scaleFactor),
          y: Math.round(region.y / scaleFactor),
          width: Math.round(region.width / scaleFactor),
          height: Math.round(region.height / scaleFactor),
          confidence: analysis.confidence,
          type: analysis.type,
        });
      }
    }

    if (signatures.length > 0) {
      findings.push({
        id: 'sig-visual-detected',
        category: 'visual',
        title: `${signatures.length} Potential Signature(s) Detected`,
        description: `Visual analysis identified ${signatures.length} region(s) that may contain signatures.`,
        severity: 'info',
        technicalDetails: signatures.map((s, i) =>
          `#${i + 1}: ${s.type} at (${s.x}, ${s.y}), confidence: ${(s.confidence * 100).toFixed(0)}%`
        ).join('; '),
      });

      // Check for signature anomalies
      if (signatures.some(s => s.confidence < 0.5)) {
        findings.push({
          id: 'sig-low-confidence',
          category: 'visual',
          title: 'Low Confidence Signature Detection',
          description: 'Some detected signatures have low confidence scores and may require manual verification.',
          severity: 'warning',
        });
      }
    } else {
      findings.push({
        id: 'sig-none-found',
        category: 'visual',
        title: 'No Handwritten Signatures Detected',
        description: 'Visual analysis did not identify clear signature regions. Document may be unsigned or signatures may be in non-standard format.',
        severity: 'info',
      });
    }
  } catch (error) {
    findings.push({
      id: 'sig-analysis-error',
      category: 'visual',
      title: 'Signature Analysis Error',
      description: 'Could not complete signature detection.',
      severity: 'info',
      technicalDetails: String(error),
    });
  }

  return { findings, signatures };
}

interface CandidateRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Find potential signature candidate regions
async function findSignatureCandidates(
  data: Buffer,
  width: number,
  height: number,
  _scaleFactor: number,
  _origWidth: number,
  _origHeight: number
): Promise<CandidateRegion[]> {
  const candidates: CandidateRegion[] = [];

  // Signatures typically appear in the bottom half of documents
  // and in specific horizontal regions (left, center, or right signature lines)
  const regions = [
    // Bottom left (common for single signature)
    { x: 0.05, y: 0.65, w: 0.4, h: 0.25 },
    // Bottom center
    { x: 0.3, y: 0.65, w: 0.4, h: 0.25 },
    // Bottom right
    { x: 0.55, y: 0.65, w: 0.4, h: 0.25 },
    // Lower third left (for dual signatures)
    { x: 0.05, y: 0.55, w: 0.35, h: 0.2 },
    // Lower third right
    { x: 0.6, y: 0.55, w: 0.35, h: 0.2 },
  ];

  for (const region of regions) {
    const startX = Math.floor(region.x * width);
    const startY = Math.floor(region.y * height);
    const regionWidth = Math.floor(region.w * width);
    const regionHeight = Math.floor(region.h * height);

    // Check if region has signature-like content
    let inkPixels = 0;
    let totalPixels = 0;

    for (let y = startY; y < startY + regionHeight && y < height; y++) {
      for (let x = startX; x < startX + regionWidth && x < width; x++) {
        const idx = y * width + x;
        if (idx < data.length) {
          totalPixels++;
          // Ink is typically dark (< 100 on grayscale)
          if (data[idx] < 100) {
            inkPixels++;
          }
        }
      }
    }

    const inkRatio = inkPixels / Math.max(totalPixels, 1);

    // Signatures typically have 2-15% ink coverage
    if (inkRatio > 0.02 && inkRatio < 0.15) {
      candidates.push({
        x: startX,
        y: startY,
        width: regionWidth,
        height: regionHeight,
      });
    }
  }

  return candidates;
}

// Analyze a candidate region to determine if it contains a signature
function analyzeSignatureCandidate(
  data: Buffer,
  region: CandidateRegion,
  width: number
): { isLikelySignature: boolean; confidence: number; type: 'handwritten' | 'stamp' | 'initial' } {
  // Extract region pixels
  const regionPixels: number[] = [];
  for (let y = region.y; y < region.y + region.height; y++) {
    for (let x = region.x; x < region.x + region.width; x++) {
      const idx = y * width + x;
      if (idx < data.length) {
        regionPixels.push(data[idx]);
      }
    }
  }

  if (regionPixels.length === 0) {
    return { isLikelySignature: false, confidence: 0, type: 'handwritten' };
  }

  // Calculate statistics
  const inkPixels = regionPixels.filter(p => p < 100);
  const inkRatio = inkPixels.length / regionPixels.length;

  // Calculate horizontal variation (signatures have lots of horizontal changes)
  let horizontalTransitions = 0;
  for (let y = 0; y < region.height; y++) {
    let lastInk = false;
    for (let x = 0; x < region.width; x++) {
      const idx = y * region.width + x;
      if (idx < regionPixels.length) {
        const isInk = regionPixels[idx] < 100;
        if (isInk !== lastInk) {
          horizontalTransitions++;
          lastInk = isInk;
        }
      }
    }
  }

  const avgTransitionsPerLine = horizontalTransitions / Math.max(region.height, 1);

  // Analyze stroke characteristics
  let confidence = 0;
  let type: 'handwritten' | 'stamp' | 'initial' = 'handwritten';

  // Handwritten signatures: moderate ink, high transitions
  if (inkRatio >= 0.03 && inkRatio <= 0.12 && avgTransitionsPerLine >= 4) {
    confidence = 0.5 + (avgTransitionsPerLine / 50);
    type = 'handwritten';
  }
  // Initials: compact, moderate transitions
  else if (inkRatio >= 0.05 && inkRatio <= 0.2 && avgTransitionsPerLine >= 2 && avgTransitionsPerLine < 6) {
    confidence = 0.4 + (inkRatio * 2);
    type = 'initial';
  }
  // Stamps: higher ink ratio, lower transitions
  else if (inkRatio >= 0.1 && inkRatio <= 0.3 && avgTransitionsPerLine < 4) {
    confidence = 0.3 + (inkRatio);
    type = 'stamp';
  }

  confidence = Math.min(0.95, confidence);

  return {
    isLikelySignature: confidence >= 0.35,
    confidence,
    type,
  };
}

/**
 * Compare two signatures for similarity
 * Returns a similarity score from 0 to 1
 */
export async function compareSignatures(
  sig1Buffer: Buffer,
  sig2Buffer: Buffer
): Promise<{ similarity: number; findings: Finding[] }> {
  const findings: Finding[] = [];

  try {
    const sharp = (await import('sharp')).default;

    // Normalize both signatures to same size
    const size = 128;

    const [data1, data2] = await Promise.all([
      sharp(sig1Buffer)
        .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255 } })
        .greyscale()
        .raw()
        .toBuffer(),
      sharp(sig2Buffer)
        .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255 } })
        .greyscale()
        .raw()
        .toBuffer(),
    ]);

    // Calculate pixel-wise similarity
    let matchingPixels = 0;
    let totalCompared = 0;

    for (let i = 0; i < data1.length && i < data2.length; i++) {
      const diff = Math.abs(data1[i] - data2[i]);
      if (diff < 30) {
        matchingPixels++;
      }
      totalCompared++;
    }

    const similarity = matchingPixels / Math.max(totalCompared, 1);

    if (similarity > 0.9) {
      findings.push({
        id: 'sig-compare-match',
        category: 'visual',
        title: 'High Signature Similarity',
        description: `Signatures show ${(similarity * 100).toFixed(1)}% similarity. This may indicate the same signer or a copied signature.`,
        severity: similarity > 0.98 ? 'suspicious' : 'info',
      });
    } else if (similarity > 0.7) {
      findings.push({
        id: 'sig-compare-similar',
        category: 'visual',
        title: 'Moderate Signature Similarity',
        description: `Signatures show ${(similarity * 100).toFixed(1)}% similarity. Some characteristics are shared.`,
        severity: 'info',
      });
    } else {
      findings.push({
        id: 'sig-compare-different',
        category: 'visual',
        title: 'Low Signature Similarity',
        description: `Signatures show only ${(similarity * 100).toFixed(1)}% similarity. They appear to be from different sources.`,
        severity: 'info',
      });
    }

    return { similarity, findings };
  } catch (error) {
    findings.push({
      id: 'sig-compare-error',
      category: 'visual',
      title: 'Signature Comparison Error',
      description: 'Could not complete signature comparison.',
      severity: 'info',
      technicalDetails: String(error),
    });

    return { similarity: 0, findings };
  }
}

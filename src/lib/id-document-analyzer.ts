import { Finding } from './types';
import type Sharp from 'sharp';

type SharpInstance = ReturnType<typeof Sharp>;

export interface IDDocumentAnalysis {
  findings: Finding[];
  isLikelyID: boolean;
  faceDetected: boolean;
  faceRegion?: {
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  };
  documentType?: string;
}

/**
 * Analyzes images to detect ID documents and faces
 * Uses heuristic methods for face detection and ID validation
 */
export async function analyzeIDDocument(
  buffer: Buffer,
  mimeType: string
): Promise<IDDocumentAnalysis> {
  const findings: Finding[] = [];

  if (!mimeType.startsWith('image/')) {
    return {
      findings: [],
      isLikelyID: false,
      faceDetected: false,
    };
  }

  try {
    const sharp = (await import('sharp')).default;
    const image = sharp(buffer);
    const metadata = await image.metadata();
    const { width = 0, height = 0 } = metadata;

    // Run analyses in parallel
    const [
      aspectAnalysis,
      faceAnalysis,
      textRegionAnalysis,
      colorAnalysis,
    ] = await Promise.all([
      analyzeAspectRatio(width, height),
      detectFaceRegion(image, width, height),
      analyzeTextRegions(image, width, height),
      analyzeIDColors(image),
    ]);

    // Collect findings
    findings.push(...aspectAnalysis.findings);
    findings.push(...faceAnalysis.findings);
    findings.push(...textRegionAnalysis.findings);
    findings.push(...colorAnalysis.findings);

    // Determine if this is likely an ID document
    const idIndicators = [
      aspectAnalysis.isIDRatio,
      faceAnalysis.faceDetected,
      textRegionAnalysis.hasTextBlocks,
      colorAnalysis.hasIDColors,
    ];
    const idScore = idIndicators.filter(Boolean).length;
    const isLikelyID = idScore >= 2;

    // Infer document type
    let documentType: string | undefined;
    if (isLikelyID) {
      if (aspectAnalysis.aspectType === 'id-card') {
        documentType = 'ID Card / Driver\'s License';
      } else if (aspectAnalysis.aspectType === 'passport') {
        documentType = 'Passport';
      } else {
        documentType = 'Identity Document';
      }

      findings.unshift({
        id: 'id-doc-detected',
        category: 'structure',
        title: `Detected: ${documentType}`,
        description: `This image appears to be a ${documentType.toLowerCase()} based on its characteristics.`,
        severity: 'info',
        technicalDetails: `Confidence: ${idScore}/4 indicators matched`,
      });

      // Add ID-specific warnings
      if (!faceAnalysis.faceDetected) {
        findings.push({
          id: 'id-no-face',
          category: 'visual',
          title: 'No Face Detected in ID',
          description: 'Expected face region not found or may have been manipulated.',
          severity: 'warning',
          recommendation: 'Verify the photo region manually.',
        });
      }
    }

    return {
      findings,
      isLikelyID,
      faceDetected: faceAnalysis.faceDetected,
      faceRegion: faceAnalysis.region,
      documentType,
    };
  } catch (error) {
    findings.push({
      id: 'id-analysis-error',
      category: 'structure',
      title: 'ID Analysis Error',
      description: 'Could not complete ID document analysis.',
      severity: 'info',
      technicalDetails: String(error),
    });

    return {
      findings,
      isLikelyID: false,
      faceDetected: false,
    };
  }
}

// Analyze aspect ratio for ID document detection
async function analyzeAspectRatio(
  width: number,
  height: number
): Promise<{ findings: Finding[]; isIDRatio: boolean; aspectType?: string }> {
  const findings: Finding[] = [];
  const ratio = width / height;
  const invRatio = height / width;

  // Common ID document ratios
  // Credit card / ID-1: 85.6mm x 53.98mm = 1.586
  // Passport photo page: ~1.42 (varies by country)
  // US Driver's License: 3.375" x 2.125" = 1.588

  const id1Ratio = 85.6 / 53.98; // ~1.586
  const passportRatio = 125 / 88; // ~1.42

  let isIDRatio = false;
  let aspectType: string | undefined;

  // Check both orientations
  const checkRatio = (r: number) => {
    if (Math.abs(r - id1Ratio) < 0.1) {
      isIDRatio = true;
      aspectType = 'id-card';
      return true;
    }
    if (Math.abs(r - passportRatio) < 0.15) {
      isIDRatio = true;
      aspectType = 'passport';
      return true;
    }
    return false;
  };

  if (checkRatio(ratio) || checkRatio(invRatio)) {
    findings.push({
      id: 'aspect-id-match',
      category: 'structure',
      title: 'Standard ID Aspect Ratio',
      description: `Image dimensions match standard ${aspectType} proportions.`,
      severity: 'info',
      technicalDetails: `Aspect ratio: ${ratio.toFixed(3)}`,
    });
  }

  return { findings, isIDRatio, aspectType };
}

// Detect face region using skin tone and pattern analysis
async function detectFaceRegion(
  image: SharpInstance,
  width: number,
  height: number
): Promise<{
  findings: Finding[];
  faceDetected: boolean;
  region?: { x: number; y: number; width: number; height: number; confidence: number };
}> {
  const findings: Finding[] = [];

  try {
    // Get raw pixel data
    const { data, info } = await image
      .clone()
      .resize(Math.min(width, 400), Math.min(height, 400), { fit: 'inside' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const scaledWidth = info.width;
    const scaledHeight = info.height;
    const channels = info.channels;

    // Scan for skin-tone regions
    const skinMap: boolean[][] = [];
    for (let y = 0; y < scaledHeight; y++) {
      skinMap[y] = [];
      for (let x = 0; x < scaledWidth; x++) {
        const idx = (y * scaledWidth + x) * channels;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        skinMap[y][x] = isSkinTone(r, g, b);
      }
    }

    // Find largest connected skin region
    const visited: boolean[][] = Array(scaledHeight)
      .fill(null)
      .map(() => Array(scaledWidth).fill(false));

    let bestRegion = { x: 0, y: 0, w: 0, h: 0, area: 0 };

    for (let y = 0; y < scaledHeight; y++) {
      for (let x = 0; x < scaledWidth; x++) {
        if (skinMap[y][x] && !visited[y][x]) {
          const region = floodFillBounds(skinMap, visited, x, y, scaledWidth, scaledHeight);
          if (region.area > bestRegion.area) {
            bestRegion = region;
          }
        }
      }
    }

    // Check if we found a valid face-like region
    const minFaceArea = (scaledWidth * scaledHeight) * 0.02; // At least 2% of image
    const maxFaceArea = (scaledWidth * scaledHeight) * 0.4; // At most 40% of image

    if (bestRegion.area > minFaceArea && bestRegion.area < maxFaceArea) {
      // Check aspect ratio of region (faces are roughly 3:4 or 4:5)
      const regionRatio = bestRegion.w / bestRegion.h;
      const isFaceLikeRatio = regionRatio > 0.6 && regionRatio < 1.1;

      if (isFaceLikeRatio) {
        // Scale region back to original dimensions
        const scaleX = width / scaledWidth;
        const scaleY = height / scaledHeight;

        const faceRegion = {
          x: Math.round(bestRegion.x * scaleX),
          y: Math.round(bestRegion.y * scaleY),
          width: Math.round(bestRegion.w * scaleX),
          height: Math.round(bestRegion.h * scaleY),
          confidence: Math.min(0.9, bestRegion.area / (minFaceArea * 10)),
        };

        findings.push({
          id: 'face-detected',
          category: 'visual',
          title: 'Face Region Detected',
          description: 'A potential face region was identified in the document.',
          severity: 'info',
          technicalDetails: `Region: ${faceRegion.width}x${faceRegion.height} at (${faceRegion.x}, ${faceRegion.y})`,
        });

        // Check face position (ID photos are typically on left or right side)
        const faceCenterX = faceRegion.x + faceRegion.width / 2;
        const isOnSide = faceCenterX < width * 0.35 || faceCenterX > width * 0.65;

        if (isOnSide) {
          findings.push({
            id: 'face-position-valid',
            category: 'visual',
            title: 'Standard ID Photo Placement',
            description: 'Face is positioned in typical ID document location.',
            severity: 'info',
          });
        }

        return {
          findings,
          faceDetected: true,
          region: faceRegion,
        };
      }
    }

    return { findings, faceDetected: false };
  } catch {
    return { findings, faceDetected: false };
  }
}

// Check if RGB values represent skin tone
function isSkinTone(r: number, g: number, b: number): boolean {
  // Multiple skin tone detection rules for various ethnicities

  // Rule 1: RGB relationship
  const rule1 = r > 95 && g > 40 && b > 20 &&
    r > g && r > b &&
    Math.abs(r - g) > 15 &&
    r - b > 15;

  // Rule 2: YCbCr-like check (simplified)
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.169 * r - 0.331 * g + 0.500 * b;
  const cr = 128 + 0.500 * r - 0.419 * g - 0.081 * b;
  const rule2 = y > 80 && cb > 77 && cb < 127 && cr > 133 && cr < 173;

  // Rule 3: HSV-like check for broader range
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  let h = 0;
  if (diff > 0) {
    if (max === r) {
      h = 60 * (((g - b) / diff) % 6);
    } else if (max === g) {
      h = 60 * ((b - r) / diff + 2);
    } else {
      h = 60 * ((r - g) / diff + 4);
    }
  }
  if (h < 0) h += 360;
  const s = max > 0 ? diff / max : 0;
  const v = max / 255;

  const rule3 = h >= 0 && h <= 50 && s >= 0.1 && s <= 0.7 && v >= 0.2;

  return rule1 || rule2 || rule3;
}

// Flood fill to find connected region bounds
function floodFillBounds(
  map: boolean[][],
  visited: boolean[][],
  startX: number,
  startY: number,
  width: number,
  height: number
): { x: number; y: number; w: number; h: number; area: number } {
  const stack: [number, number][] = [[startX, startY]];
  let minX = startX, maxX = startX, minY = startY, maxY = startY;
  let area = 0;

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    if (visited[y][x] || !map[y][x]) continue;

    visited[y][x] = true;
    area++;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);

    // 4-connected neighbors
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  return {
    x: minX,
    y: minY,
    w: maxX - minX + 1,
    h: maxY - minY + 1,
    area,
  };
}

// Analyze for text regions (ID documents have specific text layouts)
async function analyzeTextRegions(
  image: SharpInstance,
  width: number,
  height: number
): Promise<{ findings: Finding[]; hasTextBlocks: boolean }> {
  const findings: Finding[] = [];

  try {
    // Convert to grayscale and detect high-contrast regions
    const edgeData = await image
      .clone()
      .greyscale()
      .normalize()
      .threshold(128)
      .raw()
      .toBuffer();

    // Analyze horizontal lines (text typically creates horizontal patterns)
    const lineScores: number[] = [];
    for (let y = 0; y < height; y++) {
      let transitions = 0;
      let lastVal = edgeData[y * width] > 128 ? 1 : 0;

      for (let x = 1; x < width; x++) {
        const idx = y * width + x;
        const val = edgeData[idx] > 128 ? 1 : 0;
        if (val !== lastVal) {
          transitions++;
          lastVal = val;
        }
      }
      lineScores.push(transitions);
    }

    // Find lines with many transitions (likely text)
    const avgTransitions = lineScores.reduce((a, b) => a + b, 0) / lineScores.length;
    const textLines = lineScores.filter(s => s > avgTransitions * 1.5).length;
    const textRatio = textLines / height;

    const hasTextBlocks = textRatio > 0.1 && textRatio < 0.6;

    if (hasTextBlocks) {
      findings.push({
        id: 'text-regions-found',
        category: 'structure',
        title: 'Text Regions Identified',
        description: 'Document contains structured text regions typical of official documents.',
        severity: 'info',
        technicalDetails: `~${Math.round(textRatio * 100)}% of document contains text patterns`,
      });
    }

    return { findings, hasTextBlocks };
  } catch {
    return { findings, hasTextBlocks: false };
  }
}

// Analyze colors typical of ID documents
async function analyzeIDColors(
  image: SharpInstance
): Promise<{ findings: Finding[]; hasIDColors: boolean }> {
  const findings: Finding[] = [];

  try {
    const { data, info } = await image
      .clone()
      .resize(100, 100, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const channels = info.channels;

    // Count color categories
    let blueish = 0, greenish = 0, reddish = 0, neutral = 0, white = 0;
    const totalPixels = 100 * 100;

    for (let i = 0; i < data.length; i += channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      if (r > 200 && g > 200 && b > 200) {
        white++;
      } else if (Math.abs(r - g) < 20 && Math.abs(g - b) < 20) {
        neutral++;
      } else if (b > r && b > g) {
        blueish++;
      } else if (g > r && g > b) {
        greenish++;
      } else if (r > g && r > b) {
        reddish++;
      }
    }

    // ID documents typically have:
    // - Significant white/light areas (background)
    // - Blue or green accents (security features, headers)
    // - Some neutral tones (text)
    const whiteRatio = white / totalPixels;
    const accentRatio = (blueish + greenish) / totalPixels;
    const neutralRatio = neutral / totalPixels;

    const hasIDColors = whiteRatio > 0.15 && (accentRatio > 0.05 || neutralRatio > 0.1);

    if (hasIDColors) {
      const dominant = blueish > greenish ? 'blue' : greenish > blueish ? 'green' : 'neutral';
      findings.push({
        id: 'id-color-profile',
        category: 'visual',
        title: 'ID Document Color Profile',
        description: `Color distribution matches typical ${dominant}-accented ID document patterns.`,
        severity: 'info',
        technicalDetails: `White: ${(whiteRatio * 100).toFixed(0)}%, Accent: ${(accentRatio * 100).toFixed(0)}%`,
      });
    }

    return { findings, hasIDColors };
  } catch {
    return { findings, hasIDColors: false };
  }
}

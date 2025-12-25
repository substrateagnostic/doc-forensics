import { VisualAnalysis, Finding } from './types';
import sharp from 'sharp';

export async function analyzeVisual(
  buffer: Buffer,
  mimeType: string
): Promise<VisualAnalysis> {
  const findings: Finding[] = [];

  // Visual analysis only for images
  if (!mimeType.startsWith('image/')) {
    return {
      findings: [],
      elaPerformed: false,
      cloneDetectionPerformed: false,
    };
  }

  let elaImageBase64: string | undefined;
  let elaPerformed = false;

  try {
    // Perform Error Level Analysis
    const elaResult = await performELA(buffer);
    if (elaResult) {
      elaPerformed = true;
      elaImageBase64 = elaResult.imageBase64;
      
      if (elaResult.hasAnomalies) {
        findings.push({
          id: 'visual-ela-anomalies',
          category: 'visual',
          title: 'ELA Anomalies Detected',
          description: 'Error Level Analysis shows inconsistent compression levels across the image. This may indicate that parts of the image were edited or composited.',
          severity: 'suspicious',
          technicalDetails: `Anomaly score: ${elaResult.anomalyScore.toFixed(2)}`,
          recommendation: 'Review the ELA visualization. Bright areas may indicate recent edits.',
        });
      } else {
        findings.push({
          id: 'visual-ela-clean',
          category: 'visual',
          title: 'ELA Analysis Complete',
          description: 'Error Level Analysis did not detect obvious manipulation artifacts. Note: this does not guarantee the image is unmodified.',
          severity: 'info',
        });
      }
    }

    // Check for copy-move (clone) regions
    const cloneResult = await detectClonedRegions(buffer);
    if (cloneResult.detected) {
      findings.push({
        id: 'visual-clone-detected',
        category: 'visual',
        title: 'Possible Cloned Regions',
        description: 'Analysis detected regions that may have been copied within the image. This is a common manipulation technique to duplicate or hide content.',
        severity: 'suspicious',
        technicalDetails: `Detected ${cloneResult.regionCount} potential cloned region(s)`,
        recommendation: 'Examine the image for duplicated areas.',
      });
    }

    // Check for edge inconsistencies
    const edgeResult = await analyzeEdges(buffer);
    if (edgeResult.hasInconsistencies) {
      findings.push({
        id: 'visual-edge-inconsistencies',
        category: 'visual',
        title: 'Edge Inconsistencies Detected',
        description: 'Analysis found unusual patterns along edges in the image, which may indicate cut-and-paste manipulation.',
        severity: 'warning',
        technicalDetails: edgeResult.details,
      });
    }

    // Check for noise inconsistencies
    const noiseResult = await analyzeNoise(buffer);
    if (noiseResult.hasInconsistencies) {
      findings.push({
        id: 'visual-noise-inconsistencies',
        category: 'visual',
        title: 'Noise Pattern Inconsistencies',
        description: 'Different areas of the image show different noise patterns. This may indicate compositing from multiple sources.',
        severity: 'suspicious',
        technicalDetails: `Noise variance: ${noiseResult.variance.toFixed(2)}`,
      });
    }

  } catch (error) {
    findings.push({
      id: 'visual-analysis-error',
      category: 'visual',
      title: 'Visual Analysis Incomplete',
      description: 'Some visual analysis techniques could not be completed.',
      severity: 'info',
      technicalDetails: String(error),
    });
  }

  return {
    findings,
    elaPerformed,
    elaImageBase64,
    cloneDetectionPerformed: true,
  };
}

interface ELAResult {
  imageBase64: string;
  hasAnomalies: boolean;
  anomalyScore: number;
}

async function performELA(buffer: Buffer): Promise<ELAResult | null> {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();
    
    if (!metadata.width || !metadata.height) return null;

    // Resave at lower quality
    const resaved = await sharp(buffer)
      .jpeg({ quality: 85 })
      .toBuffer();

    // Get raw pixel data for both
    const original = await sharp(buffer).raw().toBuffer();
    const compressed = await sharp(resaved).raw().toBuffer();

    // Calculate difference and amplify
    const diff = Buffer.alloc(original.length);
    let totalDiff = 0;
    let maxDiff = 0;

    for (let i = 0; i < original.length; i++) {
      const d = Math.abs(original[i] - compressed[i]);
      diff[i] = Math.min(255, d * 20); // Amplify difference
      totalDiff += d;
      maxDiff = Math.max(maxDiff, d);
    }

    // Create ELA visualization image
    const channels = metadata.channels || 3;
    const elaImage = await sharp(diff, {
      raw: {
        width: metadata.width,
        height: metadata.height,
        channels: channels as 1 | 2 | 3 | 4,
      }
    })
      .png()
      .toBuffer();

    const elaImageBase64 = elaImage.toString('base64');
    
    // Calculate anomaly score
    const avgDiff = totalDiff / original.length;
    const anomalyScore = (maxDiff / 255) * 100;
    
    // Anomalies detected if variance is high (some areas much brighter than others)
    // Calculate variance
    let sumSquaredDiff = 0;
    for (let i = 0; i < diff.length; i++) {
      sumSquaredDiff += Math.pow(diff[i] - avgDiff * 20, 2);
    }
    const variance = sumSquaredDiff / diff.length;
    const stdDev = Math.sqrt(variance);
    
    const hasAnomalies = stdDev > 40 && maxDiff > 60;

    return {
      imageBase64: elaImageBase64,
      hasAnomalies,
      anomalyScore,
    };
  } catch {
    return null;
  }
}

interface CloneResult {
  detected: boolean;
  regionCount: number;
}

async function detectClonedRegions(buffer: Buffer): Promise<CloneResult> {
  try {
    // Simplified clone detection using block matching
    const image = sharp(buffer);
    const metadata = await image.metadata();
    
    if (!metadata.width || !metadata.height) {
      return { detected: false, regionCount: 0 };
    }

    // Resize for faster processing
    const scale = Math.min(1, 500 / Math.max(metadata.width, metadata.height));
    const width = Math.floor(metadata.width * scale);
    const height = Math.floor(metadata.height * scale);

    const { data } = await sharp(buffer)
      .resize(width, height)
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Block-based comparison
    const blockSize = 16;
    const threshold = 0.95; // Similarity threshold
    const blocks: { x: number; y: number; hash: number }[] = [];

    // Extract block signatures
    for (let y = 0; y < height - blockSize; y += blockSize / 2) {
      for (let x = 0; x < width - blockSize; x += blockSize / 2) {
        let hash = 0;
        for (let by = 0; by < blockSize; by++) {
          for (let bx = 0; bx < blockSize; bx++) {
            const idx = (y + by) * width + (x + bx);
            hash += data[idx];
          }
        }
        blocks.push({ x, y, hash });
      }
    }

    // Find similar blocks that are far apart
    let cloneCount = 0;
    const minDistance = blockSize * 3;

    for (let i = 0; i < blocks.length && cloneCount < 10; i++) {
      for (let j = i + 1; j < blocks.length; j++) {
        const distance = Math.sqrt(
          Math.pow(blocks[i].x - blocks[j].x, 2) + 
          Math.pow(blocks[i].y - blocks[j].y, 2)
        );
        
        if (distance > minDistance) {
          const similarity = 1 - Math.abs(blocks[i].hash - blocks[j].hash) / (blockSize * blockSize * 255);
          if (similarity > threshold) {
            cloneCount++;
            break;
          }
        }
      }
    }

    return {
      detected: cloneCount >= 3,
      regionCount: cloneCount,
    };
  } catch {
    return { detected: false, regionCount: 0 };
  }
}

interface EdgeResult {
  hasInconsistencies: boolean;
  details: string;
}

async function analyzeEdges(buffer: Buffer): Promise<EdgeResult> {
  try {
    // Apply edge detection and analyze consistency
    const edgeImage = await sharp(buffer)
      .grayscale()
      .convolve({
        width: 3,
        height: 3,
        kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1], // Laplacian
      })
      .raw()
      .toBuffer();

    // Analyze edge distribution
    let edgeCount = 0;
    let edgeSum = 0;
    
    for (let i = 0; i < edgeImage.length; i++) {
      if (edgeImage[i] > 30) {
        edgeCount++;
        edgeSum += edgeImage[i];
      }
    }

    const avgEdgeStrength = edgeCount > 0 ? edgeSum / edgeCount : 0;
    
    // High variance in edge strength can indicate manipulation
    let variance = 0;
    for (let i = 0; i < edgeImage.length; i++) {
      if (edgeImage[i] > 30) {
        variance += Math.pow(edgeImage[i] - avgEdgeStrength, 2);
      }
    }
    variance = edgeCount > 0 ? variance / edgeCount : 0;
    const stdDev = Math.sqrt(variance);

    const hasInconsistencies = stdDev > 60;

    return {
      hasInconsistencies,
      details: `Edge strength std dev: ${stdDev.toFixed(2)}, Avg: ${avgEdgeStrength.toFixed(2)}`,
    };
  } catch {
    return { hasInconsistencies: false, details: 'Edge analysis failed' };
  }
}

interface NoiseResult {
  hasInconsistencies: boolean;
  variance: number;
}

async function analyzeNoise(buffer: Buffer): Promise<NoiseResult> {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();
    
    if (!metadata.width || !metadata.height) {
      return { hasInconsistencies: false, variance: 0 };
    }

    // Sample noise from different regions
    const regionSize = Math.min(64, metadata.width / 4, metadata.height / 4);
    const regions = [
      { x: 0, y: 0 },
      { x: metadata.width - regionSize, y: 0 },
      { x: 0, y: metadata.height - regionSize },
      { x: metadata.width - regionSize, y: metadata.height - regionSize },
      { x: (metadata.width - regionSize) / 2, y: (metadata.height - regionSize) / 2 },
    ];

    const noiseEstimates: number[] = [];

    for (const region of regions) {
      try {
        const { data } = await sharp(buffer)
          .extract({
            left: Math.floor(region.x),
            top: Math.floor(region.y),
            width: Math.floor(regionSize),
            height: Math.floor(regionSize),
          })
          .grayscale()
          .raw()
          .toBuffer({ resolveWithObject: true });

        // Estimate noise using local variance
        let sum = 0;
        let sumSq = 0;
        for (let i = 0; i < data.length; i++) {
          sum += data[i];
          sumSq += data[i] * data[i];
        }
        const mean = sum / data.length;
        const variance = sumSq / data.length - mean * mean;
        noiseEstimates.push(Math.sqrt(variance));
      } catch {
        // Skip failed regions
      }
    }

    if (noiseEstimates.length < 3) {
      return { hasInconsistencies: false, variance: 0 };
    }

    // Calculate variance of noise estimates
    const avgNoise = noiseEstimates.reduce((a, b) => a + b, 0) / noiseEstimates.length;
    const noiseVariance = noiseEstimates.reduce((a, b) => a + Math.pow(b - avgNoise, 2), 0) / noiseEstimates.length;

    // High variance in noise levels suggests different image sources
    const hasInconsistencies = noiseVariance > 100;

    return {
      hasInconsistencies,
      variance: noiseVariance,
    };
  } catch {
    return { hasInconsistencies: false, variance: 0 };
  }
}

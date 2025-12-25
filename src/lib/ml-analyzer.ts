import { MLAnalysis, Finding } from './types';
import type Sharp from 'sharp';

type SharpInstance = ReturnType<typeof Sharp>;

const ROBOFLOW_API_KEY = process.env.ROBOFLOW_API_KEY;
const ROBOFLOW_MODEL = process.env.ROBOFLOW_MODEL || 'document-forgery-detection/1';

export async function analyzeWithML(
  buffer: Buffer,
  mimeType: string
): Promise<MLAnalysis> {
  const findings: Finding[] = [];

  // ML analysis only for images
  if (!mimeType.startsWith('image/')) {
    return {
      findings: [],
      performed: false,
    };
  }

  // Check if Roboflow is configured - if not, use local heuristics
  if (!ROBOFLOW_API_KEY) {
    // Fall back to local heuristic analysis
    return performHeuristicAnalysis(buffer, mimeType);
  }

  try {
    const result = await queryRoboflow(buffer);
    
    if (result) {
      const forgeryProbability = result.predictions?.[0]?.confidence || 0;
      const manipulationTypes = result.predictions?.map((p: { class: string }) => p.class) || [];

      if (forgeryProbability > 0.7) {
        findings.push({
          id: 'ml-forgery-detected',
          category: 'ml',
          title: 'ML Model Detected Potential Forgery',
          description: `Machine learning analysis indicates a ${(forgeryProbability * 100).toFixed(1)}% probability of manipulation.`,
          severity: 'critical',
          technicalDetails: `Detected types: ${manipulationTypes.join(', ')}`,
          recommendation: 'This document should be treated as suspicious and verified through alternative means.',
        });
      } else if (forgeryProbability > 0.4) {
        findings.push({
          id: 'ml-possible-forgery',
          category: 'ml',
          title: 'ML Model Flagged Possible Issues',
          description: `Machine learning analysis shows ${(forgeryProbability * 100).toFixed(1)}% probability of manipulation.`,
          severity: 'warning',
          technicalDetails: `Detected types: ${manipulationTypes.join(', ')}`,
          recommendation: 'Further manual review recommended.',
        });
      } else {
        findings.push({
          id: 'ml-clean',
          category: 'ml',
          title: 'ML Analysis Complete',
          description: 'Machine learning analysis did not detect obvious signs of forgery.',
          severity: 'info',
          technicalDetails: `Forgery probability: ${(forgeryProbability * 100).toFixed(1)}%`,
        });
      }

      return {
        findings,
        performed: true,
        provider: 'Roboflow',
        forgeryProbability,
        manipulationTypes,
        confidence: forgeryProbability,
      };
    }
  } catch (error) {
    findings.push({
      id: 'ml-error',
      category: 'ml',
      title: 'ML Analysis Failed',
      description: 'Could not complete machine learning analysis.',
      severity: 'warning',
      technicalDetails: String(error),
    });
  }

  return {
    findings,
    performed: false,
  };
}

interface RoboflowPrediction {
  class: string;
  confidence: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

interface RoboflowResponse {
  predictions: RoboflowPrediction[];
  time?: number;
}

async function queryRoboflow(buffer: Buffer): Promise<RoboflowResponse | null> {
  if (!ROBOFLOW_API_KEY) return null;

  try {
    const base64Image = buffer.toString('base64');
    
    const response = await fetch(
      `https://detect.roboflow.com/${ROBOFLOW_MODEL}?api_key=${ROBOFLOW_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: base64Image,
      }
    );

    if (!response.ok) {
      console.error('Roboflow API error:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Roboflow request failed:', error);
    return null;
  }
}

// Alternative: Local heuristic-based "ML-like" analysis
// Used when Roboflow is not available
export async function performHeuristicAnalysis(
  buffer: Buffer,
  mimeType: string
): Promise<MLAnalysis> {
  const findings: Finding[] = [];

  if (!mimeType.startsWith('image/')) {
    return { findings: [], performed: false };
  }

  try {
    const sharp = (await import('sharp')).default;
    const image = sharp(buffer);
    const metadata = await image.metadata();
    const { width = 0, height = 0 } = metadata;

    // Run all heuristic analyses in parallel
    const [
      statisticalResults,
      edgeResults,
      noiseResults,
      colorResults,
      blockResults,
    ] = await Promise.all([
      analyzeStatisticalAnomalies(image, width, height),
      analyzeEdgeInconsistencies(image, width, height),
      analyzeNoisePatterns(image, width, height),
      analyzeColorDistribution(image),
      analyzeBlockPatterns(image, width, height),
    ]);

    // Aggregate findings
    findings.push(...statisticalResults);
    findings.push(...edgeResults);
    findings.push(...noiseResults);
    findings.push(...colorResults);
    findings.push(...blockResults);

    // Calculate overall forgery probability based on findings
    const criticalCount = findings.filter(f => f.severity === 'critical').length;
    const suspiciousCount = findings.filter(f => f.severity === 'suspicious').length;
    const warningCount = findings.filter(f => f.severity === 'warning').length;

    const forgeryProbability = Math.min(1,
      (criticalCount * 0.35) + (suspiciousCount * 0.15) + (warningCount * 0.05)
    );

    // Add summary finding
    if (forgeryProbability > 0.6) {
      findings.unshift({
        id: 'heuristic-high-risk',
        category: 'ml',
        title: 'Heuristic Analysis: High Manipulation Risk',
        description: `Multiple forensic indicators suggest this image may have been manipulated. Confidence: ${(forgeryProbability * 100).toFixed(0)}%`,
        severity: 'critical',
        recommendation: 'This document requires thorough manual verification before use.',
      });
    } else if (forgeryProbability > 0.3) {
      findings.unshift({
        id: 'heuristic-medium-risk',
        category: 'ml',
        title: 'Heuristic Analysis: Moderate Concern',
        description: `Some forensic indicators warrant attention. Confidence: ${(forgeryProbability * 100).toFixed(0)}%`,
        severity: 'warning',
        recommendation: 'Consider additional verification steps.',
      });
    } else {
      findings.unshift({
        id: 'heuristic-low-risk',
        category: 'ml',
        title: 'Heuristic Analysis Complete',
        description: 'No significant manipulation indicators detected through heuristic analysis.',
        severity: 'info',
      });
    }

    return {
      findings,
      performed: true,
      provider: 'Local Heuristics',
      forgeryProbability,
      confidence: forgeryProbability,
    };
  } catch (error) {
    findings.push({
      id: 'heuristic-error',
      category: 'ml',
      title: 'Heuristic Analysis Error',
      description: 'Could not complete heuristic analysis.',
      severity: 'info',
      technicalDetails: String(error),
    });

    return {
      findings,
      performed: false,
      provider: 'Local Heuristics',
    };
  }
}

// Analyze statistical anomalies in pixel values
async function analyzeStatisticalAnomalies(
  image: SharpInstance,
  width: number,
  height: number
): Promise<Finding[]> {
  const findings: Finding[] = [];

  try {
    const { data, info } = await image
      .clone()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const channels = info.channels;
    const pixelCount = width * height;

    // Calculate per-channel statistics
    const channelStats: { mean: number; variance: number; min: number; max: number }[] = [];

    for (let c = 0; c < channels; c++) {
      let sum = 0;
      let sumSq = 0;
      let min = 255;
      let max = 0;

      for (let i = c; i < data.length; i += channels) {
        const val = data[i];
        sum += val;
        sumSq += val * val;
        min = Math.min(min, val);
        max = Math.max(max, val);
      }

      const mean = sum / pixelCount;
      const variance = (sumSq / pixelCount) - (mean * mean);
      channelStats.push({ mean, variance, min, max });
    }

    // Check for unusual variance patterns (potential splicing indicator)
    const avgVariance = channelStats.reduce((a, b) => a + b.variance, 0) / channels;
    if (avgVariance < 100) {
      findings.push({
        id: 'stat-low-variance',
        category: 'ml',
        title: 'Unusually Low Color Variance',
        description: 'Image has unusually uniform color distribution, which may indicate synthetic generation or heavy processing.',
        severity: 'warning',
        technicalDetails: `Average variance: ${avgVariance.toFixed(2)} (typical: 500-3000)`,
      });
    }

    // Check for truncated histogram (potential manipulation)
    const hasFullRange = channelStats.some(s => s.min < 5 && s.max > 250);
    const hasTruncatedRange = channelStats.every(s => s.min > 20 || s.max < 235);

    if (hasTruncatedRange && !hasFullRange) {
      findings.push({
        id: 'stat-truncated-histogram',
        category: 'ml',
        title: 'Truncated Color Range',
        description: 'Color values appear artificially constrained, suggesting post-processing or level adjustments.',
        severity: 'warning',
        technicalDetails: `Range: ${channelStats.map(s => `[${s.min}-${s.max}]`).join(', ')}`,
      });
    }

    // Check for unusual channel correlation
    if (channels >= 3) {
      const rMean = channelStats[0].mean;
      const gMean = channelStats[1].mean;
      const bMean = channelStats[2].mean;

      const maxDiff = Math.max(
        Math.abs(rMean - gMean),
        Math.abs(gMean - bMean),
        Math.abs(rMean - bMean)
      );

      if (maxDiff < 3) {
        findings.push({
          id: 'stat-grayscale-rgb',
          category: 'ml',
          title: 'Grayscale in RGB Format',
          description: 'Image appears to be grayscale stored as RGB, which may indicate format conversion.',
          severity: 'info',
          technicalDetails: `Channel means: R=${rMean.toFixed(1)}, G=${gMean.toFixed(1)}, B=${bMean.toFixed(1)}`,
        });
      }
    }
  } catch {
    // Silently skip if analysis fails
  }

  return findings;
}

// Analyze edge inconsistencies
async function analyzeEdgeInconsistencies(
  image: SharpInstance,
  width: number,
  height: number
): Promise<Finding[]> {
  const findings: Finding[] = [];

  try {
    // Get edge-detected version
    const edgeData = await image
      .clone()
      .greyscale()
      .convolve({
        width: 3,
        height: 3,
        kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
      })
      .raw()
      .toBuffer();

    // Analyze edge density in different regions
    const regionSize = Math.min(width, height) / 4;
    const regions: { x: number; y: number; density: number }[] = [];

    for (let ry = 0; ry < 4; ry++) {
      for (let rx = 0; rx < 4; rx++) {
        let edgeSum = 0;
        let pixelCount = 0;

        const startX = Math.floor(rx * regionSize);
        const startY = Math.floor(ry * regionSize);
        const endX = Math.min(startX + regionSize, width);
        const endY = Math.min(startY + regionSize, height);

        for (let y = startY; y < endY; y++) {
          for (let x = startX; x < endX; x++) {
            const idx = y * width + x;
            if (idx < edgeData.length) {
              edgeSum += edgeData[idx];
              pixelCount++;
            }
          }
        }

        const density = pixelCount > 0 ? edgeSum / pixelCount : 0;
        regions.push({ x: rx, y: ry, density });
      }
    }

    // Check for dramatic edge density differences (splicing indicator)
    const densities = regions.map(r => r.density);
    const avgDensity = densities.reduce((a, b) => a + b, 0) / densities.length;
    const maxDensity = Math.max(...densities);
    const minDensity = Math.min(...densities);

    if (avgDensity > 0 && (maxDensity / Math.max(minDensity, 1)) > 5) {
      findings.push({
        id: 'edge-inconsistent-regions',
        category: 'ml',
        title: 'Inconsistent Edge Patterns',
        description: 'Different regions show dramatically different edge characteristics, which may indicate compositing.',
        severity: 'suspicious',
        technicalDetails: `Edge density ratio: ${(maxDensity / Math.max(minDensity, 1)).toFixed(1)}x variation`,
      });
    }

    // Check for suspiciously sharp rectangular edges (copy-paste indicator)
    const highEdgeRegions = regions.filter(r => r.density > avgDensity * 2);
    if (highEdgeRegions.length === 1 || highEdgeRegions.length === 2) {
      // Isolated high-edge regions may indicate pasted elements
      findings.push({
        id: 'edge-isolated-high',
        category: 'ml',
        title: 'Isolated High-Contrast Region',
        description: 'Localized area with significantly higher edge activity detected.',
        severity: 'warning',
        technicalDetails: `${highEdgeRegions.length} region(s) with elevated edge density`,
      });
    }
  } catch {
    // Silently skip if analysis fails
  }

  return findings;
}

// Analyze noise patterns
async function analyzeNoisePatterns(
  image: SharpInstance,
  width: number,
  height: number
): Promise<Finding[]> {
  const findings: Finding[] = [];

  try {
    // Get high-frequency noise by subtracting blurred version
    const originalData = await image.clone().greyscale().raw().toBuffer();
    const blurredData = await image.clone().greyscale().blur(2).raw().toBuffer();

    // Calculate noise levels in regions
    const regionSize = Math.floor(Math.min(width, height) / 4);
    const regionNoise: number[] = [];

    for (let ry = 0; ry < 4; ry++) {
      for (let rx = 0; rx < 4; rx++) {
        let noiseSum = 0;
        let count = 0;

        const startX = Math.floor(rx * regionSize);
        const startY = Math.floor(ry * regionSize);
        const endX = Math.min(startX + regionSize, width);
        const endY = Math.min(startY + regionSize, height);

        for (let y = startY; y < endY; y++) {
          for (let x = startX; x < endX; x++) {
            const idx = y * width + x;
            if (idx < originalData.length && idx < blurredData.length) {
              noiseSum += Math.abs(originalData[idx] - blurredData[idx]);
              count++;
            }
          }
        }

        regionNoise.push(count > 0 ? noiseSum / count : 0);
      }
    }

    // Check for inconsistent noise levels (different source images)
    const avgNoise = regionNoise.reduce((a, b) => a + b, 0) / regionNoise.length;
    const noiseVariance = regionNoise.reduce((a, b) => a + Math.pow(b - avgNoise, 2), 0) / regionNoise.length;
    const noiseStdDev = Math.sqrt(noiseVariance);

    if (avgNoise > 1 && noiseStdDev / avgNoise > 0.5) {
      findings.push({
        id: 'noise-inconsistent',
        category: 'ml',
        title: 'Inconsistent Noise Patterns',
        description: 'Different areas of the image show different noise characteristics, suggesting multiple source images.',
        severity: 'suspicious',
        technicalDetails: `Noise coefficient of variation: ${((noiseStdDev / avgNoise) * 100).toFixed(1)}%`,
      });
    }

    // Check for suspiciously low noise (synthetic or heavily processed)
    if (avgNoise < 0.5 && width > 500 && height > 500) {
      findings.push({
        id: 'noise-too-clean',
        category: 'ml',
        title: 'Unusually Clean Image',
        description: 'Image has very low noise levels, which may indicate synthetic generation or aggressive denoising.',
        severity: 'warning',
        technicalDetails: `Average noise level: ${avgNoise.toFixed(3)} (typical: 1-10)`,
      });
    }
  } catch {
    // Silently skip if analysis fails
  }

  return findings;
}

// Analyze color distribution
async function analyzeColorDistribution(
  image: SharpInstance
): Promise<Finding[]> {
  const findings: Finding[] = [];

  try {
    const { data, info } = await image
      .clone()
      .resize(256, 256, { fit: 'fill' }) // Normalize size for histogram
      .raw()
      .toBuffer({ resolveWithObject: true });

    const channels = info.channels;

    // Build histograms for each channel
    const histograms: number[][] = [];
    for (let c = 0; c < Math.min(channels, 3); c++) {
      const hist = new Array(256).fill(0);
      for (let i = c; i < data.length; i += channels) {
        hist[data[i]]++;
      }
      histograms.push(hist);
    }

    // Check for histogram gaps (level manipulation)
    for (let c = 0; c < histograms.length; c++) {
      const hist = histograms[c];
      let gapCount = 0;
      let maxGapSize = 0;
      let currentGap = 0;

      for (let i = 10; i < 245; i++) { // Avoid edges
        if (hist[i] === 0 && hist[i-1] > 0 && hist[i+1] > 0) {
          currentGap++;
          gapCount++;
        } else {
          maxGapSize = Math.max(maxGapSize, currentGap);
          currentGap = 0;
        }
      }

      if (gapCount > 30) {
        findings.push({
          id: 'color-histogram-gaps',
          category: 'ml',
          title: 'Histogram Comb Pattern',
          description: 'Color histogram shows gaps indicating levels/curves adjustment or format conversion.',
          severity: 'warning',
          technicalDetails: `${gapCount} gaps detected in color channel`,
        });
        break;
      }
    }

    // Check for unusual color spikes (potential color manipulation)
    for (let c = 0; c < histograms.length; c++) {
      const hist = histograms[c];
      const avg = hist.reduce((a, b) => a + b, 0) / 256;
      const spikes = hist.filter(v => v > avg * 10).length;

      if (spikes > 5 && spikes < 20) {
        findings.push({
          id: 'color-unusual-spikes',
          category: 'ml',
          title: 'Unusual Color Spikes',
          description: 'Color distribution shows unusual spikes that may indicate posterization or artificial coloring.',
          severity: 'info',
          technicalDetails: `${spikes} significant spikes in histogram`,
        });
        break;
      }
    }
  } catch {
    // Silently skip if analysis fails
  }

  return findings;
}

// Analyze block patterns (JPEG artifacts, copy-paste)
async function analyzeBlockPatterns(
  image: SharpInstance,
  width: number,
  height: number
): Promise<Finding[]> {
  const findings: Finding[] = [];

  try {
    // Analyze 8x8 block patterns (JPEG compression unit)
    const { data } = await image
      .clone()
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Sample block boundaries and interiors
    const blockSize = 8;
    let boundarySum = 0;
    let boundaryCount = 0;
    let interiorSum = 0;
    let interiorCount = 0;

    // Sample uniformly across the image
    const step = 4; // Sample every 4th pixel for speed

    for (let y = step; y < height - step; y += step) {
      for (let x = step; x < width - step; x += step) {
        const idx = y * width + x;
        if (idx >= data.length) continue;

        const val = data[idx];
        const isOnBoundary = (x % blockSize === 0) || (y % blockSize === 0);

        if (isOnBoundary) {
          boundarySum += val;
          boundaryCount++;
        } else {
          interiorSum += val;
          interiorCount++;
        }
      }
    }

    // Check for block boundary artifacts
    if (boundaryCount > 0 && interiorCount > 0) {
      const boundaryAvg = boundarySum / boundaryCount;
      const interiorAvg = interiorSum / interiorCount;
      const blockDiff = Math.abs(boundaryAvg - interiorAvg);

      if (blockDiff > 3) {
        findings.push({
          id: 'block-jpeg-artifacts',
          category: 'ml',
          title: 'JPEG Block Artifacts Detected',
          description: 'Image shows visible 8x8 block patterns indicating JPEG compression or recompression.',
          severity: 'info',
          technicalDetails: `Block boundary difference: ${blockDiff.toFixed(2)}`,
        });
      }
    }

    // Simple duplicate block detection (clone detection)
    if (width > 200 && height > 200) {
      const blockHashes = new Map<string, number>();
      const sampleBlocks = 500; // Sample random blocks
      let duplicateBlocks = 0;

      for (let i = 0; i < sampleBlocks; i++) {
        const bx = Math.floor(Math.random() * (width - 16));
        const by = Math.floor(Math.random() * (height - 16));

        // Create simple hash of 16x16 block
        let hash = '';
        for (let dy = 0; dy < 16; dy += 4) {
          for (let dx = 0; dx < 16; dx += 4) {
            const idx = (by + dy) * width + (bx + dx);
            if (idx < data.length) {
              hash += Math.floor(data[idx] / 16).toString(16);
            }
          }
        }

        if (blockHashes.has(hash)) {
          duplicateBlocks++;
        } else {
          blockHashes.set(hash, 1);
        }
      }

      const duplicateRatio = duplicateBlocks / sampleBlocks;
      if (duplicateRatio > 0.05 && duplicateRatio < 0.3) {
        findings.push({
          id: 'block-duplicates',
          category: 'ml',
          title: 'Potential Clone Regions',
          description: 'Similar pixel blocks detected in different locations, which may indicate copy-paste manipulation.',
          severity: 'suspicious',
          technicalDetails: `${(duplicateRatio * 100).toFixed(1)}% block similarity detected`,
        });
      }
    }
  } catch {
    // Silently skip if analysis fails
  }

  return findings;
}

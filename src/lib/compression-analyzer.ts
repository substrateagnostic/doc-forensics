import { CompressionAnalysis, Finding } from './types';
import sharp from 'sharp';

export async function analyzeCompression(
  buffer: Buffer,
  mimeType: string
): Promise<CompressionAnalysis> {
  const findings: Finding[] = [];
  
  if (!mimeType.startsWith('image/')) {
    return {
      findings: [],
      resaveDetected: false,
    };
  }

  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();
    const stats = await image.stats();

    // Get dimensions
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    // Analyze JPEG quality if applicable
    let jpegQuality: number | undefined;
    let qualityVariance: number | undefined;
    let resaveDetected = false;

    if (mimeType === 'image/jpeg') {
      // Estimate JPEG quality from file size and dimensions
      const fileSize = buffer.length;
      const pixels = width * height;
      const bytesPerPixel = fileSize / pixels;
      
      // Rough quality estimation (higher bytes per pixel = higher quality)
      // This is an approximation based on typical JPEG compression ratios
      if (bytesPerPixel > 2.5) {
        jpegQuality = 95;
      } else if (bytesPerPixel > 1.5) {
        jpegQuality = 85;
      } else if (bytesPerPixel > 0.8) {
        jpegQuality = 75;
      } else if (bytesPerPixel > 0.4) {
        jpegQuality = 60;
      } else {
        jpegQuality = 40;
      }

      // Check for multiple compression artifacts (resave detection)
      // Low quality with high-quality dimensions suggests resave
      if (jpegQuality < 70 && pixels > 2000000) {
        resaveDetected = true;
        findings.push({
          id: 'comp-resave-detected',
          category: 'compression',
          title: 'Possible Resave Detected',
          description: 'Image shows signs of being saved multiple times at different quality levels. This is common when images are edited and re-exported.',
          severity: 'suspicious',
          technicalDetails: `Estimated quality: ${jpegQuality}%, Resolution: ${width}x${height}`,
          recommendation: 'Request the original uncompressed image if available.',
        });
      }

      // Very low quality is suspicious for documents
      if (jpegQuality < 50) {
        findings.push({
          id: 'comp-low-quality',
          category: 'compression',
          title: 'Unusually Low Image Quality',
          description: 'Image quality is very low. Heavy compression can hide manipulation artifacts but also may simply indicate a low-quality source.',
          severity: 'warning',
          technicalDetails: `Estimated quality: ${jpegQuality}%`,
        });
      }

      // Perform block analysis for quality variance
      qualityVariance = await analyzeBlockVariance(buffer, width, height);
      
      if (qualityVariance && qualityVariance > 15) {
        findings.push({
          id: 'comp-quality-variance',
          category: 'compression',
          title: 'Quality Inconsistency Detected',
          description: 'Different regions of the image show different compression levels. This may indicate that parts of the image were edited or composited from different sources.',
          severity: 'suspicious',
          technicalDetails: `Quality variance: ${qualityVariance.toFixed(1)}%`,
          recommendation: 'Examine the image regions with different quality levels.',
        });
      }
    }

    // Check for PNG with JPEG artifacts
    if (mimeType === 'image/png') {
      const hasJpegArtifacts = await detectJpegArtifactsInPng(buffer);
      if (hasJpegArtifacts) {
        findings.push({
          id: 'comp-png-jpeg-artifacts',
          category: 'compression',
          title: 'JPEG Artifacts in PNG',
          description: 'This PNG image contains compression artifacts typical of JPEG. The image was likely converted from JPEG to PNG, possibly to hide the JPEG compression history.',
          severity: 'suspicious',
          recommendation: 'Be aware that the image has been through lossy compression despite being in a lossless format.',
        });
      }
    }

    // Check for unusual dimensions
    if (width && height) {
      const aspectRatio = width / height;
      const commonRatios = [4/3, 16/9, 3/2, 1, 16/10, 21/9];
      const isCommonRatio = commonRatios.some(r => Math.abs(aspectRatio - r) < 0.05);
      
      // Check if dimensions suggest cropping
      if (!isCommonRatio && (width % 100 !== 0 || height % 100 !== 0)) {
        findings.push({
          id: 'comp-unusual-dimensions',
          category: 'compression',
          title: 'Unusual Image Dimensions',
          description: 'Image dimensions do not match common aspect ratios and are not round numbers. This may indicate the image was cropped.',
          severity: 'info',
          technicalDetails: `Dimensions: ${width}x${height}, Aspect ratio: ${aspectRatio.toFixed(3)}`,
        });
      }
    }

    // Analyze color distribution for anomalies
    const colorAnalysis = analyzeColorDistribution(stats);
    if (colorAnalysis) {
      findings.push(colorAnalysis);
    }

    return {
      findings,
      jpegQuality,
      qualityVariance,
      resaveDetected,
    };

  } catch (error) {
    findings.push({
      id: 'comp-analysis-error',
      category: 'compression',
      title: 'Compression Analysis Failed',
      description: 'Could not complete compression analysis.',
      severity: 'warning',
      technicalDetails: String(error),
    });

    return {
      findings,
      resaveDetected: false,
    };
  }
}

async function analyzeBlockVariance(
  buffer: Buffer,
  width: number,
  height: number
): Promise<number | undefined> {
  try {
    // Divide image into blocks and compare compression characteristics
    const blockSize = 64;
    const blocksX = Math.floor(width / blockSize);
    const blocksY = Math.floor(height / blockSize);
    
    if (blocksX < 3 || blocksY < 3) return undefined;

    const image = sharp(buffer);
    const qualities: number[] = [];

    // Sample blocks at different positions
    const samplePositions = [
      { x: 0, y: 0 },
      { x: Math.floor(blocksX / 2) * blockSize, y: 0 },
      { x: (blocksX - 1) * blockSize, y: 0 },
      { x: 0, y: Math.floor(blocksY / 2) * blockSize },
      { x: Math.floor(blocksX / 2) * blockSize, y: Math.floor(blocksY / 2) * blockSize },
      { x: (blocksX - 1) * blockSize, y: Math.floor(blocksY / 2) * blockSize },
      { x: 0, y: (blocksY - 1) * blockSize },
      { x: Math.floor(blocksX / 2) * blockSize, y: (blocksY - 1) * blockSize },
      { x: (blocksX - 1) * blockSize, y: (blocksY - 1) * blockSize },
    ];

    for (const pos of samplePositions) {
      try {
        const block = await sharp(buffer)
          .extract({ left: pos.x, top: pos.y, width: blockSize, height: blockSize })
          .jpeg({ quality: 100 })
          .toBuffer();
        
        // Use buffer size as proxy for quality/detail
        qualities.push(block.length);
      } catch {
        // Skip blocks that fail
      }
    }

    if (qualities.length < 5) return undefined;

    // Calculate coefficient of variation
    const mean = qualities.reduce((a, b) => a + b, 0) / qualities.length;
    const variance = qualities.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / qualities.length;
    const stdDev = Math.sqrt(variance);
    const cv = (stdDev / mean) * 100;

    return cv;
  } catch {
    return undefined;
  }
}

async function detectJpegArtifactsInPng(buffer: Buffer): Promise<boolean> {
  try {
    // Convert to raw pixels and look for 8x8 block patterns
    const { data, info } = await sharp(buffer)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height, channels } = info;
    
    // Sample along 8-pixel boundaries looking for discontinuities
    let boundaryDiscontinuities = 0;
    let totalSamples = 0;

    for (let y = 8; y < height - 8; y += 8) {
      for (let x = 0; x < width - 1; x++) {
        const idx1 = (y * width + x) * channels;
        const idx2 = (y * width + x + 1) * channels;
        
        // Compare adjacent pixels at block boundaries
        const diff = Math.abs(data[idx1] - data[idx2]);
        
        totalSamples++;
        if (diff > 20) boundaryDiscontinuities++;
      }
    }

    // High ratio of discontinuities at 8-pixel boundaries suggests JPEG blocks
    const ratio = boundaryDiscontinuities / totalSamples;
    return ratio > 0.15;
  } catch {
    return false;
  }
}

function analyzeColorDistribution(stats: sharp.Stats): Finding | null {
  // Check for unusual color distribution that might indicate manipulation
  const channels = stats.channels;
  
  if (channels.length < 3) return null;

  // Check for clipped highlights or shadows
  const r = channels[0];
  const g = channels[1];
  const b = channels[2];

  // Extreme mean values might indicate manipulation
  const means = [r.mean, g.mean, b.mean];
  const avgMean = means.reduce((a, b) => a + b, 0) / 3;

  // Check for very uniform colors (possible solid fill)
  const stdDevs = [r.stdev, g.stdev, b.stdev];
  const avgStdDev = stdDevs.reduce((a, b) => a + b, 0) / 3;

  if (avgStdDev < 10) {
    return {
      id: 'comp-uniform-color',
      category: 'compression',
      title: 'Unusually Uniform Color Distribution',
      description: 'Image has very uniform colors, which may indicate artificial generation or heavy processing.',
      severity: 'info',
      technicalDetails: `Average standard deviation: ${avgStdDev.toFixed(2)}`,
    };
  }

  return null;
}

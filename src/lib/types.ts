// Forensic analysis types

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type FindingSeverity = 'info' | 'warning' | 'suspicious' | 'critical';

export interface Finding {
  id: string;
  category: 'metadata' | 'compression' | 'structure' | 'fonts' | 'visual' | 'ml' | 'id';
  title: string;
  description: string;
  severity: FindingSeverity;
  technicalDetails?: string;
  recommendation?: string;
}

export interface MetadataAnalysis {
  raw: Record<string, unknown>;
  findings: Finding[];
  summary: {
    creationSoftware?: string;
    modificationSoftware?: string;
    createDate?: string;
    modifyDate?: string;
    author?: string;
    producer?: string;
    deviceMake?: string;
    deviceModel?: string;
    gpsLocation?: { lat: number; lng: number };
  };
}

export interface CompressionAnalysis {
  findings: Finding[];
  jpegQuality?: number;
  qualityVariance?: number;
  resaveDetected: boolean;
  regions?: {
    x: number;
    y: number;
    width: number;
    height: number;
    quality: number;
  }[];
}

export interface StructureAnalysis {
  findings: Finding[];
  pageCount?: number;
  hasEmbeddedFiles: boolean;
  hasJavaScript: boolean;
  hasFormFields: boolean;
  hasDigitalSignature: boolean;
  hasRedactions: boolean;
  layerCount?: number;
}

export interface FontAnalysis {
  findings: Finding[];
  fonts: {
    name: string;
    type: string;
    embedded: boolean;
    pageNumbers: number[];
  }[];
  fontCount: number;
  mixedFontsDetected: boolean;
  suspiciousFontUsage: boolean;
}

export interface VisualAnalysis {
  findings: Finding[];
  elaPerformed: boolean;
  elaImageBase64?: string;
  cloneDetectionPerformed: boolean;
  anomalyRegions?: {
    x: number;
    y: number;
    width: number;
    height: number;
    type: string;
    confidence: number;
  }[];
}

export interface MLAnalysis {
  findings: Finding[];
  performed: boolean;
  provider?: string;
  forgeryProbability?: number;
  manipulationTypes?: string[];
  confidence?: number;
}

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

export interface SignatureAnalysis {
  findings: Finding[];
  signaturesDetected: number;
  signatures: {
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
    type: 'handwritten' | 'stamp' | 'digital' | 'initial';
    imageBase64?: string;
  }[];
  hasDigitalSignature: boolean;
}

export interface ForensicReport {
  documentName: string;
  documentType: string;
  documentSize: number;
  documentHash: string;
  analysisTimestamp: string;
  overallRisk: RiskLevel;
  riskScore: number; // 0-100
  findings: Finding[];
  metadata: MetadataAnalysis;
  compression: CompressionAnalysis;
  structure: StructureAnalysis;
  fonts: FontAnalysis;
  visual: VisualAnalysis;
  ml: MLAnalysis;
  idDocument: IDDocumentAnalysis;
  signatures: SignatureAnalysis;
  recommendations: string[];
}

// File type detection
export const SUPPORTED_TYPES = {
  'application/pdf': 'PDF Document',
  'image/jpeg': 'JPEG Image',
  'image/png': 'PNG Image',
  'image/tiff': 'TIFF Image',
  'image/webp': 'WebP Image',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
} as const;

export type SupportedMimeType = keyof typeof SUPPORTED_TYPES;

import { StructureAnalysis, Finding } from './types';

export async function analyzeStructure(
  buffer: Buffer,
  mimeType: string
): Promise<StructureAnalysis> {
  const findings: Finding[] = [];

  if (mimeType === 'application/pdf') {
    return await analyzePdfStructure(buffer);
  }

  // For images, structure analysis is minimal
  if (mimeType.startsWith('image/')) {
    return {
      findings: [],
      hasEmbeddedFiles: false,
      hasJavaScript: false,
      hasFormFields: false,
      hasDigitalSignature: false,
      hasRedactions: false,
    };
  }

  return {
    findings,
    hasEmbeddedFiles: false,
    hasJavaScript: false,
    hasFormFields: false,
    hasDigitalSignature: false,
    hasRedactions: false,
  };
}

async function analyzePdfStructure(buffer: Buffer): Promise<StructureAnalysis> {
  const findings: Finding[] = [];
  const pdfStr = buffer.toString('latin1');

  // Count pages
  const pageMatches = pdfStr.match(/\/Type\s*\/Page[^s]/g);
  const pageCount = pageMatches?.length || 0;

  // Check for embedded files
  const hasEmbeddedFiles = /\/EmbeddedFiles/.test(pdfStr) || /\/FileAttachment/.test(pdfStr);
  if (hasEmbeddedFiles) {
    findings.push({
      id: 'struct-embedded-files',
      category: 'structure',
      title: 'Embedded Files Detected',
      description: 'PDF contains embedded files. These could contain additional documents or potentially malicious content.',
      severity: 'warning',
      recommendation: 'Extract and examine embedded files separately.',
    });
  }

  // Check for JavaScript
  const hasJavaScript = /\/JavaScript/.test(pdfStr) || /\/JS\s/.test(pdfStr);
  if (hasJavaScript) {
    findings.push({
      id: 'struct-javascript',
      category: 'structure',
      title: 'JavaScript Detected',
      description: 'PDF contains JavaScript code. While sometimes legitimate for forms, this can also indicate malicious content.',
      severity: 'suspicious',
      recommendation: 'Verify the PDF source and consider opening in a sandboxed environment.',
    });
  }

  // Check for form fields
  const hasFormFields = /\/AcroForm/.test(pdfStr) || /\/Widget/.test(pdfStr);
  if (hasFormFields) {
    findings.push({
      id: 'struct-form-fields',
      category: 'structure',
      title: 'Form Fields Present',
      description: 'PDF contains fillable form fields. Field values may have been modified after the document was created.',
      severity: 'info',
    });
  }

  // Check for digital signatures
  const hasDigitalSignature = /\/Sig\s/.test(pdfStr) || /\/SigFlags/.test(pdfStr);
  if (hasDigitalSignature) {
    findings.push({
      id: 'struct-digital-signature',
      category: 'structure',
      title: 'Digital Signature Present',
      description: 'PDF contains a digital signature. This can help verify authenticity, but the signature itself should be validated.',
      severity: 'info',
      recommendation: 'Verify the digital signature using appropriate PDF software.',
    });
  }

  // Check for redactions
  const hasRedactions = /\/Redact/.test(pdfStr);
  if (hasRedactions) {
    findings.push({
      id: 'struct-redactions',
      category: 'structure',
      title: 'Redactions Detected',
      description: 'PDF contains redaction annotations. Improperly applied redactions may be recoverable.',
      severity: 'warning',
      recommendation: 'Verify that redactions fully remove the underlying content.',
    });
  }

  // Check for multiple layers/OCGs (Optional Content Groups)
  const ocgMatches = pdfStr.match(/\/OCG\s/g);
  const layerCount = ocgMatches?.length || 0;
  if (layerCount > 1) {
    findings.push({
      id: 'struct-multiple-layers',
      category: 'structure',
      title: 'Multiple Layers Detected',
      description: `PDF contains ${layerCount} layers. Hidden layers may contain different content than what is visible.`,
      severity: 'suspicious',
      recommendation: 'Examine all layers in the PDF.',
    });
  }

  // Check for incremental updates (signs of editing)
  const incrementalUpdates = (pdfStr.match(/%%EOF/g)?.length || 1) - 1;
  if (incrementalUpdates > 0) {
    findings.push({
      id: 'struct-incremental-updates',
      category: 'structure',
      title: 'Document Has Been Modified',
      description: `PDF shows ${incrementalUpdates} incremental update(s), indicating the document was saved multiple times after creation.`,
      severity: 'info',
      technicalDetails: `Found ${incrementalUpdates + 1} %%EOF markers`,
    });

    if (incrementalUpdates > 3) {
      findings.push({
        id: 'struct-many-updates',
        category: 'structure',
        title: 'Numerous Modifications Detected',
        description: 'PDF has been modified many times. This could indicate extensive editing or tampering.',
        severity: 'warning',
      });
    }
  }

  // Check for XFA forms (can contain complex scripts)
  const hasXFA = /\/XFA/.test(pdfStr);
  if (hasXFA) {
    findings.push({
      id: 'struct-xfa-forms',
      category: 'structure',
      title: 'XFA Forms Detected',
      description: 'PDF contains XFA (XML Forms Architecture) data. These can contain complex scripts and are often used for interactive forms.',
      severity: 'warning',
    });
  }

  // Check for suspicious object streams
  const objStmCount = (pdfStr.match(/\/ObjStm/g) || []).length;
  if (objStmCount > 10) {
    findings.push({
      id: 'struct-object-streams',
      category: 'structure',
      title: 'Complex Object Structure',
      description: 'PDF contains many object streams. While not inherently suspicious, this can be used to obfuscate content.',
      severity: 'info',
      technicalDetails: `Found ${objStmCount} object streams`,
    });
  }

  // Check for encryption
  const isEncrypted = /\/Encrypt/.test(pdfStr);
  if (isEncrypted) {
    findings.push({
      id: 'struct-encrypted',
      category: 'structure',
      title: 'PDF is Encrypted',
      description: 'Document uses encryption. Some metadata and structure analysis may be limited.',
      severity: 'info',
    });
  }

  // Check PDF version for capabilities
  const versionMatch = pdfStr.match(/%PDF-(\d+\.\d+)/);
  const pdfVersion = versionMatch ? parseFloat(versionMatch[1]) : null;
  
  if (pdfVersion && pdfVersion >= 2.0) {
    findings.push({
      id: 'struct-modern-pdf',
      category: 'structure',
      title: 'Modern PDF Version',
      description: `PDF version ${pdfVersion} detected. Newer versions support advanced features that may require modern tools to fully analyze.`,
      severity: 'info',
    });
  }

  return {
    findings,
    pageCount,
    hasEmbeddedFiles,
    hasJavaScript,
    hasFormFields,
    hasDigitalSignature,
    hasRedactions,
    layerCount: layerCount > 0 ? layerCount : undefined,
  };
}

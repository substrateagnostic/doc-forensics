import { MetadataAnalysis, Finding } from './types';

interface ExifTag {
  value: unknown;
  description?: string;
}

export async function analyzeMetadata(
  buffer: Buffer,
  mimeType: string
): Promise<MetadataAnalysis> {
  const findings: Finding[] = [];
  const raw: Record<string, unknown> = {};
  const summary: MetadataAnalysis['summary'] = {};

  try {
    if (mimeType === 'application/pdf') {
      return await analyzePdfMetadata(buffer);
    } else if (mimeType.startsWith('image/')) {
      return await analyzeImageMetadata(buffer);
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return await analyzeDocxMetadata(buffer);
    }
  } catch (error) {
    findings.push({
      id: 'meta-extraction-error',
      category: 'metadata',
      title: 'Metadata Extraction Failed',
      description: 'Could not extract metadata from this file.',
      severity: 'warning',
      technicalDetails: String(error),
    });
  }

  return { raw, findings, summary };
}

async function analyzePdfMetadata(buffer: Buffer): Promise<MetadataAnalysis> {
  const pdfParse = (await import('pdf-parse')).default;
  const findings: Finding[] = [];
  
  const data = await pdfParse(buffer);
  const info = data.info || {};
  const metadata = data.metadata || {};
  
  const raw = { ...info, ...metadata };
  
  const summary: MetadataAnalysis['summary'] = {
    creationSoftware: String(info.Creator || ''),
    modificationSoftware: String(info.Producer || ''),
    createDate: String(info.CreationDate || ''),
    modifyDate: String(info.ModDate || ''),
    author: String(info.Author || ''),
    producer: String(info.Producer || ''),
  };

  // Check for metadata inconsistencies
  if (info.Creator && info.Producer && info.Creator !== info.Producer) {
    findings.push({
      id: 'meta-software-mismatch',
      category: 'metadata',
      title: 'Creation/Production Software Mismatch',
      description: `Document was created with "${info.Creator}" but produced/modified with "${info.Producer}". This may indicate the document was edited after initial creation.`,
      severity: 'info',
      technicalDetails: `Creator: ${info.Creator}, Producer: ${info.Producer}`,
    });
  }

  // Check for suspicious software
  const suspiciousSoftware = ['Photoshop', 'GIMP', 'Paint', 'Preview'];
  const creatorStr = String(info.Creator || '').toLowerCase();
  const producerStr = String(info.Producer || '').toLowerCase();
  
  for (const sw of suspiciousSoftware) {
    if (creatorStr.includes(sw.toLowerCase()) || producerStr.includes(sw.toLowerCase())) {
      findings.push({
        id: `meta-image-editor-${sw.toLowerCase()}`,
        category: 'metadata',
        title: 'Image Editing Software Detected',
        description: `Document shows signs of being processed with ${sw}. This is unusual for standard documents and may indicate image manipulation.`,
        severity: 'suspicious',
        recommendation: 'Verify the document source and compare with original if available.',
      });
    }
  }

  // Check date consistency
  if (info.CreationDate && info.ModDate) {
    const createDate = parseDate(String(info.CreationDate));
    const modDate = parseDate(String(info.ModDate));
    
    if (createDate && modDate) {
      if (modDate < createDate) {
        findings.push({
          id: 'meta-date-paradox',
          category: 'metadata',
          title: 'Date Paradox Detected',
          description: 'Modification date is earlier than creation date. This is physically impossible and suggests metadata manipulation.',
          severity: 'critical',
          technicalDetails: `Created: ${info.CreationDate}, Modified: ${info.ModDate}`,
        });
      }
      
      const hoursDiff = (modDate.getTime() - createDate.getTime()) / (1000 * 60 * 60);
      if (hoursDiff > 8760) { // More than a year
        findings.push({
          id: 'meta-long-gap',
          category: 'metadata',
          title: 'Large Time Gap Between Creation and Modification',
          description: `Document was modified ${Math.round(hoursDiff / 24)} days after creation. Consider whether this timeline makes sense for the document's purpose.`,
          severity: 'info',
        });
      }
    }
  }

  // Check for stripped metadata
  const essentialFields = ['Creator', 'Producer', 'CreationDate'];
  const missingFields = essentialFields.filter(f => !info[f]);
  
  if (missingFields.length === essentialFields.length) {
    findings.push({
      id: 'meta-stripped',
      category: 'metadata',
      title: 'Metadata Appears Stripped',
      description: 'Essential metadata fields are missing. This may indicate intentional removal of identifying information.',
      severity: 'suspicious',
      recommendation: 'Request the original document with intact metadata.',
    });
  }

  return { raw, findings, summary };
}

async function analyzeImageMetadata(buffer: Buffer): Promise<MetadataAnalysis> {
  const ExifReader = await import('exifreader');
  const findings: Finding[] = [];
  
  let tags: Record<string, ExifTag> = {};
  try {
    tags = ExifReader.load(buffer) as Record<string, ExifTag>;
  } catch {
    return {
      raw: {},
      findings: [{
        id: 'meta-no-exif',
        category: 'metadata',
        title: 'No EXIF Data Found',
        description: 'Image contains no EXIF metadata. This may indicate the image was processed or stripped of identifying information.',
        severity: 'warning',
      }],
      summary: {},
    };
  }

  const raw: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(tags)) {
    raw[key] = value?.description || value?.value;
  }

  const summary: MetadataAnalysis['summary'] = {
    deviceMake: String(tags['Make']?.description || ''),
    deviceModel: String(tags['Model']?.description || ''),
    creationSoftware: String(tags['Software']?.description || ''),
    createDate: String(tags['DateTimeOriginal']?.description || tags['DateTime']?.description || ''),
  };

  // Check for GPS data
  if (tags['GPSLatitude'] && tags['GPSLongitude']) {
    const lat = parseGPS(tags['GPSLatitude']?.value, tags['GPSLatitudeRef']?.value);
    const lng = parseGPS(tags['GPSLongitude']?.value, tags['GPSLongitudeRef']?.value);
    
    if (lat !== null && lng !== null) {
      summary.gpsLocation = { lat, lng };
      findings.push({
        id: 'meta-gps-present',
        category: 'metadata',
        title: 'GPS Location Data Present',
        description: `Image contains GPS coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}. This can verify where the photo was taken.`,
        severity: 'info',
        technicalDetails: `Latitude: ${lat}, Longitude: ${lng}`,
      });
    }
  }

  // Check for editing software
  const software = String(tags['Software']?.description || '').toLowerCase();
  const editingSoftware = ['photoshop', 'gimp', 'lightroom', 'snapseed', 'vsco', 'facetune'];
  
  for (const sw of editingSoftware) {
    if (software.includes(sw)) {
      findings.push({
        id: `meta-editor-${sw}`,
        category: 'metadata',
        title: 'Image Editing Software Detected',
        description: `Image was processed with software containing "${sw}". The image may have been altered.`,
        severity: 'suspicious',
        technicalDetails: `Software: ${tags['Software']?.description}`,
      });
    }
  }

  // Check for thumbnail mismatch (common forgery indicator)
  if (tags['ThumbnailImage'] && tags['ImageWidth']) {
    findings.push({
      id: 'meta-thumbnail-present',
      category: 'metadata',
      title: 'Embedded Thumbnail Present',
      description: 'Image contains an embedded thumbnail. If the image was edited, the thumbnail may show the original version.',
      severity: 'info',
      recommendation: 'Extract and compare the thumbnail with the main image.',
    });
  }

  // Check for date consistency
  const dateOriginal = tags['DateTimeOriginal']?.description;
  const dateDigitized = tags['DateTimeDigitized']?.description;
  const dateModified = tags['DateTime']?.description;

  if (dateOriginal && dateModified && dateOriginal !== dateModified) {
    findings.push({
      id: 'meta-date-mismatch',
      category: 'metadata',
      title: 'Date Mismatch Detected',
      description: 'Original capture date differs from last modified date, indicating the image was edited after capture.',
      severity: 'info',
      technicalDetails: `Original: ${dateOriginal}, Modified: ${dateModified}`,
    });
  }

  return { raw, findings, summary };
}

function parseDate(dateStr: string): Date | null {
  // Handle PDF date format: D:YYYYMMDDHHmmSS
  const pdfMatch = dateStr.match(/D:(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/);
  if (pdfMatch) {
    const [, year, month, day, hour = '00', min = '00', sec = '00'] = pdfMatch;
    return new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}`);
  }
  
  // Try standard parsing
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

function parseGPS(value: unknown, ref: unknown): number | null {
  if (!value || !Array.isArray(value)) return null;

  try {
    const [degrees, minutes, seconds] = value as number[];
    let decimal = degrees + minutes / 60 + seconds / 3600;

    if (ref === 'S' || ref === 'W') {
      decimal = -decimal;
    }

    return decimal;
  } catch {
    return null;
  }
}

async function analyzeDocxMetadata(buffer: Buffer): Promise<MetadataAnalysis> {
  const JSZip = (await import('jszip')).default;
  const findings: Finding[] = [];
  const raw: Record<string, unknown> = {};
  const summary: MetadataAnalysis['summary'] = {};

  try {
    const zip = await JSZip.loadAsync(buffer);

    // Extract core.xml (Dublin Core metadata)
    const coreXml = await zip.file('docProps/core.xml')?.async('string');
    if (coreXml) {
      // Parse XML for common metadata
      const creator = extractXmlTag(coreXml, 'dc:creator');
      const lastModifiedBy = extractXmlTag(coreXml, 'cp:lastModifiedBy');
      const created = extractXmlTag(coreXml, 'dcterms:created');
      const modified = extractXmlTag(coreXml, 'dcterms:modified');
      const revision = extractXmlTag(coreXml, 'cp:revision');
      const title = extractXmlTag(coreXml, 'dc:title');
      const subject = extractXmlTag(coreXml, 'dc:subject');

      raw.creator = creator;
      raw.lastModifiedBy = lastModifiedBy;
      raw.created = created;
      raw.modified = modified;
      raw.revision = revision;
      raw.title = title;
      raw.subject = subject;

      summary.author = creator || undefined;
      summary.creationSoftware = creator || undefined;
      summary.modificationSoftware = lastModifiedBy || undefined;
      summary.createDate = created || undefined;
      summary.modifyDate = modified || undefined;

      // Check for author/modifier mismatch
      if (creator && lastModifiedBy && creator !== lastModifiedBy) {
        findings.push({
          id: 'meta-author-mismatch',
          category: 'metadata',
          title: 'Author/Editor Mismatch',
          description: `Document was created by "${creator}" but last modified by "${lastModifiedBy}". This indicates the document was edited by someone other than the original author.`,
          severity: 'info',
          technicalDetails: `Creator: ${creator}, Last Modified By: ${lastModifiedBy}`,
        });
      }

      // Check revision count
      if (revision) {
        const revNum = parseInt(revision, 10);
        raw.revisionCount = revNum;

        if (revNum > 20) {
          findings.push({
            id: 'meta-high-revisions',
            category: 'metadata',
            title: 'High Revision Count',
            description: `Document has been saved ${revNum} times, indicating extensive editing history.`,
            severity: 'info',
            technicalDetails: `Revision count: ${revNum}`,
          });
        }

        if (revNum === 1 && lastModifiedBy && lastModifiedBy !== creator) {
          findings.push({
            id: 'meta-single-revision-different-editor',
            category: 'metadata',
            title: 'Single Revision with Different Editor',
            description: `Document shows only 1 revision but was modified by someone different from the creator. This may indicate metadata manipulation.`,
            severity: 'suspicious',
            technicalDetails: `Revision: 1, Creator: ${creator}, Editor: ${lastModifiedBy}`,
          });
        }
      }

      // Check date consistency
      if (created && modified) {
        const createDate = new Date(created);
        const modifyDate = new Date(modified);

        if (!isNaN(createDate.getTime()) && !isNaN(modifyDate.getTime())) {
          if (modifyDate < createDate) {
            findings.push({
              id: 'meta-date-paradox',
              category: 'metadata',
              title: 'Date Paradox Detected',
              description: 'Modification date is earlier than creation date. This is physically impossible and suggests metadata manipulation.',
              severity: 'critical',
              technicalDetails: `Created: ${created}, Modified: ${modified}`,
            });
          }
        }
      }
    }

    // Extract app.xml (Application metadata)
    const appXml = await zip.file('docProps/app.xml')?.async('string');
    if (appXml) {
      const application = extractXmlTag(appXml, 'Application');
      const appVersion = extractXmlTag(appXml, 'AppVersion');
      const totalTime = extractXmlTag(appXml, 'TotalTime');
      const pages = extractXmlTag(appXml, 'Pages');
      const words = extractXmlTag(appXml, 'Words');
      const characters = extractXmlTag(appXml, 'Characters');
      const template = extractXmlTag(appXml, 'Template');

      raw.application = application;
      raw.appVersion = appVersion;
      raw.totalTime = totalTime;
      raw.pages = pages;
      raw.words = words;
      raw.characters = characters;
      raw.template = template;

      if (application) {
        summary.creationSoftware = application + (appVersion ? ` ${appVersion}` : '');
      }

      // Check for unusual editing time
      if (totalTime) {
        const minutes = parseInt(totalTime, 10);
        if (minutes === 0) {
          findings.push({
            id: 'meta-zero-edit-time',
            category: 'metadata',
            title: 'Zero Editing Time',
            description: 'Document shows 0 minutes of editing time. This is unusual and may indicate automated generation or metadata manipulation.',
            severity: 'warning',
            technicalDetails: `Total editing time: ${totalTime} minutes`,
          });
        } else if (minutes < 2 && parseInt(raw.words as string || '0', 10) > 500) {
          findings.push({
            id: 'meta-suspiciously-fast',
            category: 'metadata',
            title: 'Suspiciously Fast Creation',
            description: `Document with ${raw.words} words was created in only ${minutes} minutes. This may indicate copy-paste from another source.`,
            severity: 'suspicious',
            technicalDetails: `Words: ${raw.words}, Time: ${minutes} minutes`,
          });
        }
      }

      // Check for non-standard templates
      if (template && template.toLowerCase() !== 'normal.dotm' && template.toLowerCase() !== 'normal') {
        findings.push({
          id: 'meta-custom-template',
          category: 'metadata',
          title: 'Custom Template Used',
          description: `Document was created from template "${template}". This may indicate organizational origin.`,
          severity: 'info',
          technicalDetails: `Template: ${template}`,
        });
      }
    }

    // Check for embedded objects
    const embeddings = zip.folder('word/embeddings');
    if (embeddings) {
      const embeddedFiles = Object.keys(zip.files).filter(f => f.startsWith('word/embeddings/'));
      if (embeddedFiles.length > 0) {
        findings.push({
          id: 'meta-embedded-objects',
          category: 'metadata',
          title: 'Embedded Objects Detected',
          description: `Document contains ${embeddedFiles.length} embedded object(s). These could include spreadsheets, images, or other files.`,
          severity: 'warning',
          technicalDetails: `Embedded files: ${embeddedFiles.join(', ')}`,
          recommendation: 'Review embedded objects for potential security risks or hidden content.',
        });
      }
    }

    // Check for macros
    const vbaProject = zip.file('word/vbaProject.bin');
    if (vbaProject) {
      findings.push({
        id: 'meta-macros-present',
        category: 'metadata',
        title: 'VBA Macros Detected',
        description: 'Document contains VBA macros. Macros can be used for automation but also pose security risks.',
        severity: 'suspicious',
        recommendation: 'Only enable macros if you trust the document source. Macros can execute arbitrary code.',
      });
    }

    // Check if essential metadata is stripped
    if (!coreXml || (!raw.creator && !raw.lastModifiedBy && !raw.created)) {
      findings.push({
        id: 'meta-stripped',
        category: 'metadata',
        title: 'Metadata Appears Stripped',
        description: 'Essential metadata fields are missing or the metadata file is absent. This may indicate intentional removal of identifying information.',
        severity: 'suspicious',
        recommendation: 'Request the original document with intact metadata.',
      });
    }

  } catch (error) {
    findings.push({
      id: 'meta-docx-parse-error',
      category: 'metadata',
      title: 'DOCX Parsing Error',
      description: 'Could not fully parse the DOCX file structure.',
      severity: 'warning',
      technicalDetails: String(error),
    });
  }

  return { raw, findings, summary };
}

function extractXmlTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

import { FontAnalysis, Finding } from './types';

interface FontInfo {
  name: string;
  type: string;
  embedded: boolean;
  pageNumbers: number[];
}

export async function analyzeFonts(
  buffer: Buffer,
  mimeType: string
): Promise<FontAnalysis> {
  const findings: Finding[] = [];
  const fonts: FontInfo[] = [];

  // Font analysis is primarily for PDFs
  if (mimeType !== 'application/pdf') {
    return {
      findings: [],
      fonts: [],
      fontCount: 0,
      mixedFontsDetected: false,
      suspiciousFontUsage: false,
    };
  }

  const pdfStr = buffer.toString('latin1');
  
  // Extract font information
  const fontPattern = /\/BaseFont\s*\/([^\s\/\]>]+)/g;
  const fontNames = new Set<string>();
  
  let match: RegExpExecArray | null;
  while ((match = fontPattern.exec(pdfStr)) !== null) {
    fontNames.add(match[1].replace(/[#][0-9A-Fa-f]{2}/g, '')); // Clean hex escapes
  }

  // Process each unique font
  const fontNamesArray = Array.from(fontNames);
  for (const fontName of fontNamesArray) {
    const isEmbedded = new RegExp(`/BaseFont\\s*/${escapeRegex(fontName)}[^]*?/FontFile`).test(pdfStr);
    
    // Determine font type from name
    let fontType = 'Unknown';
    if (fontName.includes('Bold')) fontType = 'Bold';
    else if (fontName.includes('Italic') || fontName.includes('Oblique')) fontType = 'Italic';
    else if (fontName.includes('Regular') || !fontName.includes('-')) fontType = 'Regular';
    
    // Get base font family
    const baseName = fontName.split(/[-+]/)[0];
    
    fonts.push({
      name: fontName,
      type: fontType,
      embedded: isEmbedded,
      pageNumbers: [], // Would need more complex parsing to determine
    });
  }

  const fontCount = fonts.length;

  // Analyze font patterns
  const fontFamilies = new Set(fonts.map(f => f.name.split(/[-+]/)[0]));
  const mixedFontsDetected = fontFamilies.size > 3;
  
  // Check for suspicious patterns
  let suspiciousFontUsage = false;

  // Too many different fonts is suspicious for a standard document
  if (fontCount > 10) {
    suspiciousFontUsage = true;
    findings.push({
      id: 'font-excessive-count',
      category: 'fonts',
      title: 'Excessive Number of Fonts',
      description: `Document uses ${fontCount} different fonts. Professional documents typically use 2-4 fonts. Excessive fonts may indicate content from multiple sources.`,
      severity: 'suspicious',
      technicalDetails: `Fonts: ${fonts.map(f => f.name).join(', ')}`,
    });
  }

  // Check for common document fonts vs unusual ones
  const commonFonts = ['Arial', 'Helvetica', 'Times', 'Calibri', 'Cambria', 'Verdana', 'Georgia', 'Courier'];
  const unusualFonts = fonts.filter(f => 
    !commonFonts.some(cf => f.name.toLowerCase().includes(cf.toLowerCase()))
  );

  if (unusualFonts.length > fontCount / 2 && fontCount > 2) {
    findings.push({
      id: 'font-unusual',
      category: 'fonts',
      title: 'Unusual Font Selection',
      description: 'Document uses fonts not commonly found in standard business documents.',
      severity: 'info',
      technicalDetails: `Unusual fonts: ${unusualFonts.map(f => f.name).join(', ')}`,
    });
  }

  // Check for mixed serif and sans-serif in body text (potential copy-paste)
  const hasSerif = fonts.some(f => 
    /times|georgia|garamond|palatino|cambria|serif/i.test(f.name)
  );
  const hasSansSerif = fonts.some(f => 
    /arial|helvetica|verdana|calibri|sans/i.test(f.name)
  );

  if (hasSerif && hasSansSerif && fontCount > 3) {
    findings.push({
      id: 'font-mixed-styles',
      category: 'fonts',
      title: 'Mixed Font Styles Detected',
      description: 'Document contains both serif and sans-serif fonts. While this can be intentional, it may also indicate content compiled from multiple sources.',
      severity: 'info',
    });
  }

  // Check for unembedded fonts (potential substitution issues)
  const unembeddedFonts = fonts.filter(f => !f.embedded);
  if (unembeddedFonts.length > 0) {
    findings.push({
      id: 'font-unembedded',
      category: 'fonts',
      title: 'Unembedded Fonts Detected',
      description: `${unembeddedFonts.length} font(s) are not embedded in the document. The document may display differently on systems without these fonts installed.`,
      severity: 'info',
      technicalDetails: `Unembedded: ${unembeddedFonts.map(f => f.name).join(', ')}`,
    });
  }

  // Check for font substitution markers
  const hasSubstitution = /\/BaseFont\s*\/[A-Z]{6}\+/.test(pdfStr);
  if (hasSubstitution) {
    findings.push({
      id: 'font-subset',
      category: 'fonts',
      title: 'Font Subsets Used',
      description: 'Document uses font subsets (indicated by random prefix like "ABCDEF+FontName"). This is normal for PDFs but means only used characters are embedded.',
      severity: 'info',
    });
  }

  // Check for system fonts that might indicate screenshot/image of text
  const systemFonts = fonts.filter(f => 
    /segoe|tahoma|lucida|system/i.test(f.name)
  );
  if (systemFonts.length > 0 && fonts.some(f => /times|arial|calibri/i.test(f.name))) {
    findings.push({
      id: 'font-system-mixed',
      category: 'fonts',
      title: 'System UI Fonts Detected',
      description: 'Document contains system UI fonts alongside document fonts. This may indicate screenshots or UI elements were embedded in the document.',
      severity: 'warning',
    });
  }

  // Suspicious: Courier or monospace mixed with proportional fonts in unusual ways
  const hasMonospace = fonts.some(f => /courier|consolas|monaco|mono/i.test(f.name));
  const hasProportional = fonts.some(f => /arial|times|helvetica|calibri/i.test(f.name));
  
  if (hasMonospace && hasProportional && fontCount < 4) {
    // This is actually normal for documents with code snippets
    findings.push({
      id: 'font-code-detected',
      category: 'fonts',
      title: 'Monospace Font Detected',
      description: 'Document contains monospace fonts, typically used for code or data tables.',
      severity: 'info',
    });
  }

  return {
    findings,
    fonts,
    fontCount,
    mixedFontsDetected,
    suspiciousFontUsage,
  };
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

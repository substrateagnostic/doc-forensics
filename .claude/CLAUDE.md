# DocForensics — Claude Code Project

## What This Is
Document authenticity analysis tool. "VirusTotal but for document forensics."
Detects manipulation, forgery, and tampering in PDFs and images.

## The Problem
- Document forgery up 244% in 2024
- Fake IDs cost ~$15 on OnlyFake
- Synthetic identity fraud: $30B+ annual losses
- No accessible tools for legal professionals

## Core Architecture

### Analysis Pipeline
```
Upload → Metadata → Compression → Structure → Fonts → Visual → ML → Report
```

All analyzers run in parallel via Promise.all for speed.

### Analyzers

1. **Metadata** (`metadata-analyzer.ts`)
   - ExifReader for images, pdf-parse for PDFs
   - Detects: software mismatches, date paradoxes, stripped metadata, GPS
   
2. **Compression** (`compression-analyzer.ts`)  
   - Sharp for image processing
   - Detects: resaves, quality variance, JPEG artifacts in PNG
   
3. **Structure** (`structure-analyzer.ts`)
   - Raw PDF string parsing
   - Detects: JavaScript, embedded files, layers, incremental updates
   
4. **Fonts** (`font-analyzer.ts`)
   - PDF BaseFont extraction
   - Detects: excessive fonts, mixed styles, copy-paste indicators
   
5. **Visual** (`visual-analyzer.ts`)
   - ELA (Error Level Analysis)
   - Clone detection via block matching
   - Edge and noise analysis
   
6. **ML** (`ml-analyzer.ts`)
   - Optional Roboflow integration
   - Set ROBOFLOW_API_KEY to enable

## Risk Scoring
- Weights: info=0, warning=10, suspicious=25, critical=50
- Any critical finding → Critical risk
- 3+ suspicious → Critical risk
- 1+ suspicious OR 3+ warning → High risk

## Key Files
- `src/lib/forensic-engine.ts` — Main orchestrator
- `src/lib/types.ts` — All TypeScript interfaces
- `src/lib/report-formatter.ts` — Text/Markdown output
- `src/cli.ts` — CLI with color output and exit codes
- `src/app/page.tsx` — Upload UI (dark theme, scan line effect)
- `src/app/results/page.tsx` — Results dashboard

## CLI Exit Codes
- 0: Low risk
- 1: Medium risk  
- 2: High risk
- 3: Critical risk

(Good for CI/CD integration)

## Tech Stack
- Next.js 14 (App Router)
- Sharp (image processing)
- ExifReader (EXIF extraction)
- pdf-parse (PDF text/metadata)
- Tailwind CSS (dark forensic theme)

## Environment Variables
```
ROBOFLOW_API_KEY=xxx     # Optional: ML forgery detection
ROBOFLOW_MODEL=xxx/1     # Optional: Custom model
```

## Potential Enhancements
1. IPTC/XMP metadata deep dive
2. More PDF structure analysis (object stream parsing)
3. Face detection for ID documents
4. Signature extraction and comparison
5. Batch processing mode
6. Historical version comparison
7. Integration with court document standards

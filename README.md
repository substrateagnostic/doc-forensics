<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?logo=next.js" alt="Next.js 14" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License" />
  <img src="https://img.shields.io/badge/Status-MVP-2ea44f" alt="Status: MVP" />
  <img src="https://img.shields.io/badge/Lint-next%20lint-blue" alt="Lint: next lint" />
  <img src="https://img.shields.io/badge/Tests-none-lightgrey" alt="Tests: none" />
</p>

<h1 align="center">DocForensics</h1>

<p align="center">
  <strong>Document authenticity analysis platform</strong><br/>
  Detect manipulation, forgery, and tampering in documents and images.
</p>

<p align="center">
  <a href="#features">Features</a> |
  <a href="#quick-start">Quick Start</a> |
  <a href="#api">API</a> |
  <a href="#deployment">Deployment</a>
</p>

---

## The Problem

Document forgery increased **244% in 2024**. Fake IDs cost ~$15 on OnlyFake. Synthetic identity fraud causes **$30B+** in annual losses.

Legal professionals, compliance teams, and investigators receiving contracts, identity documents, or evidence have no accessible way to assess authenticity - existing solutions are enterprise-priced or require forensic expertise.

**DocForensics** is VirusTotal for documents.

---

## Features

### 8 Parallel Forensic Analyzers

| Analyzer | Description | File Types |
|----------|-------------|------------|
| **Metadata** | Creation software, date paradoxes, GPS, stripped data | All |
| **Compression** | JPEG quality, resave artifacts, format mismatches | Images |
| **Structure** | Embedded files, JavaScript, layers, incremental edits | PDF |
| **Fonts** | Font mixing, copy-paste indicators, unusual usage | PDF |
| **Visual** | ELA, clone detection, edge & noise analysis | Images |
| **ML/Heuristics** | Statistical anomalies, forgery probability scoring | Images |
| **ID Detection** | Face detection, aspect ratio, document type inference | Images |
| **Signatures** | Digital signatures, handwritten detection, stamps | All |

### Document Comparison

Side-by-side analysis of two documents with:
- Metadata field comparison
- Hash verification
- Visual difference highlighting
- Match/mismatch severity scoring

### Batch Processing

Upload and analyze up to 10 documents simultaneously with:
- Real-time progress tracking per file
- Parallel analysis for speed
- Auto-save to history

### Settings & Preferences

Configurable analysis with persistent settings:
- Toggle individual analyzers
- Set analysis timeout
- Configure export format defaults
- Manage history storage

---

## Quick Start

### Web Interface

```bash
npm install
npm run dev
# Open http://localhost:3000
```

### CLI Tool

```bash
# Analyze a document
npm run cli -- document.pdf

# Save report as markdown
npm run cli -- evidence.jpg -o report.md -f markdown

# JSON for programmatic use
npm run cli -- contract.pdf -o results.json -f json
```

### Exit Codes (CI/CD Integration)

| Code | Risk Level |
|------|------------|
| `0` | Low |
| `1` | Medium |
| `2` | High |
| `3` | Critical |

---

## Supported Formats

| Format | Metadata | Compression | Structure | Fonts | Visual | ML | ID | Signatures |
|--------|:--------:|:-----------:|:---------:|:-----:|:------:|:--:|:--:|:----------:|
| PDF | Yes | - | Yes | Yes | - | - | - | Yes |
| JPEG | Yes | Yes | - | - | Yes | Yes | Yes | Yes |
| PNG | Yes | Yes | - | - | Yes | Yes | Yes | Yes |
| TIFF | Yes | - | - | - | Yes | Yes | Yes | Yes |
| WebP | Yes | Yes | - | - | Yes | Yes | Yes | Yes |
| DOCX | Yes | - | Yes | - | - | - | - | - |

---

## Risk Scoring

```
Risk Score = sum(finding severity * weight)
```

| Severity | Weight | Example |
|----------|--------|---------|
| Info | 0 | Metadata extracted |
| Warning | 10 | Unusual editing software |
| Suspicious | 25 | Date paradox detected |
| Critical | 50 | ML detects high forgery probability |

**Escalation Rules:**
- Any critical finding => Critical risk
- 3+ suspicious findings => Critical risk
- 1+ suspicious OR 3+ warnings => High risk

---

## API

```bash
curl -X POST https://forensics.alexgallefrom.io/api/analyze \
  -F "file=@document.pdf"
```

### Response Schema

```typescript
{
  documentName: string;
  documentType: string;
  documentHash: string;
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
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
```

---

## ML Configuration

DocForensics works without any API keys using local heuristic analysis. For enhanced detection, optionally configure Roboflow:

```bash
export ROBOFLOW_API_KEY=your_key
export ROBOFLOW_MODEL=document-forgery-detection/1
```

### Local Heuristics (No API Required)

When Roboflow is not configured, these analyses run automatically:
- Statistical anomaly detection
- Edge inconsistency analysis
- Noise pattern detection
- Color distribution analysis
- JPEG block artifact detection
- Clone region detection

---

## Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel --prod
```

### Docker

```dockerfile
FROM node:20-alpine
RUN apk add --no-cache vips-dev
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## Architecture

```
Upload
  |
  v
Forensic Engine
  |-- Metadata
  |-- Compression
  |-- Structure
  |-- Fonts
  |-- Visual
  |-- ML/Heuristics
  |-- ID Detection
  `-- Signatures
  |
  v
Risk Calculation (findings -> weights -> score -> level)
  |
  v
Forensic Report (JSON / Markdown / PDF Export)
```

---

## Use Cases

| Industry | Application |
|----------|-------------|
| **Legal** | Screen evidence before trial, verify contract authenticity |
| **Finance** | KYC/AML document verification, due diligence |
| **Insurance** | Detect manipulated claims documentation |
| **HR** | Verify credentials, background check documents |
| **Real Estate** | Validate property documents, identity verification |

---

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS
- **Image Processing**: Sharp
- **Metadata**: ExifReader
- **PDF**: pdf-parse
- **DOCX**: JSZip
- **ML**: Roboflow (optional)

---

## Legal Disclaimer

DocForensics provides indicators that may suggest manipulation but cannot definitively prove or disprove authenticity. Results should be interpreted by qualified professionals. This tool is not a substitute for professional forensic examination, which may be required for legal proceedings.

---

## License

MIT

---

<p align="center">
  <strong>Built for the authentication cliff.</strong><br/>
  When verification becomes scarce, infrastructure matters.
</p>

# 🔬 DocForensics

**Document authenticity analysis tool.** Detect manipulation, forgery, and tampering in documents and images before they become evidence.

## The Problem

Document forgery increased **244% in 2024**. Fake IDs cost ~$15 on OnlyFake. Synthetic identity fraud causes **$30B+** in annual losses. Legal professionals receiving contracts, identity documents, or evidence have no accessible way to assess authenticity—existing solutions are enterprise-priced or require forensic expertise.

DocForensics solves this by:
- Extracting and analyzing metadata for inconsistencies
- Detecting compression artifacts suggesting manipulation
- Analyzing document structure for hidden content
- Checking font consistency for copy-paste indicators
- Running visual analysis (ELA, clone detection, noise analysis)
- Optional ML-based forgery detection

## Features

### 📋 Metadata Analysis
- Extract creation/modification software
- Detect date inconsistencies and paradoxes
- Find suspicious editing software (Photoshop, GIMP)
- Extract GPS coordinates from images
- Flag stripped or missing metadata

### 🗜️ Compression Analysis
- Estimate JPEG quality levels
- Detect resave artifacts
- Find quality variance across regions
- Detect JPEG artifacts in PNG files
- Analyze color distribution anomalies

### 🏗️ Structure Analysis (PDFs)
- Detect embedded files
- Flag JavaScript (potential malware)
- Identify form fields and digital signatures
- Check for hidden layers
- Count incremental updates (editing history)

### 🔤 Font Analysis
- Count and catalog fonts used
- Detect unusual font mixtures
- Flag copy-paste indicators
- Identify unembedded fonts

### 👁️ Visual Analysis
- **Error Level Analysis (ELA)**: Visualize compression inconsistencies
- **Clone Detection**: Find copy-move regions
- **Edge Analysis**: Detect cut-and-paste artifacts
- **Noise Analysis**: Find compositing from multiple sources

### 🤖 ML Detection (Optional)
- Roboflow integration for AI-powered forgery detection
- Configurable model selection
- Probability scoring

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

# Verbose output
npm run cli -- image.png -v
```

### Exit Codes (for CI/CD)
- `0`: Low risk
- `1`: Medium risk
- `2`: High risk
- `3`: Critical risk

## Supported Formats

| Format | Metadata | Compression | Structure | Fonts | Visual | ML |
|--------|----------|-------------|-----------|-------|--------|-----|
| PDF | ✅ | - | ✅ | ✅ | - | - |
| JPEG | ✅ | ✅ | - | - | ✅ | ✅ |
| PNG | ✅ | ✅ | - | - | ✅ | ✅ |
| TIFF | ✅ | - | - | - | ✅ | ✅ |
| WebP | ✅ | ✅ | - | - | ✅ | ✅ |
| DOCX | ✅ | - | - | - | - | - |

## Risk Levels

| Level | Score | Meaning |
|-------|-------|---------|
| 🟢 Low | 0-25 | No significant issues detected |
| 🟡 Medium | 26-50 | Some findings warrant attention |
| 🟠 High | 51-75 | Multiple concerning indicators |
| 🔴 Critical | 76-100 | Strong signs of manipulation |

## API

```bash
curl -X POST http://localhost:3000/api/analyze \
  -F "file=@document.pdf"
```

Response includes:
- `overallRisk`: low/medium/high/critical
- `riskScore`: 0-100
- `findings`: Array of categorized findings
- `metadata`: Extracted metadata and analysis
- `recommendations`: Actionable next steps

## ML Configuration

For enhanced forgery detection, configure Roboflow:

```bash
export ROBOFLOW_API_KEY=your_key
export ROBOFLOW_MODEL=document-forgery-detection/1
```

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Image Processing**: Sharp
- **Metadata**: ExifReader
- **PDF Parsing**: pdf-parse
- **ML**: Roboflow API (optional)

## Deployment

### Vercel

```bash
npm install -g vercel
vercel
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

## Limitations

- **Visual analysis**: Works best on uncompressed or lightly compressed images
- **Font analysis**: Most effective for PDFs
- **ML detection**: Requires Roboflow API key
- **Scope**: First-pass screening, not definitive forensic proof

## Use Cases

- **Litigation Support**: Screen evidence before trial
- **Due Diligence**: Verify document authenticity in transactions
- **KYC/AML**: First-pass ID document verification
- **Insurance Claims**: Detect potentially manipulated documentation
- **HR/Background Checks**: Verify submitted credentials

## Legal Disclaimer

DocForensics provides indicators that may suggest manipulation but cannot definitively prove or disprove authenticity. Results should be interpreted by qualified professionals. This tool is not a substitute for professional forensic examination, which may be required for legal purposes.

## License

MIT

---

**Built for the authentication cliff.** When verification becomes scarce, infrastructure matters.

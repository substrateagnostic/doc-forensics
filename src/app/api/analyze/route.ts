import { NextRequest, NextResponse } from 'next/server';
import { analyzeDocument, getMimeType } from '@/lib/forensic-engine';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Get MIME type
    const mimeType = file.type || getMimeType(file.name);
    
    if (!mimeType) {
      return NextResponse.json(
        { error: 'Could not determine file type' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/tiff',
      'image/webp',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!validTypes.includes(mimeType)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${mimeType}` },
        { status: 400 }
      );
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 50MB.' },
        { status: 400 }
      );
    }

    // Convert to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Run forensic analysis
    const report = await analyzeDocument(buffer, file.name, mimeType);

    return NextResponse.json(report);

  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during analysis.' },
      { status: 500 }
    );
  }
}

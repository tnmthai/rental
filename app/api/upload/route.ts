import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(_req: NextRequest) {
  // DISABLED — use /api/upload-cloudinary instead
  return NextResponse.json(
    { error: 'This endpoint is disabled for security. Use /api/upload-cloudinary instead.' },
    { status: 410 }
  );
}

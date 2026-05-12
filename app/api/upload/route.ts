import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unknown';
}

export async function POST(req: NextRequest) {
  // Deprecated: Use /api/upload-cloudinary instead
  try {
    const form = await req.formData();
    const cityRaw = String(form.get('city') || 'unknown');
    const city = slugify(cityRaw);

    const files = form
      .getAll('images')
      .filter((f): f is File => f instanceof File && f.size > 0 && f.type.startsWith('image/'));

    if (!files.length) {
      return NextResponse.json({ error: 'No image files provided. Note: This endpoint is deprecated. Please use /api/upload-cloudinary instead.' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', city);
    await mkdir(uploadDir, { recursive: true });

    const urls: string[] = [];

    for (const file of files.slice(0, 10)) {
      const bytes = Buffer.from(await file.arrayBuffer());
      const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const fullPath = path.join(uploadDir, safeName);
      await writeFile(fullPath, bytes);
      urls.push(`/uploads/${city}/${safeName}`);
    }

    return NextResponse.json({ urls, deprecated: true, message: 'This endpoint is deprecated. Please use /api/upload-cloudinary instead.' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Upload failed' }, { status: 500 });
  }
}

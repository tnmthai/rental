import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';

export const runtime = 'nodejs';

function sign(params: Record<string, string>, apiSecret: string) {
  const base = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return crypto.createHash('sha1').update(base + apiSecret).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const cloud = process.env.CLOUDINARY_CLOUD_NAME;
    const key = process.env.CLOUDINARY_API_KEY;
    const secret = process.env.CLOUDINARY_API_SECRET;
    if (!cloud || !key || !secret) {
      return NextResponse.json(
        { error: 'Missing Cloudinary envs: CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET' },
        { status: 500 }
      );
    }

    const form = await req.formData();
    const city = String(form.get('city') || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const files = form
      .getAll('images')
      .filter((f): f is File => f instanceof File && f.size > 0 && f.type.startsWith('image/'));

    if (!files.length) {
      return NextResponse.json({ error: 'No image files provided' }, { status: 400 });
    }

    const folder = `rental/${city}`;
    const urls: string[] = [];

    for (const file of files.slice(0, 15)) {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const toSign = { folder, timestamp };
      const signature = sign(toSign, secret);

      const body = new FormData();
      body.set('file', file);
      body.set('api_key', key);
      body.set('timestamp', timestamp);
      body.set('folder', folder);
      body.set('signature', signature);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
        method: 'POST',
        body
      });
      const data = await res.json();
      if (!res.ok) {
        return NextResponse.json({ error: data?.error?.message || 'Cloudinary upload failed' }, { status: 502 });
      }
      urls.push(data.secure_url);
    }

    return NextResponse.json({ urls });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Upload failed' }, { status: 500 });
  }
}

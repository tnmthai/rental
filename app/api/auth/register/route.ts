import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { createUser, findUserByEmail } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // Rate limit registration
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = checkRateLimit(`register:${ip}`, 5, 60_000);
    if (!rl.ok) {
      return NextResponse.json({ error: 'Too many attempts. Please retry later.' }, { status: 429 });
    }

    const body = await req.json();
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!email || !password || password.length < 6) {
      return NextResponse.json({ error: 'Email and password (min 6 chars) are required.' }, { status: 400 });
    }

    const existing = await findUserByEmail(email);
    if (existing) return NextResponse.json({ error: 'Email already registered.' }, { status: 409 });

    const passwordHash = await hash(password, 10);
    const user = await createUser({ name, email, passwordHash, provider: 'email' });
    return NextResponse.json({ user }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Register failed' }, { status: 500 });
  }
}

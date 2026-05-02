import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { createPasswordResetToken, findUserByEmail } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || '').trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const user = await findUserByEmail(email);
    if (user?.password_hash) {
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString();

      await createPasswordResetToken(user.id, token, expiresAt);
      await sendPasswordResetEmail(user.email, token);
    }

    return NextResponse.json({ message: 'If that email is registered, a reset link has been sent.' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to send reset link.' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { findUserByResetToken, updateUserPassword } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = String(body.token || '').trim();
    const password = String(body.password || '');

    if (!token || password.length < 6) {
      return NextResponse.json(
        { error: 'Valid reset token and a password of at least 6 characters are required.' },
        { status: 400 }
      );
    }

    const user = await findUserByResetToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired reset token.' }, { status: 400 });
    }

    const passwordHash = await hash(password, 10);
    await updateUserPassword(user.id, passwordHash);

    return NextResponse.json({ message: 'Your password has been updated. You can now sign in with the new password.' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to reset password.' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getListingsWithCoords } from '@/lib/db';

export async function GET() {
  const items = await getListingsWithCoords();
  return NextResponse.json({ items });
}

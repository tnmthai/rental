import { NextRequest, NextResponse } from 'next/server';
import { getVisitCount, incrementVisitCount } from '@/lib/db';

export async function GET() {
  const total = await getVisitCount();
  return NextResponse.json({ total });
}

export async function POST(_req: NextRequest) {
  const total = await incrementVisitCount();
  return NextResponse.json({ total });
}

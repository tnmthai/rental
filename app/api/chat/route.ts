import { NextRequest, NextResponse } from 'next/server';
import { searchListings } from '@/lib/db';

function parseNeed(msg: string) {
  const lower = msg.toLowerCase();
  const city = lower.includes('auckland') ? 'Auckland' : lower.includes('christchurch') ? 'Christchurch' : undefined;
  const m = lower.match(/(\d{2,4})\s*(nzd|\$)?\/?\s*(week|tuần)?/);
  const maxPrice = m ? Number(m[1]) : undefined;
  return { city, maxPrice };
}

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    const need = parseNeed(String(message || ''));
    const results = await searchListings(need);

    const reply = results.length
      ? `Mình tìm thấy ${results.length} lựa chọn${need.city ? ` ở ${need.city}` : ''}${need.maxPrice ? ` dưới ${need.maxPrice} NZD/tuần` : ''}.`
      : 'Chưa có listing khớp. Bạn thử tăng ngân sách hoặc đổi khu vực.';

    return NextResponse.json({ reply, filters: need, results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

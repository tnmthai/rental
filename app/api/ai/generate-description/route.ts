import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const title = String(body.title || '').trim();
  const city = String(body.city || '').trim();
  const price = Number(body.price_nzd_week || 0);
  const furnished = Boolean(body.furnished);
  const billsIncluded = Boolean(body.bills_included);
  const nearSchool = String(body.near_school || '').trim();

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const base = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');

  if (!apiKey) {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
  }

  const context = [
    `Title: ${title}`,
    city ? `Location: ${city}` : '',
    price > 0 ? `Price: $${price} NZD/week` : '',
    `Furnished: ${furnished ? 'Yes' : 'No'}`,
    `Bills included: ${billsIncluded ? 'Yes' : 'No'}`,
    nearSchool ? `Near: ${nearSchool}` : ''
  ].filter(Boolean).join('\n');

  const prompt = `You are a rental listing copywriter for New Zealand. Write a compelling, honest, and attractive rental listing description based on these details:

${context}

Requirements:
- 2-4 short paragraphs
- Highlight the key selling points
- Mention practical details (transport, amenities, area vibe)
- Use a friendly, welcoming tone
- Keep it concise but informative
- Do NOT include the price or title in the description (those are shown separately)
- Do NOT use emojis excessively`;

  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You write rental listing descriptions for New Zealand renters.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `AI request failed: ${err}` }, { status: 500 });
    }

    const data = await res.json();
    const description = data.choices?.[0]?.message?.content?.trim() || '';

    return NextResponse.json({ description });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'AI generation failed' }, { status: 500 });
  }
}

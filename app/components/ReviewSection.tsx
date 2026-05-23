'use client';

import { useEffect, useState } from 'react';
import Icon from '@/app/components/Icon';

type Review = {
  id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  user_name: string | null;
};

type Summary = {
  count: number;
  avg_rating: number | null;
};

export default function ReviewSection({ listingId }: { listingId: number }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<Summary>({ count: 0, avg_rating: null });
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const res = await fetch(`/api/reviews?listing_id=${listingId}`);
    const data = await res.json();
    setReviews(data.reviews || []);
    setSummary(data.summary || { count: 0, avg_rating: null });
  }

  useEffect(() => { load(); }, [listingId]);

  async function submit() {
    setSubmitting(true);
    setMsg('');
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId, rating, comment: comment.trim() || undefined })
      });
      const data = await res.json();
      if (res.ok) {
        setMsg('Review submitted!');
        setComment('');
        setShowForm(false);
        await load();
      } else {
        setMsg(data.error || 'Failed');
      }
    } catch {
      setMsg('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

  return (
    <section style={{ margin: '16px 0', padding: '14px 16px', border: '1px solid #e5e7eb', borderRadius: 12, background: '#fafbfc' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>
          Reviews
          {summary.count > 0 ? (
            <span style={{ fontSize: 14, fontWeight: 400, color: '#6b7280', marginLeft: 8 }}>
              {stars(Math.round(summary.avg_rating || 0))} {summary.avg_rating} ({summary.count})
            </span>
          ) : null}
        </h3>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '5px 12px', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151' }}
        >
          <Icon name="edit" size={14} /> Write review
        </button>
      </div>

      {showForm ? (
        <div style={{ marginBottom: 12, padding: 12, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}>
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginRight: 8 }}>Rating:</span>
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => setRating(s)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: s <= rating ? '#f59e0b' : '#d1d5db', padding: '0 2px' }}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience (optional)..."
            rows={3}
            style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: 8, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
          />
          <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={submit} disabled={submitting} className="btn btn-primary btn-sm">
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
            {msg ? <span style={{ fontSize: 12, color: msg.includes('submitted') ? '#166534' : '#991b1b' }}>{msg}</span> : null}
          </div>
        </div>
      ) : null}

      {reviews.length === 0 ? (
        <p style={{ color: '#9ca3af', fontSize: 13 }}>No reviews yet. Be the first!</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {reviews.map((r) => (
            <div key={r.id} style={{ padding: '8px 10px', background: '#fff', border: '1px solid #f3f4f6', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>{stars(r.rating)}</span>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              {r.comment ? <p style={{ margin: '4px 0 0', fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{r.comment}</p> : null}
              <span style={{ fontSize: 11, color: '#9ca3af' }}>{r.user_name || 'Anonymous'}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

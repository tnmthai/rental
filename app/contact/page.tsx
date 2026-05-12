'use client';

import { useState } from 'react';
import type { Metadata } from 'next';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSending(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fd.get('name'),
          email: fd.get('email'),
          subject: fd.get('subject'),
          message: fd.get('message')
        })
      });
      if (res.ok) {
        setSubmitted(true);
        (e.target as HTMLFormElement).reset();
      } else {
        alert('Failed to send. Please try again.');
      }
    } catch {
      alert('Failed to send. Please try again.');
    }
    setSending(false);
  }

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px 80px' }}>
      <a
        href="/"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#0f766e', textDecoration: 'none', fontWeight: 700, fontSize: 14, marginBottom: 32 }}
      >
        ← Back to RentFinder
      </a>

      <section style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid #ccfbf1', borderRadius: 999, padding: '7px 14px', background: '#f0fdfa', color: '#0f766e', fontSize: 13, fontWeight: 800, marginBottom: 16 }}>
          Get in touch
        </div>
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 900, color: '#0f172a', margin: '0 0 12px', lineHeight: 1.2 }}>
          Contact <span style={{ background: 'linear-gradient(90deg, #0f766e, #2563eb)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>us</span>
        </h1>
        <p style={{ fontSize: 16, color: '#6b7280', maxWidth: 500, margin: '0 auto' }}>
          Have a question, suggestion, or want to partner with us? We'd love to hear from you.
        </p>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 32, maxWidth: 700, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {[
            { icon: '📧', title: 'Email', desc: 'info@rentfinder.nz', link: 'mailto:info@rentfinder.nz' },
            { icon: '📍', title: 'Location', desc: 'New Zealand' },
            { icon: '⏰', title: 'Response time', desc: 'Within 24 hours' }
          ].map((item, i) => (
            <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '18px 16px' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{item.icon}</div>
              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 14, marginBottom: 4 }}>{item.title}</div>
              {item.link ? (
                <a href={item.link} style={{ color: '#0f766e', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>{item.desc}</a>
              ) : (
                <div style={{ color: '#6b7280', fontSize: 13 }}>{item.desc}</div>
              )}
            </div>
          ))}
        </div>

        <div style={{ border: '1px solid #e2e8f0', borderRadius: 20, padding: 'clamp(20px, 3vw, 32px)', background: '#fff', boxShadow: '0 12px 30px rgba(15,23,42,0.06)' }}>
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Message sent!</h3>
              <p style={{ color: '#6b7280', margin: '0 0 16px' }}>Thanks for reaching out. We'll get back to you soon.</p>
              <button onClick={() => setSubmitted(false)} style={{ border: 'none', background: 'transparent', color: '#0f766e', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Your name</label>
                  <input name="name" required placeholder="John Smith" style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 10, padding: '10px 14px', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Your email</label>
                  <input name="email" type="email" required placeholder="john@example.com" style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 10, padding: '10px 14px', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Subject</label>
                <select name="subject" required style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 10, padding: '10px 14px', fontSize: 14, background: '#fff', boxSizing: 'border-box' }}>
                  <option value="">Select a topic...</option>
                  <option value="general">General enquiry</option>
                  <option value="support">Technical support</option>
                  <option value="listing">Listing question</option>
                  <option value="partnership">Partnership</option>
                  <option value="feedback">Feedback</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Message</label>
                <textarea name="message" rows={5} required placeholder="Tell us what you're thinking..." style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 10, padding: '10px 14px', fontSize: 14, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>
              <button
                type="submit"
                disabled={sending}
                style={{
                  border: 'none',
                  borderRadius: 999,
                  padding: '12px 24px',
                  background: sending ? '#7dd3fc' : '#0f766e',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: sending ? 'default' : 'pointer',
                  boxShadow: '0 10px 22px rgba(15,118,110,0.18)'
                }}
              >
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>
      </div>

      <section style={{ marginTop: 48, maxWidth: 700, margin: '48px auto 0' }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 16px', textAlign: 'center' }}>Common questions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {[
            { q: 'How do I list my room?', a: 'Click "Create listing" from the home page, fill in the details, and submit. It\'s free!' },
            { q: 'Is RentFinder free?', a: 'Yes! Searching, listing, and contacting are all completely free.' },
            { q: 'How does AI search work?', a: 'Type what you\'re looking for in plain English. Our AI extracts filters and ranks the best matches.' },
            { q: 'Can I edit or remove my listing?', a: 'Yes, log in and go to your dashboard to manage all your listings.' }
          ].map((faq, i) => (
            <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px 18px', background: '#fff' }}>
              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 14, marginBottom: 6 }}>{faq.q}</div>
              <div style={{ color: '#6b7280', fontSize: 13, lineHeight: 1.5 }}>{faq.a}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

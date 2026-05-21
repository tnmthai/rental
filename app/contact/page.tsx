'use client';

import { useState } from 'react';

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
    <main className="page-container">
      <a href="/" className="back-link">← Back to RentFinder</a>

      <section className="hero">
        <div className="hero-badge">Get in touch</div>
        <h1>
          Contact <span className="gradient-text">us</span>
        </h1>
        <p>Have a question, suggestion, or want to partner with us? We'd love to hear from you.</p>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 32, maxWidth: 700, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {[
            { icon: '📧', title: 'Email', desc: 'info@rentfinder.nz', link: 'mailto:info@rentfinder.nz' },
            { icon: '📍', title: 'Location', desc: 'New Zealand' },
            { icon: '⏰', title: 'Response time', desc: 'Within 24 hours' }
          ].map((item, i) => (
            <div key={i} className="card card-body">
              <div style={{ fontSize: 24, marginBottom: 8 }}>{item.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>{item.title}</div>
              {item.link ? (
                <a href={item.link} style={{ color: 'var(--brand-primary)', fontSize: 13, fontWeight: 600 }}>{item.desc}</a>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{item.desc}</div>
              )}
            </div>
          ))}
        </div>

        <div className="card card-body" style={{ boxShadow: 'var(--shadow-md)' }}>
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px' }}>Message sent!</h3>
              <p style={{ color: 'var(--text-muted)', margin: '0 0 16px' }}>Thanks for reaching out. We'll get back to you soon.</p>
              <button onClick={() => setSubmitted(false)} className="btn btn-ghost" style={{ color: 'var(--brand-primary)' }}>
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label">Your name</label>
                  <input name="name" required placeholder="John Smith" className="input" />
                </div>
                <div>
                  <label className="label">Your email</label>
                  <input name="email" type="email" required placeholder="john@example.com" className="input" />
                </div>
              </div>
              <div>
                <label className="label">Subject</label>
                <select name="subject" required className="select">
                  <option value="">Select a topic...</option>
                  <option value="general">General enquiry</option>
                  <option value="support">Technical support</option>
                  <option value="listing">Listing question</option>
                  <option value="partnership">Partnership</option>
                  <option value="feedback">Feedback</option>
                </select>
              </div>
              <div>
                <label className="label">Message</label>
                <textarea name="message" rows={5} required placeholder="Tell us what you're thinking..." className="textarea" />
              </div>
              <button type="submit" disabled={sending} className="btn btn-primary" style={{ fontSize: 15 }}>
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>
      </div>

      <section style={{ maxWidth: 700, margin: '48px auto 0' }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 16px', textAlign: 'center' }}>Common questions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {[
            { q: 'How do I list my room?', a: 'Click "Create listing" from the home page, fill in the details, and submit. It\'s free!' },
            { q: 'Is RentFinder free?', a: 'Yes! Searching, listing, and contacting are all completely free.' },
            { q: 'How does AI search work?', a: 'Type what you\'re looking for in plain English. Our AI extracts filters and ranks the best matches.' },
            { q: 'Can I edit or remove my listing?', a: 'Yes, log in and go to your dashboard to manage all your listings.' }
          ].map((faq, i) => (
            <div key={i} className="faq-card">
              <strong>{faq.q}</strong>
              <p>{faq.a}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

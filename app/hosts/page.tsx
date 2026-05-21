export const metadata = {
  title: 'Share your room — RentFinder host intake',
  description: 'Mirror your room listing on RentFinder so students can discover it through natural-language search.'
};

const steps = [
  {
    title: 'Paste your existing listing',
    body: 'Send us the Roomies, TradeMe, Facebook, or Instagram link you already have. No need to retype anything.'
  },
  {
    title: 'AI cleans and tags it',
    body: 'We extract price, bills, furnishing status, nearby campuses, and add clear highlights for renters.'
  },
  {
    title: 'Live for 60 days',
    body: 'Listings stay discoverable in RentFinder searches. Need edits or removal? Reply to the onboarding email anytime.'
  }
];

const faqs = [
  {
    q: 'Do I need an account to share my room?',
    a: 'No account required. We mirror your public listing, keep your preferred contact method, and send you the RentFinder link for approval.'
  },
  {
    q: 'Can I include multiple rooms or a whole flat?',
    a: 'Yes. Mention how many rooms or flatmates you are looking for inside the message and we will tag it accordingly.'
  },
  {
    q: 'What if I want the listing removed?',
    a: 'Reply to the confirmation email or message info@rentfinder.nz and we will archive it immediately.'
  }
];

export default function HostsPage() {
  return (
    <main className="page-container" style={{ maxWidth: 900 }}>
      <a href="/" className="btn btn-outline btn-sm" style={{ marginBottom: 24 }}>Back to home</a>

      <section className="hero">
        <div className="hero-badge" style={{ background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe' }}>
          Host beta · free reposting
        </div>
        <h1 style={{ fontSize: 36 }}>
          Share your room once. Let AI handle the inbox.
        </h1>
        <p>
          RentFinder mirrors your existing listing, adds clean AI highlights, and keeps your preferred contact link so students can reach you faster.
        </p>
        <div style={{ marginTop: 24 }}>
          <a
            href="mailto:info@rentfinder.nz?subject=Share%20my%20room&body=Hi%20RentFinder%2C%0AHere%20is%20my%20listing%20link%3A%20"
            className="btn btn-blue"
            style={{ padding: '12px 26px' }}
          >
            Email my listing link
          </a>
        </div>
      </section>

      <section style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginBottom: 48 }}>
        {steps.map((step, idx) => (
          <div key={step.title} className="card card-body">
            <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-pill)', background: '#eef2ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, marginBottom: 12 }}>
              {idx + 1}
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>{step.title}</h3>
            <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.5 }}>{step.body}</p>
          </div>
        ))}
      </section>

      <section className="section">
        <h2 style={{ fontSize: 24, marginBottom: 12 }}>What you get</h2>
        <ul style={{ paddingLeft: 20, lineHeight: 1.7, color: 'var(--text-secondary)' }}>
          <li>AI-polished highlight card you can forward to applicants.</li>
          <li>Direct link back to your preferred contact channel (FB, email, phone).</li>
          <li>Automatic expiry after 60 days so stale rooms disappear.</li>
        </ul>
      </section>

      <section className="card card-body" style={{ background: 'var(--bg-subtle)' }}>
        <h2 style={{ fontSize: 24, marginBottom: 18 }}>Questions?</h2>
        {faqs.map((item) => (
          <div key={item.q} style={{ marginBottom: 16 }}>
            <strong style={{ display: 'block', marginBottom: 4 }}>{item.q}</strong>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>{item.a}</p>
          </div>
        ))}
        <p style={{ marginTop: 24 }}>
          Still unsure? Email <a href="mailto:info@rentfinder.nz">info@rentfinder.nz</a>.
        </p>
      </section>
    </main>
  );
}

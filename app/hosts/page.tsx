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
    <main
      style={{
        maxWidth: 900,
        margin: '0 auto',
        padding: '48px 20px 80px',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        color: '#111827'
      }}
    >
      <section style={{ textAlign: 'center', marginBottom: 40 }}>
        <p style={{ display: 'inline-block', padding: '6px 14px', borderRadius: 999, background: '#eef2ff', color: '#4338ca', fontWeight: 600 }}>
          Host beta · free reposting
        </p>
        <h1 style={{ fontSize: 36, margin: '18px 0 12px', fontWeight: 800, letterSpacing: -0.5 }}>
          Share your room once. Let AI handle the inbox.
        </h1>
        <p style={{ fontSize: 18, color: '#4b5563', margin: '0 auto', maxWidth: 640 }}>
          RentFinder mirrors your existing listing, adds clean AI highlights, and keeps your preferred contact link so students can reach you faster.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap', marginTop: 24 }}>
          <a
            href="mailto:info@rentfinder.nz?subject=Share%20my%20room&body=Hi%20RentFinder%2C%0AHere%20is%20my%20listing%20link%3A%20"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 999,
              padding: '12px 26px',
              fontWeight: 600,
              background: '#2563eb',
              color: '#fff',
              textDecoration: 'none'
            }}
          >
            Email my listing link
          </a>
          <a
            href="https://t.me/thaitran"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 999,
              padding: '12px 26px',
              fontWeight: 600,
              border: '1px solid #d1d5db',
              color: '#111827',
              textDecoration: 'none'
            }}
          >
            DM on Telegram
          </a>
        </div>
      </section>

      <section style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginBottom: 48 }}>
        {steps.map((step, idx) => (
          <div key={step.title} style={{ border: '1px solid #e5e7eb', borderRadius: 16, padding: 20, background: '#fff' }}>
            <div style={{ width: 36, height: 36, borderRadius: 999, background: '#eef2ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, marginBottom: 12 }}>
              {idx + 1}
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>{step.title}</h3>
            <p style={{ margin: 0, color: '#4b5563', lineHeight: 1.5 }}>{step.body}</p>
          </div>
        ))}
      </section>

      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 24, marginBottom: 12 }}>What you get</h2>
        <ul style={{ paddingLeft: 20, lineHeight: 1.7, color: '#374151' }}>
          <li>AI-polished highlight card you can forward to applicants.</li>
          <li>Direct link back to your preferred contact channel (FB, email, phone).</li>
          <li>Automatic expiry after 60 days so stale rooms disappear.</li>
        </ul>
      </section>

      <section style={{ border: '1px solid #e5e7eb', borderRadius: 16, padding: 24, background: '#f9fafb' }}>
        <h2 style={{ fontSize: 24, marginBottom: 18 }}>Questions?</h2>
        {faqs.map((item) => (
          <div key={item.q} style={{ marginBottom: 16 }}>
            <strong style={{ display: 'block', marginBottom: 4 }}>{item.q}</strong>
            <p style={{ margin: 0, color: '#4b5563' }}>{item.a}</p>
          </div>
        ))}
        <p style={{ marginTop: 24 }}>
          Still unsure? Email <a href="mailto:info@rentfinder.nz">info@rentfinder.nz</a> or ping Telegram <a href="https://t.me/thaitran" target="_blank" rel="noreferrer">@thaitran</a>.
        </p>
      </section>
    </main>
  );
}

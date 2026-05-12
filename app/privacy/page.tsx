import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — RentFinder NZ',
  description: 'Learn how RentFinder NZ collects, uses, and protects your personal information. We respect your privacy and comply with New Zealand privacy law.',
  alternates: { canonical: '/privacy' },
  robots: { index: true, follow: true }
};

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '32px 20px 80px' }}>
      <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#0f766e', textDecoration: 'none', fontWeight: 700, fontSize: 14, marginBottom: 32 }}>
        ← Back to RentFinder
      </a>

      <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, color: '#0f172a', margin: '0 0 8px' }}>Privacy Policy</h1>
      <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 32px' }}>Last updated: May 2026</p>

      <div style={{ color: '#374151', lineHeight: 1.8, fontSize: 15 }}>
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>1. Introduction</h2>
          <p style={{ margin: 0 }}>
            RentFinder NZ ("we", "us", "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use rentfinder.nz. This policy complies with the New Zealand Privacy Act 2020.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>2. Information we collect</h2>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '16px 0 8px' }}>Information you provide</h3>
          <ul style={{ margin: '0 0 12px', paddingLeft: 20 }}>
            <li><strong>Account information:</strong> Name, email address, profile photo (via Google or Facebook login)</li>
            <li><strong>Listings:</strong> Room details, photos, descriptions, pricing, location</li>
            <li><strong>Room requests:</strong> Budget, preferences, contact details</li>
            <li><strong>Communications:</strong> Messages sent through the platform</li>
          </ul>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '16px 0 8px' }}>Information collected automatically</h3>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li><strong>Usage data:</strong> Pages visited, search queries, clicks, time spent</li>
            <li><strong>Device data:</strong> Browser type, device type, operating system</li>
            <li><strong>Location data:</strong> Approximate location based on IP address (city-level only)</li>
            <li><strong>Cookies:</strong> Session cookies for authentication and preferences</li>
          </ul>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>3. How we use your information</h2>
          <p style={{ margin: '0 0 10px' }}>We use your information to:</p>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>Provide and maintain the RentFinder platform</li>
            <li>Process and display your listings and room requests</li>
            <li>Enable AI-powered search and recommendations</li>
            <li>Send important service notifications</li>
            <li>Improve our platform and user experience</li>
            <li>Prevent fraud and ensure platform security</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>4. AI and automated processing</h2>
          <p style={{ margin: 0 }}>
            We use artificial intelligence to process search queries, generate summaries, and rank listings. AI processing is automated and does not involve human review of individual queries. You have the right to request human review of any automated decision that significantly affects you.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>5. Information sharing</h2>
          <p style={{ margin: '0 0 10px' }}>We may share your information with:</p>
          <ul style={{ margin: '0 0 10px', paddingLeft: 20 }}>
            <li><strong>Other users:</strong> Listing details are publicly visible. Contact information is shared when you choose to make it available.</li>
            <li><strong>Service providers:</strong> Third-party services that help us operate the platform (hosting, authentication, image storage)</li>
            <li><strong>Legal authorities:</strong> When required by law or to protect our rights</li>
          </ul>
          <p style={{ margin: 0 }}>
            We do not sell your personal information to third parties.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>6. Third-party services</h2>
          <p style={{ margin: '0 0 10px' }}>We use the following third-party services:</p>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li><strong>Google OAuth:</strong> For user authentication</li>
            <li><strong>Facebook OAuth:</strong> For user authentication</li>
            <li><strong>Cloudinary:</strong> For image hosting and optimization</li>
            <li><strong>Railway:</strong> For application hosting</li>
            <li><strong>OpenAI:</strong> For AI-powered search features (queries are processed but not stored by OpenAI)</li>
          </ul>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>7. Data security</h2>
          <p style={{ margin: 0 }}>
            We implement reasonable security measures to protect your information, including encryption in transit (HTTPS), secure password hashing, and access controls. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>8. Data retention</h2>
          <p style={{ margin: 0 }}>
            We retain your data for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data at any time by contacting us. Listings may be retained in anonymised form for platform improvement purposes.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>9. Your rights</h2>
          <p style={{ margin: '0 0 10px' }}>Under the New Zealand Privacy Act 2020, you have the right to:</p>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>Access your personal information</li>
            <li>Request correction of inaccurate information</li>
            <li>Request deletion of your data</li>
            <li>Opt out of non-essential communications</li>
            <li>Lodge a complaint with the Privacy Commissioner</li>
          </ul>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>10. Cookies</h2>
          <p style={{ margin: 0 }}>
            We use essential cookies for authentication and session management. We may also use analytics cookies to understand how users interact with our platform. You can control cookie settings through your browser preferences.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>11. Children's privacy</h2>
          <p style={{ margin: 0 }}>
            RentFinder is not intended for users under 16 years of age. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us and we will delete it.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>12. Changes to this policy</h2>
          <p style={{ margin: 0 }}>
            We may update this Privacy Policy from time to time. We will notify users of significant changes by posting a notice on the platform. Your continued use of RentFinder after changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>13. Contact us</h2>
          <p style={{ margin: 0 }}>
            For privacy-related enquiries, contact us at <a href="mailto:info@rentfinder.nz" style={{ color: '#0f766e', textDecoration: 'none', fontWeight: 600 }}>info@rentfinder.nz</a>.
          </p>
        </section>
      </div>
    </main>
  );
}

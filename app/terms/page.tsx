import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — RentFinder NZ',
  description: 'Read the terms and conditions for using RentFinder NZ, the AI-powered rental search platform for New Zealand.',
  alternates: { canonical: '/terms' },
  robots: { index: true, follow: true }
};

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '32px 20px 80px' }}>
      <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#0f766e', textDecoration: 'none', fontWeight: 700, fontSize: 14, marginBottom: 32 }}>
        ← Back to RentFinder
      </a>

      <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, color: '#0f172a', margin: '0 0 8px' }}>Terms of Service</h1>
      <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 32px' }}>Last updated: May 2026</p>

      <div style={{ color: '#374151', lineHeight: 1.8, fontSize: 15 }}>
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>1. Acceptance of terms</h2>
          <p style={{ margin: 0 }}>
            By accessing or using RentFinder NZ (rentfinder.nz), you agree to be bound by these Terms of Service. If you do not agree, please do not use the platform.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>2. Description of service</h2>
          <p style={{ margin: '0 0 10px' }}>
            RentFinder NZ is an AI-powered rental search platform that aggregates and displays rental listings across New Zealand. We provide:
          </p>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>AI-assisted search functionality for rooms and flats</li>
            <li>A platform for hosts to list available rooms</li>
            <li>A platform for renters to post room requests</li>
            <li>Aggregated external listing suggestions</li>
          </ul>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>3. User accounts</h2>
          <p style={{ margin: '0 0 10px' }}>When creating an account, you agree to:</p>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>Provide accurate and complete information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Accept responsibility for all activity under your account</li>
            <li>Not create multiple accounts for the same person</li>
          </ul>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>4. Listings and content</h2>
          <p style={{ margin: '0 0 10px' }}>By posting a listing or content on RentFinder, you:</p>
          <ul style={{ margin: '0 0 10px', paddingLeft: 20 }}>
            <li>Confirm you have the right to advertise the property</li>
            <li>Agree that all information is accurate and not misleading</li>
            <li>Grant RentFinder a non-exclusive license to display your content</li>
            <li>Accept that listings may be removed if they violate our policies</li>
          </ul>
          <p style={{ margin: 0 }}>
            We reserve the right to remove any listing that is fraudulent, discriminatory, or violates New Zealand law.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>5. Prohibited uses</h2>
          <p style={{ margin: '0 0 10px' }}>You may not use RentFinder to:</p>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>Post false, misleading, or fraudulent listings</li>
            <li>Discriminate based on race, gender, religion, nationality, disability, or sexual orientation</li>
            <li>Scrape, copy, or redistribute platform data without permission</li>
            <li>Upload malicious code or attempt to compromise the platform</li>
            <li>Spam other users or send unsolicited commercial messages</li>
            <li>Violate the Residential Tenancies Act 1986 or Human Rights Act 1993</li>
          </ul>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>6. AI-generated content</h2>
          <p style={{ margin: 0 }}>
            RentFinder uses artificial intelligence to provide search suggestions, summaries, and recommendations. AI-generated content is provided for informational purposes only and should not be considered professional advice. We do not guarantee the accuracy of AI-generated responses. Always verify important details directly with the listing host.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>7. External links and third-party content</h2>
          <p style={{ margin: 0 }}>
            Our platform may include links to external websites and third-party listings. We are not responsible for the content, accuracy, or practices of external sites. Use external links at your own risk.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>8. Limitation of liability</h2>
          <p style={{ margin: 0 }}>
            RentFinder NZ is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the platform, including but not limited to: rental disputes, financial losses, or issues with listed properties. We are a platform provider and not a party to any rental agreement between users.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>9. Intellectual property</h2>
          <p style={{ margin: 0 }}>
            The RentFinder platform, including its design, code, AI models, and branding, is the intellectual property of RentFinder NZ. You may not reproduce, modify, or distribute any part of the platform without written consent.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>10. Changes to terms</h2>
          <p style={{ margin: 0 }}>
            We may update these terms from time to time. Continued use of the platform after changes constitutes acceptance of the new terms. We will notify users of significant changes via the platform.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>11. Contact</h2>
          <p style={{ margin: 0 }}>
            For questions about these terms, contact us at <a href="mailto:info@rentfinder.nz" style={{ color: '#0f766e', textDecoration: 'none', fontWeight: 600 }}>info@rentfinder.nz</a>.
          </p>
        </section>
      </div>
    </main>
  );
}

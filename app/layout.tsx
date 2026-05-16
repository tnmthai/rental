import type { Metadata } from 'next';
import Providers from './providers';
import Histats from '../components/Histats';

const SITE_URL = 'https://www.rentfinder.nz';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'RentFinder NZ — AI Rental Search for Rooms & Flats in New Zealand',
  description:
    'Find rooms, flats, and rental homes across New Zealand with AI-powered search. Compare listings by city, suburb, budget, furnished options, bills included, and nearby universities.',
  keywords: [
    'New Zealand rentals',
    'NZ rental search',
    'RentFinder NZ',
    'rooms for rent New Zealand',
    'flats for rent NZ',
    'apartments for rent New Zealand',
    'student accommodation NZ',
    'Auckland rentals',
    'Christchurch rentals',
    'Wellington rentals',
    'Canterbury rentals',
    'Lincoln rentals',
    'rental near university NZ',
    'furnished room NZ',
    'bills included rental NZ'
  ],
  openGraph: {
    title: 'RentFinder NZ — AI Rental Search for Rooms & Flats in New Zealand',
    description:
      'AI-powered rental search for New Zealand. Discover rooms and flats by location, price, amenities, and proximity to universities.',
    url: SITE_URL,
    type: 'website',
    locale: 'en_NZ',
    siteName: 'RentFinder'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RentFinder NZ — AI Rental Search for Rooms & Flats in New Zealand',
    description:
      'Search rentals across New Zealand with AI: rooms, flats, price filters, furnished options, and more.'
  },
  alternates: {
    canonical: '/'
  },
  robots: {
    index: true,
    follow: true
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, padding: 24 }}>
        <Providers>
          <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1 }}>{children}</div>
            <footer style={{ marginTop: 24, paddingTop: 24, paddingBottom: 16, borderTop: '1px solid #e5e7eb', fontSize: 13, color: '#4b5563' }}>
              <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 48, marginBottom: 16 }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#374151', marginBottom: 8 }}>Product</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <a href="/" style={{ color: '#6b7280', textDecoration: 'none' }}>Features</a>
                    <a href="/" style={{ color: '#6b7280', textDecoration: 'none' }}>Pricing</a>
                  </div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#374151', marginBottom: 8 }}>Company</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <a href="/about" style={{ color: '#6b7280', textDecoration: 'none' }}>About</a>
                    <a href="/contact" style={{ color: '#6b7280', textDecoration: 'none' }}>Contact</a>
                  </div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#374151', marginBottom: 8 }}>Account</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <a href="/login" style={{ color: '#6b7280', textDecoration: 'none' }}>Sign in</a>
                    <a href="/register" style={{ color: '#6b7280', textDecoration: 'none' }}>Sign up</a>
                  </div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#374151', marginBottom: 8 }}>Legal</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <a href="/terms" style={{ color: '#6b7280', textDecoration: 'none' }}>Terms</a>
                    <a href="/privacy" style={{ color: '#6b7280', textDecoration: 'none' }}>Privacy</a>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'center', borderTop: '1px solid #f3f4f6', paddingTop: 12 }}>
                Contact: <a href="mailto:info@rentfinder.nz" style={{ color: '#1a73e8', textDecoration: 'none' }}>info@rentfinder.nz</a>
              </div>
            </footer>
          </div>
        </Providers>
        <Histats />
      </body>
    </html>
  );
}

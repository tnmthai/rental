import type { Metadata } from 'next';
import Script from 'next/script';
import Providers from './providers';

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
            <footer style={{ marginTop: 24, paddingTop: 12, borderTop: '1px solid #e5e7eb', fontSize: 13, color: '#4b5563' }}>
              <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 8 }}>
                <a href="/about" style={{ color: '#6b7280', textDecoration: 'none' }}>About</a>
                <a href="/contact" style={{ color: '#6b7280', textDecoration: 'none' }}>Contact</a>
                <a href="/terms" style={{ color: '#6b7280', textDecoration: 'none' }}>Terms</a>
                <a href="/privacy" style={{ color: '#6b7280', textDecoration: 'none' }}>Privacy</a>
              </div>
              <div style={{ textAlign: 'center' }}>
                Contact admin: <a href="mailto:info@rentfinder.nz" style={{ color: '#1a73e8', textDecoration: 'none' }}>info@rentfinder.nz</a>
              </div>
            </footer>
          </div>
        </Providers>
        {/* Histats.com START */}
        <div id="histats_counter"></div>
        <Script id="histats" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: `
          var _Hasync= _Hasync|| [];
          _Hasync.push(['Histats.start', '1,5027110,4,24,200,50,00011111']);
          _Hasync.push(['Histats.fasi', '1']);
          _Hasync.push(['Histats.track_hits', '']);
          (function() {
            var hs = document.createElement('script'); hs.type = 'text/javascript'; hs.async = true;
            hs.src = ('//s10.histats.com/js15_as.js');
            (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(hs);
          })();
        ` }} />
        <noscript><a href="/" target="_blank"><img src="//sstatic1.histats.com/0.gif?5027110&101" alt="" /></a></noscript>
        {/* Histats.com END */}
      </body>
    </html>
  );
}

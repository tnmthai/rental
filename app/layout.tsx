import type { Metadata } from 'next';
import Script from 'next/script';
import Providers from './providers';
import './globals.css';

const SITE_URL = 'https://www.rentfinder.nz';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'RentFinder NZ — AI Rental Search for Rooms & Flats in New Zealand',
  description:
    'Find rooms, flats, and shared rentals across New Zealand with AI-powered search. Compare prices, furnished options, and bills included.',
  verification: {
    other: {
      'msvalidate.01': '9E75D6A7127743A5B245667CE88AFC68'
    }
  },
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
  },
  manifest: '/manifest.json'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ padding: 24 }}>
        <Providers>
          <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1 }}>{children}</div>
            <footer style={{ marginTop: 24, paddingTop: 12, borderTop: '1px solid #e5e7eb', fontSize: 13, color: '#4b5563' }}>
              <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 8 }}>
                <a href="/about" style={{ color: '#6b7280', textDecoration: 'none' }}>About</a>
                <a href="/blog" style={{ color: '#6b7280', textDecoration: 'none' }}>Blog</a>
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
        <Script id="pwa-register" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(() => {});
              });
            }
          `}
        </Script>
        {/* Google Analytics 4 */}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-PB7W2DKP0M" strategy="afterInteractive" />
        <Script id="ga4" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-PB7W2DKP0M');
          `}
        </Script>

        <Script id="clarity" strategy="beforeInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "wuhqi03cfc");
          `}
        </Script>
      </body>
    </html>
  );
}

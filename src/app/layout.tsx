import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import Script from 'next/script';
import { Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { AuthGate } from "@/components/auth-gate";
import { AppOverlays } from "@/components/app-overlays";

const inter = localFont({
  src: [
    { path: './fonts/Inter-VariableFont_opsz,wght.ttf', style: 'normal' },
    { path: './fonts/Inter-Italic-VariableFont_opsz,wght.ttf', style: 'italic' },
  ],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.ikaleads.site'),
  title: {
    default: 'ikaLeads - Buy Local Business Leads & SMMA Lead Marketplace',
    template: '%s | ikaLeads',
  },
  description: 'ikaLeads is the #1 lead marketplace for SMMA agencies and local business marketers. Buy verified local business leads, sales leads, and B2B lead bundles instantly. Keep your pipeline full with high-quality prospects.',
  keywords: ['leads', 'local business leads', 'SMMA leads', 'buy leads', 'lead marketplace', 'lead generation', 'sales leads', 'B2B leads', 'local business', 'prospecting', 'outreach', 'lead bundles', 'business growth', 'sales pipeline'],
  authors: [{ name: 'ikaLeads' }],
  creator: 'ikaLeads',
  publisher: 'ikaLeads',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://www.ikaleads.site',
  },
  openGraph: {
    url: 'https://www.ikaleads.site/',
    title: 'ikaLeads - Buy Local Business Leads & SMMA Lead Marketplace',
    description: 'ikaLeads is the #1 lead marketplace for SMMA agencies and local business marketers. Buy verified local business leads, sales leads, and B2B lead bundles instantly.',
    type: 'website',
    siteName: 'ikaLeads',
    locale: 'en_US',
    images: [
      {
        url: 'https://www.ikaleads.site/og-image.png',
        width: 1424,
        height: 752,
        alt: 'ikaLeads - Local Business Leads Marketplace',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ikaLeads - Buy Local Business Leads & SMMA Lead Marketplace',
    description: 'ikaLeads is the #1 lead marketplace for SMMA agencies and local business marketers. Buy verified local business leads, sales leads, and B2B lead bundles instantly.',
    images: ['https://www.ikaleads.site/og-image.png'],
    creator: '@ikaleads',
  },
  verification: {
    google: 'VYACs12nfZ9g-LOS6PQyGC1FmxL-p4YE409m2V_39lI',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="icon" type="image/svg+xml" href="/ika-logo.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Bungee&display=swap" rel="stylesheet" />
      </head>
      <body className="font-poppins antialiased">
        <Script
          id="crisp-chat"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html:
              'window.$crisp=[];window.CRISP_WEBSITE_ID="730842f6-029a-459a-bb98-fba0bf514de8";(function(){d=document;s=d.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s);})();',
          }}
        />
        <Suspense fallback={<div className="min-h-screen" />}>
          <AuthGate>{children}</AuthGate>
        </Suspense>
        <AppOverlays />
        <Toaster />
      </body>
    </html>
  );
}

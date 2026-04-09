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
  title: 'ikaLeads - Leads Marketplace',
  description: 'The best leads platform for marketers. A workspace for your team to manage leads.',
  openGraph: {
    title: 'ikaLeads - Leads Marketplace',
    description: 'The best leads platform for marketers. A workspace for your team to manage leads.',
    type: 'website',
    images: [
      {
        url: 'https://ikaLeads.io/icon-512.png',
        width: 512,
        height: 512,
        alt: 'ikaLeads',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ikaLeads - Leads Marketplace',
    description: 'The best leads platform for marketers. A workspace for your team to manage leads.',
    images: ['https://ikaLeads.io/icon-512.png'],
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

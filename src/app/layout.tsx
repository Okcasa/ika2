import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
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
  title: 'Leads Marketplace',
  description: 'A workspace for your team to manage leads.',
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
        <AuthGate>{children}</AuthGate>
        <AppOverlays />
        <Toaster />
      </body>
    </html>
  );
}

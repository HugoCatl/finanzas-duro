import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { PRIVACY_BOOT } from '@/lib/privacy';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Finanzas',
  description: 'Todo tu dinero en un sitio',
  appleWebApp: { capable: true, title: 'Finanzas', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // sin zoom: la app se usa como nativa
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0a0a0b',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: PRIVACY_BOOT }} /></head>
      <body className={`${inter.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}

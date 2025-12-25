import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/ui/Header';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'DocForensics | Enterprise Document Authenticity Analysis',
  description: 'Professional-grade document forensics platform. Detect manipulation, forgery, and tampering in PDFs, images, and documents with AI-powered analysis.',
  keywords: ['document forensics', 'fraud detection', 'forgery analysis', 'metadata extraction', 'ELA', 'error level analysis'],
  authors: [{ name: 'DocForensics' }],
  openGraph: {
    title: 'DocForensics | Enterprise Document Authenticity Analysis',
    description: 'Professional-grade document forensics platform for legal and enterprise use.',
    type: 'website',
    siteName: 'DocForensics',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DocForensics',
    description: 'Enterprise Document Authenticity Analysis',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="antialiased min-h-screen bg-forensic-dark">
        <div className="scan-line" />
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

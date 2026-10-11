import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'BoardgameZaa - Online Boardgame Hub with Friends',
  description: 'Play Spyfall, Avalon, and community boardgames online with friends via invite links.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}


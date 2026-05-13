import type { Metadata } from 'next';
import type React from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'BBS – Baltic Benefits System',
  description: 'Baltic Benefits System – zarządzanie benefitami pracowniczymi',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body className="relative min-h-screen bg-black overflow-x-hidden">
        {children}
</body>
    </html>
  );
}

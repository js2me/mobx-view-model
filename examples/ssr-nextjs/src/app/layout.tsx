import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'mobx-view-model · SSR + Next.js',
  description:
    'Server Components + client ViewModelStore + withViewModel and hydration',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-demo-bg font-sans leading-normal text-demo-fg antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

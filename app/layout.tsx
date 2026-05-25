import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { Toaster } from '@/components/ui/sonner';
import { Inter, Lora } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Etsy AutoLister',
  description: 'Automate your Etsy digital listings, mockups, and search metadata with precision.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable}`}>
      <body className="font-sans antialiased text-[#191919] bg-[#FAF8F5]" suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  );
}

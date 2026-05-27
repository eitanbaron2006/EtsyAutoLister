import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { Toaster } from '@/components/ui/sonner';
import { Inter, Inter_Tight, Playfair_Display, Lora } from 'next/font/google';

const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
  style: ['normal', 'italic'],
  weight: ['400', '500', '600', '700', '800', '900'],
});

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-lora',
  display: 'swap',
  style: ['normal', 'italic'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Etsy AutoLister',
  description: 'Automate your Etsy digital listings, mockups, and search metadata with precision.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${interTight.variable} ${inter.variable} ${playfairDisplay.variable} ${lora.variable}`}>
      <body className="antialiased text-[#191919] bg-[#FAF8F5]" suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  );
}

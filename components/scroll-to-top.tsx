'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

export function ScrollToTop({ darkMode }: { darkMode: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-8 right-8 z-50 p-3 rounded-full border shadow-lg transition-all duration-300 flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-90 pointer-events-none'
        } ${darkMode
          ? 'bg-[#1a1914] border-[rgba(247,241,222,0.16)] text-[#efe7d2] hover:bg-[#25241d]'
          : 'bg-[#efe7d2] border-[rgba(21,20,15,0.16)] text-[#15140f] hover:bg-[#ece4cf]'
        }`}
      aria-label="Scroll to top"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
}

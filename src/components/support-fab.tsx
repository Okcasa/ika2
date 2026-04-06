'use client';

import { useCallback } from 'react';
import { MessageCircle } from 'lucide-react';

export function SupportFab() {
  const openSupportChat = useCallback(() => {
    const crisp = (window as any).$crisp;
    if (Array.isArray(crisp)) {
      crisp.push(['do', 'chat:show']);
      crisp.push(['do', 'chat:open']);
    }
  }, []);

  return (
    <button
      type="button"
      aria-label="Open support chat"
      onClick={openSupportChat}
      className="fixed bottom-5 left-5 z-[60] flex h-12 w-12 items-center justify-center rounded-full bg-[#4f46e5] text-white shadow-[0_10px_24px_rgba(79,70,229,0.45)] transition hover:brightness-110"
    >
      <MessageCircle className="h-6 w-6" />
    </button>
  );
}

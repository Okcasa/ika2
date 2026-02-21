'use client';

import { useEffect, useMemo, useState } from 'react';

type PaddleWindow = Window & {
  Paddle?: {
    Environment?: { set: (env: string) => void };
    Initialize: (opts: { token: string; eventCallback?: (event: any) => void }) => void;
    Checkout: { open: (opts: any) => void };
  };
};

const MIN_CUSTOM_LEADS = 5;

const toInt = (value: string | null, fallback: number) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export default function PaddlePopupCheckoutPage() {
  const [status, setStatus] = useState('Preparing checkout...');

  const params = useMemo(() => new URLSearchParams(typeof window !== 'undefined' ? window.location.search : ''), []);
  const pkg = params.get('pkg') || 'standard';
  const requestedLeads = toInt(params.get('leads'), MIN_CUSTOM_LEADS);

  const paddleToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || '';
  const paddleEnv = (process.env.NEXT_PUBLIC_PADDLE_ENV || 'sandbox').toLowerCase();
  const price30 = process.env.NEXT_PUBLIC_PADDLE_PRICE_30 || '';
  const price90 = process.env.NEXT_PUBLIC_PADDLE_PRICE_90 || '';
  const price180 = process.env.NEXT_PUBLIC_PADDLE_PRICE_180 || '';
  const price280 = process.env.NEXT_PUBLIC_PADDLE_PRICE_280 || '';
  const priceCustom = process.env.NEXT_PUBLIC_PADDLE_PRICE_CUSTOM || '';

  useEffect(() => {
    const w = window as PaddleWindow;
    const script = document.createElement('script');
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    script.async = true;

    const postSuccess = (transactionId: string, priceId: string, leads: number, packageId: string) => {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          {
            type: 'paddle:transaction.closed',
            transactionId,
            priceId,
            leads,
            packageId,
          },
          window.location.origin
        );
      }
    };

    script.onload = () => {
      if (!w.Paddle) {
        setStatus('Paddle failed to load.');
        return;
      }
      if (!paddleToken) {
        setStatus('Missing NEXT_PUBLIC_PADDLE_CLIENT_TOKEN');
        return;
      }

      const byPkg: Record<string, { priceId: string; quantity: number; leads: number; packageId: string }> = {
        growth: { priceId: price90, quantity: 1, leads: 90, packageId: 'growth' },
        pro: { priceId: price180, quantity: 1, leads: 180, packageId: 'pro' },
        enterprise: { priceId: price280, quantity: 1, leads: 280, packageId: 'enterprise' },
      };
      const customLeads = Math.max(MIN_CUSTOM_LEADS, requestedLeads);
      const customConfig = { priceId: priceCustom, quantity: customLeads, leads: customLeads, packageId: 'standard' };
      const checkout = byPkg[pkg] || customConfig;

      if (!checkout.priceId) {
        setStatus('Missing Paddle price env vars.');
        return;
      }

      try {
        w.Paddle.Environment?.set(paddleEnv === 'production' ? 'production' : 'sandbox');
        w.Paddle.Initialize({
          token: paddleToken,
          eventCallback: (event) => {
            if (event?.name === 'checkout.error') {
              setStatus(event?.data?.message || 'Checkout failed.');
            }
            if (event?.name === 'checkout.completed') {
              const txId = String(event?.data?.transaction_id || '');
              setStatus('Payment complete. Closing in 3...');
              postSuccess(txId, checkout.priceId, checkout.leads, checkout.packageId);
              let remaining = 2;
              const countdownTimer = window.setInterval(() => {
                if (remaining <= 0) {
                  window.clearInterval(countdownTimer);
                  try {
                    window.close();
                  } catch {}
                  return;
                }
                setStatus(`Payment complete. Closing in ${remaining}...`);
                remaining -= 1;
              }, 1000);
            }
          },
        });

        setStatus('Opening checkout...');
        w.Paddle.Checkout.open({
          items: [{ priceId: checkout.priceId, quantity: checkout.quantity }],
          settings: {
            variant: 'one-page',
            displayMode: 'overlay',
            theme: 'light',
            locale: 'en',
          },
        });
      } catch {
        setStatus('Unable to open checkout.');
      }
    };

    script.onerror = () => setStatus('Failed to load Paddle checkout script.');
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, [paddleEnv, paddleToken, pkg, price180, price280, price90, priceCustom, requestedLeads]);

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#f8fafc',
        color: '#111827',
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        padding: '24px',
      }}
    >
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff', padding: 16, fontSize: 14 }}>
        {status}
      </div>
    </main>
  );
}

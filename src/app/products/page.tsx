'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Mail, Target, Package, TrendingUp, Sparkles, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { getStoredNotifications, storeNotifications } from '@/lib/notifications';
import { NotificationBell } from '@/components/notification-bell';
import { useToast } from '@/hooks/use-toast';

const LEADS_KEY = 'ika_leads_data';
const PURCHASE_HISTORY_KEY = 'ika_purchase_history';

const PACKAGES = [
  { id: 'starter', name: 'Starter Pack', leads: 30, price: 3.5, description: '30 Leads', color: 'bg-blue-100 text-blue-600', status: 'Active' },
  { id: 'standard', name: 'Standard Pack', leads: 30, price: 3.5, description: '30 Leads', color: 'bg-emerald-100 text-emerald-600', status: 'Active' },
  { id: 'growth', name: 'Growth Pack', leads: 90, price: 7, description: '90 Leads', color: 'bg-purple-100 text-purple-600', status: 'Active' },
  { id: 'pro', name: 'Pro Bundle', leads: 180, price: 15.35, description: '180 Leads', color: 'bg-orange-100 text-orange-600', status: 'Active' },
  { id: 'enterprise', name: 'Enterprise', leads: 280, price: 30, description: '280 Leads', color: 'bg-green-100 text-green-600', status: 'Active' },
];

const getBundlePrice = (leads: number) => {
  const qty = Math.max(1, leads);
  const tiers = [
    { leads: 30, price: 3.5 },
    { leads: 90, price: 7 },
    { leads: 180, price: 15.35 },
    { leads: 280, price: 30 },
  ];

  if (qty <= tiers[0].leads) {
    return qty * (tiers[0].price / tiers[0].leads);
  }

  for (let i = 1; i < tiers.length; i += 1) {
    const prev = tiers[i - 1];
    const curr = tiers[i];
    if (qty <= curr.leads) {
      const ratio = (qty - prev.leads) / (curr.leads - prev.leads);
      return prev.price + ratio * (curr.price - prev.price);
    }
  }

  const last = tiers[tiers.length - 1];
  return qty * (last.price / last.leads);
};

function ProductPageContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [availableLeadsCount, setAvailableLeadsCount] = useState<number>(0);
  const [loading, setLoading] = useState<string | null>(null);
  const [highlightPkg, setHighlightPkg] = useState<string | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<Array<{ id: string; pack: string; leads: number; total: number; createdAt: string }>>([]);
  const [customLeadsInput, setCustomLeadsInput] = useState<string>('30');
  const [minLeadsError, setMinLeadsError] = useState(false);
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({
    standard: 30,
  });
  const currentLeads = quantities.standard || 30;
  const currentPrice = getBundlePrice(currentLeads);
  const currentPriceLabel = `$${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const paymentPopupRef = useRef<Window | null>(null);
  const paymentPopupWatchRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingPurchaseRef = useRef<{ pkgId: string; leads: number; total: number; checkoutSessionId: string; checkoutStartedAtMs: number } | null>(null);
  const paymentInFlightRef = useRef(false);
  const recentTransactionRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const loadAvailability = async () => {
      try {
        const res = await fetch('/api/marketplace-availability', { method: 'GET' });
        const data = await res.json();
        if (res.ok && typeof data?.available === 'number') {
          setAvailableLeadsCount(data.available);
          return;
        }
      } catch {
        // fallback to client query below
      }

      const { count } = await supabase
        .from('marketplace_leads')
        .select('*', { count: 'exact', head: true })
        .is('assigned_to', null)
        .eq('status', 'available');
      setAvailableLeadsCount(count || 0);
    };
    loadAvailability();
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(PURCHASE_HISTORY_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) setPurchaseHistory(parsed);
    } catch {
      // ignore malformed history
    }
  }, []);

  useEffect(() => {
    const pkg = searchParams?.get('pkg');
    if (!pkg) return;
    setHighlightPkg(pkg);
    const pkgLeadMap: Record<string, number> = {
      starter: 30,
      standard: 30,
      growth: 90,
      pro: 180,
      enterprise: 280,
    };
    const selectedLeads = pkgLeadMap[pkg];
    if (selectedLeads) {
      setQuantities((prev) => ({ ...prev, standard: selectedLeads }));
      setCustomLeadsInput(String(selectedLeads));
      setMinLeadsError(false);
    }
    const el = document.getElementById(`pkg-${pkg}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    const t = setTimeout(() => setHighlightPkg(null), 2000);
    return () => clearTimeout(t);
  }, [searchParams]);

  const handleQuantityChange = (id: string, value: number) => {
    const safeValue = Math.max(5, value);
    setQuantities((prev) => ({ ...prev, [id]: safeValue }));
    if (id === 'standard') {
      setCustomLeadsInput(String(safeValue));
      setMinLeadsError(false);
    }
  };

  const stopQuantityHold = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  };

  const nudgeStandardQuantity = (delta: number) => {
    setQuantities((prev) => {
      const next = Math.max(5, (prev.standard || 5) + delta);
      setCustomLeadsInput(String(next));
      return { ...prev, standard: next };
    });
    setMinLeadsError(false);
  };

  const startQuantityHold = (delta: number) => {
    stopQuantityHold();
    nudgeStandardQuantity(delta);
    holdTimeoutRef.current = setTimeout(() => {
      holdIntervalRef.current = setInterval(() => {
        nudgeStandardQuantity(delta);
      }, 65);
    }, 180);
  };

  useEffect(() => {
    return () => {
      stopQuantityHold();
      if (paymentPopupWatchRef.current) {
        clearInterval(paymentPopupWatchRef.current);
        paymentPopupWatchRef.current = null;
      }
    };
  }, []);

  const handleCustomLeadsBlur = () => {
    const parsed = parseInt(customLeadsInput, 10);
    if (!Number.isFinite(parsed) || parsed < 5) {
      setQuantities((prev) => ({ ...prev, standard: 5 }));
      setCustomLeadsInput('5');
      setMinLeadsError(true);
      return;
    }
    setQuantities((prev) => ({ ...prev, standard: parsed }));
    setCustomLeadsInput(String(parsed));
    setMinLeadsError(false);
  };

  const recordPurchaseHistory = (packName: string, leads: number, total: number, transactionId?: string) => {
    setPurchaseHistory((prev) => {
      const nextEntry = {
        id: transactionId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        pack: packName,
        leads,
        total,
        createdAt: new Date().toISOString(),
      };
      const next = [nextEntry, ...prev].slice(0, 100);
      localStorage.setItem(PURCHASE_HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  };

  const pushPaymentNotification = (grantedCount: number, transactionId?: string) => {
    if (transactionId && recentTransactionRef.current.has(transactionId)) return;
    if (transactionId) {
      recentTransactionRef.current.add(transactionId);
    }

    const existing = getStoredNotifications();
    const message = transactionId
      ? `Transaction ${transactionId} completed. ${grantedCount} leads were added.`
      : `${grantedCount} leads were added after your payment.`;

    storeNotifications([
      {
        id: transactionId || `payment-${Date.now()}`,
        text: message,
        at: Date.now(),
        read: false,
      },
      ...existing,
    ]);
  };

  const fulfillPurchasedLeads = async (payload?: { leads?: number; packageId?: string; transactionId?: string; checkoutStartedAtMs?: number }) => {
    if (paymentInFlightRef.current) return;
    const transactionId = typeof payload?.transactionId === 'string' ? payload.transactionId : '';
    if (!transactionId) {
      toast({
        title: 'Checkout not completed',
        description: 'No completed transaction found for this checkout session.',
      });
      return;
    }
    paymentInFlightRef.current = true;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({
          title: 'Sign in required',
          description: 'Please sign in again and retry checkout.',
          variant: 'destructive',
        });
        return;
      }

      const fallback = pendingPurchaseRef.current;
      const requestedLeads = Number(payload?.leads || fallback?.leads || currentLeads);
      const packageId = payload?.packageId || fallback?.pkgId || 'standard';
      const total = Number(fallback?.total || getBundlePrice(requestedLeads));
      const checkoutStartedAtMs = Number(payload?.checkoutStartedAtMs || fallback?.checkoutStartedAtMs || 0);

      let response: Response | null = null;
      let json: any = null;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        response = await fetch('/api/payment/fulfill', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            requestedLeads,
            packageId,
            transactionId,
            checkoutStartedAtMs: Number.isFinite(checkoutStartedAtMs) ? checkoutStartedAtMs : 0,
          }),
        });
        json = await response.json().catch(() => ({}));
        if (response.ok && json?.granted) break;
        const errText = String(json?.error || json?.reason || '').toLowerCase();
        const shouldRetry = errText.includes('no completed transaction found');
        if (!shouldRetry || attempt === 7) {
          throw new Error(json?.error || json?.reason || 'Payment recorded but lead fulfillment failed.');
        }
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }

      const packName = PACKAGES.find((p) => p.id === packageId)?.name || 'Custom Bundle';
      const grantedCount = Number(json?.leadCount || requestedLeads);
      recordPurchaseHistory(packName, grantedCount, total, json?.transactionId);
      setAvailableLeadsCount((prev) => Math.max(0, prev - grantedCount));
      pendingPurchaseRef.current = null;
      pushPaymentNotification(grantedCount, typeof json?.transactionId === 'string' ? json.transactionId : undefined);
      window.dispatchEvent(new Event('leads:refresh'));
      toast({
        title: 'Payment complete',
        description: `${grantedCount} leads added to your account.`,
      });
    } catch (error: any) {
      toast({
        title: 'Payment sync issue',
        description: error?.message || 'Unable to fulfill leads from this payment.',
        variant: 'destructive',
      });
    } finally {
      paymentInFlightRef.current = false;
    }
  };

  useEffect(() => {
    const successTypes = new Set(['paddle:transaction.completed']);

    const extractTransactionId = (data: any): string | undefined => {
      const possible = [
        data?.transactionId,
        data?.transaction_id,
        data?.id,
        data?.txn_id,
      ];
      const found = possible.find((value) => typeof value === 'string' && value.length > 0);
      return typeof found === 'string' ? found : undefined;
    };

    const onPaymentMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data || {};
      const messageType = String(data?.type || data?.eventType || '');
      if (!successTypes.has(messageType)) return;
      const pending = pendingPurchaseRef.current;
      if (!pending) return;
      const checkoutSessionId = String(data?.checkoutSessionId || '');
      if (!checkoutSessionId || checkoutSessionId !== pending.checkoutSessionId) return;
      try {
        paymentPopupRef.current?.close();
      } catch {}
      void fulfillPurchasedLeads({
        leads: Number(data?.leads || 0),
        packageId: typeof data?.packageId === 'string' ? data.packageId : undefined,
        transactionId: extractTransactionId(data),
        checkoutStartedAtMs: pending.checkoutStartedAtMs,
      });
    };
    window.addEventListener('message', onPaymentMessage);
    return () => window.removeEventListener('message', onPaymentMessage);
  }, [currentLeads]);

  const handlePurchase = async (pkgId: string, customCost?: number, customLeads?: number) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
       window.dispatchEvent(new Event('auth:open'));
       return;
    }
    const selectedLeads = pkgId === 'standard'
      ? (customLeads || quantities.standard || currentLeads)
      : (PACKAGES.find((p) => p.id === pkgId)?.leads || currentLeads);
    const selectedTotal = customCost || getBundlePrice(selectedLeads);
    const checkoutSessionId = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    pendingPurchaseRef.current = {
      pkgId,
      leads: selectedLeads,
      total: selectedTotal,
      checkoutSessionId,
      checkoutStartedAtMs: Date.now(),
    };

    const params = new URLSearchParams({
      uid: session.user.id,
      leads: String(selectedLeads),
      pkg: pkgId,
      price: selectedTotal.toFixed(2),
      origin: window.location.origin,
      ck: checkoutSessionId,
    });
    const popupUrl = `${window.location.origin}/checkout/paddle?${params.toString()}`;
    const popupName = "automa_checkout";
    const width = 1000;
    const height = 720;
    const left = Math.max(0, Math.floor((window.screen.width - width) / 2));
    const top = Math.max(0, Math.floor((window.screen.height - height) / 2));
    const popupFeatures = `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`;
    paymentPopupRef.current = window.open(popupUrl, popupName, popupFeatures);

    if (paymentPopupWatchRef.current) {
      clearInterval(paymentPopupWatchRef.current);
      paymentPopupWatchRef.current = null;
    }

    if (!paymentPopupRef.current) {
      toast({
        title: 'Popup blocked',
        description: 'Allow popups and retry checkout.',
        variant: 'destructive',
      });
      return;
    }

    paymentPopupWatchRef.current = setInterval(() => {
      const popup = paymentPopupRef.current;
      if (!popup || popup.closed) {
        if (paymentPopupWatchRef.current) {
          clearInterval(paymentPopupWatchRef.current);
          paymentPopupWatchRef.current = null;
        }
        if (pendingPurchaseRef.current) {
          pendingPurchaseRef.current = null;
          toast({
            title: 'Purchase not completed',
            description: 'No payment was captured. You can try checkout again.',
          });
        }
      }
    }, 900);
  };

  const handleDeletePurchaseEntry = (entryId: string) => {
    const nextHistory = purchaseHistory.filter((item) => item.id !== entryId);
    setPurchaseHistory(nextHistory);
    localStorage.setItem(PURCHASE_HISTORY_KEY, JSON.stringify(nextHistory));
  };

  const renderAnimatedLabel = (text: string) =>
    text.split('').map((char, idx) => (
      <span key={`${char}-${idx}`} className="pay-btn-letter">
        {char === ' ' ? '\u00A0' : char}
      </span>
    ));

  return (
    <div className="p-8 max-w-[1600px] mx-auto app-shell-bg app-shell-text h-screen overflow-y-auto select-none flex flex-col gap-8">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-[#1C1917]">Marketplace</h1>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex gap-2">
            <NotificationBell />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-8 items-stretch flex-1 min-h-0">
        <div className="col-span-12 lg:col-span-8 space-y-6 min-h-0 flex flex-col">
          <div className="grid md:grid-cols-2 gap-4" data-tutorial-id="products-overview">
            <Card
              id="pkg-standard"
              className={cn(
                "rounded-[32px] shadow-sm bg-[#1C1917] text-[#FAFAF9] transition-all border border-stone-700/80",
                highlightPkg === 'standard' && "ring-4 ring-violet-300/80"
              )}
            >
              <CardContent className="p-8">
                 <div className="flex justify-between items-start mb-4">
                   <div className="flex items-center gap-3">
                     <div className="p-2 bg-white/15 rounded-full">
                       <Mail className="h-5 w-5 text-stone-100" />
                     </div>
                     <span className="font-semibold text-stone-100">Standard Pack</span>
                   </div>
                 </div>
                 <div className="flex items-baseline gap-4">
                   <span className="text-5xl font-bold tracking-tight">$3.50</span>
                   <Badge variant="secondary" className="bg-[#E5E4E2] text-[#1C1917] hover:bg-[#E5E4E2] hover:text-[#1C1917] px-2 py-1 uppercase text-[10px] font-bold">
                     30 Leads
                   </Badge>
                 </div>
                 <p className="text-sm text-stone-300 mt-2">High Intent Lead Injection</p>
              </CardContent>
            </Card>

            <Card className="rounded-[32px] border-none shadow-sm bg-white text-stone-900 border border-stone-200">
              <CardContent className="p-8">
                 <div className="flex justify-between items-start mb-4">
                   <div className="flex items-center gap-3">
                     <div className="p-2 bg-stone-50 rounded-full">
                       <TrendingUp className="h-5 w-5 text-stone-400" />
                     </div>
                     <span className="font-semibold text-stone-500">Market Volume</span>
                   </div>
                 </div>
                 <div className="flex items-baseline gap-4">
                   <span className="text-5xl font-bold tracking-tight text-stone-900">{availableLeadsCount.toLocaleString()}</span>
                   <Badge variant="outline" className="text-emerald-600 border-emerald-100 px-2 py-1 uppercase text-[10px] font-bold">
                     Live Data
                   </Badge>
                 </div>
                 <p className="text-sm text-stone-400 mt-2">Available and unassigned leads</p>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-[32px] border-none shadow-sm bg-white text-stone-900 overflow-hidden border border-stone-100" data-tutorial-id="products-config">
            <CardContent className="p-8 md:p-10">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center">
                    <Package className="h-5 w-5 text-violet-700" />
                  </div>
                  <h3 className="text-4xl md:text-[40px] leading-none font-black tracking-tight text-stone-800">Configure Order</h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-8 items-end">
                  <div className="space-y-7">
                    <div className="space-y-3">
                      <p className="text-xs font-black uppercase tracking-wider text-stone-500">Select Lead Units</p>
                      <div className="flex flex-wrap gap-3 max-w-md">
                        {[30, 90, 180, 280].map((n) => (
                          <Button
                            key={n}
                            variant="outline"
                            className={cn(
                              "h-12 min-w-[104px] rounded-full px-5 border-2 text-lg font-black",
                              quantities.standard === n
                                ? "border-violet-500 text-violet-600 bg-white shadow-[0_0_0_3px_rgba(139,92,246,0.12)]"
                                : "border-stone-200 text-stone-600 bg-stone-50 hover:bg-stone-100"
                            )}
                            onClick={() => handleQuantityChange('standard', n)}
                          >
                            {n} Units
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs font-black uppercase tracking-wider text-stone-500">Custom Lead Counter</p>
                      <div
                        className={cn(
                          "flex h-14 max-w-xs items-center rounded-3xl border bg-stone-50 px-2",
                          minLeadsError ? "border-red-500 ring-2 ring-red-300" : "border-stone-200"
                        )}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11 rounded-full text-stone-700 hover:bg-stone-200 text-3xl font-black"
                          onPointerDown={(e) => {
                            e.preventDefault();
                            startQuantityHold(-1);
                          }}
                          onPointerUp={stopQuantityHold}
                          onPointerLeave={stopQuantityHold}
                          onPointerCancel={stopQuantityHold}
                          onClick={(e) => e.preventDefault()}
                        >
                          -
                        </Button>
                        <Input
                          type="text"
                          placeholder="Enter leads..."
                          inputMode="numeric"
                          className="h-12 border-none bg-transparent font-black text-3xl text-center text-stone-800 focus-visible:ring-0"
                          value={customLeadsInput}
                          onChange={(e) => {
                            const digitsOnly = e.target.value.replace(/[^\d]/g, '');
                            setCustomLeadsInput(digitsOnly);
                            setMinLeadsError(false);
                            const parsed = parseInt(digitsOnly, 10);
                            if (Number.isFinite(parsed) && parsed > 0) {
                              setQuantities((prev) => ({ ...prev, standard: parsed }));
                            }
                          }}
                          onBlur={handleCustomLeadsBlur}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11 rounded-full text-stone-700 hover:bg-stone-200 text-3xl font-black"
                          onPointerDown={(e) => {
                            e.preventDefault();
                            startQuantityHold(1);
                          }}
                          onPointerUp={stopQuantityHold}
                          onPointerLeave={stopQuantityHold}
                          onPointerCancel={stopQuantityHold}
                          onClick={(e) => e.preventDefault()}
                        >
                          +
                        </Button>
                      </div>
                      {minLeadsError && <p className="ml-1 text-xs font-semibold text-red-600">Minimum 5 leads</p>}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-3xl border border-stone-200 bg-stone-50 p-6 space-y-4">
                      <div className="flex items-center justify-between text-stone-500">
                        <span className="font-semibold">Subtotal</span>
                        <span className="font-black text-stone-700">
                          {currentPriceLabel}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-stone-400">
                        <span className="font-semibold">Taxes (Included)</span>
                        <span className="font-semibold">$0.00</span>
                      </div>
                      <div className="border-t border-stone-200 pt-3 flex items-center justify-between">
                        <span className="text-2xl font-black text-stone-800">Total Cost</span>
                        <span className="text-5xl font-black tracking-tight text-violet-600">
                          {currentPriceLabel}
                        </span>
                      </div>
                    </div>

                    <div className="pay-btn-wrapper w-full">
                      <button
                        type="button"
                        onClick={() => handlePurchase('standard')}
                        disabled={loading === 'standard'}
                        className="pay-btn w-full"
                      >
                        <svg className="pay-btn-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
                          />
                        </svg>

                        <div className="pay-btn-txt-wrapper">
                          {loading === 'standard' ? (
                            <div className="pay-btn-txt1">{renderAnimatedLabel('Processing...')}</div>
                          ) : (
                            <>
                              <div className="pay-btn-txt1">{renderAnimatedLabel('Pay with Card')}</div>
                              <div key={currentPriceLabel} className="pay-btn-txt2">{renderAnimatedLabel(currentPriceLabel)}</div>
                            </>
                          )}
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[32px] border-none shadow-sm bg-white text-stone-900 overflow-hidden border border-stone-100 min-h-[260px] flex-1 min-h-0" data-tutorial-id="products-history">
            <CardContent className="p-8 h-full flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-black tracking-tight">Purchase History</h3>
                <Badge variant="outline" className="h-8 px-3 text-xs font-bold text-stone-700 border-stone-300 bg-white">
                  Entries: {Math.min(purchaseHistory.length, 20)}
                </Badge>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
                {purchaseHistory.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/40 min-h-[220px] h-full flex items-center justify-center">
                    <div className="text-center max-w-sm px-6">
                      <div className="mx-auto h-16 w-16 rounded-full bg-stone-100 flex items-center justify-center mb-5">
                        <History className="h-7 w-7 text-stone-400" />
                      </div>
                      <p className="text-[31px] leading-none md:text-[34px] font-black text-stone-700 tracking-tight">No purchases yet.</p>
                      <p className="mt-3 text-[17px] leading-relaxed text-stone-400 font-medium">
                        Once you complete your first order, it will appear here for your records.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {purchaseHistory.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-stone-900">{item.pack}</div>
                          <div className="text-xs text-stone-500">{item.leads} leads • {new Date(item.createdAt).toLocaleString()}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="font-black text-stone-900">${item.total.toFixed(2)}</div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 text-xs font-bold border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => handleDeletePurchaseEntry(item.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

        </div>

        <div className="col-span-12 lg:col-span-4 min-h-0">
            <Card className="rounded-[40px] border-none shadow-sm h-full min-h-0 bg-[#1C1917] text-[#FAFAF9]" data-tutorial-id="products-bundles">
              <CardContent className="p-10 flex flex-col h-full">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-black">Quick Bundles</h3>
                  <Sparkles className="h-5 w-5 text-yellow-400" />
                </div>

                <div className="space-y-8 flex-1">
                  {PACKAGES.filter(p => p.id !== 'standard').map((pkg) => (
                    <div
                        id={`pkg-${pkg.id}`}
                        key={pkg.id} 
                        className={cn(
                          "flex items-center justify-between group cursor-pointer rounded-2xl px-2 py-2 transition-all",
                          highlightPkg === pkg.id && "bg-violet-500/10 ring-1 ring-violet-400/40"
                        )}
                        onClick={() => handlePurchase(pkg.id)}
                    >
                      <div className="flex items-center gap-5">
                        <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110", pkg.color)}>
                           <Package className="h-7 w-7" />
                        </div>
                        <div>
                          <div className="font-black text-base text-[#FAFAF9] tracking-tight">{pkg.name}</div>
                          <div className="text-sm font-extrabold text-stone-300 uppercase tracking-wide mt-0.5">{pkg.description}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-[#FAFAF9] text-lg tracking-tighter">
                          ${pkg.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <Badge 
                            variant="secondary" 
                            className="mt-1 text-[9px] font-black uppercase tracking-widest border-none px-2 text-emerald-500 bg-emerald-500/10"
                        >
                          {pkg.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-12 p-8 rounded-[2.5rem] bg-stone-800/30 border border-stone-700/50 text-center space-y-4">
                    <Target className="h-8 w-8 text-stone-500 mx-auto" />
                    <div className="space-y-1">
                        <p className="font-black text-stone-200">Custom Mining</p>
                        <p className="text-xs text-stone-500 font-medium">Bulk data extraction for specific industries.</p>
                    </div>
                    <Button variant="outline" className="w-full rounded-2xl h-12 border-stone-600 text-stone-400 hover:bg-white hover:text-stone-900 transition-all font-black uppercase text-[10px] tracking-widest">
                        Contact Support
                    </Button>
                </div>
              </CardContent>
            </Card>
        </div>
      </div>

    </div>
  );
}

export default function RootProductsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen app-shell-bg app-shell-text" />}>
      <div className="flex min-h-screen app-shell-bg app-shell-text">
        <div className="hidden md:block fixed left-0 top-0 h-full z-50">
          <Sidebar />
        </div>
        <main 
          className="flex-1 p-0 min-h-screen relative z-0 transition-[margin] duration-75"
          style={{ marginLeft: 'var(--sidebar-width, 256px)' }}
        >
          <ProductPageContent />
        </main>
      </div>
    </Suspense>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Mail, Target, Package, TrendingUp, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

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

export default function BundlesPreviewPage() {
  const { toast } = useToast();
  const [availableLeadsCount] = useState<number>(8421);
  const [highlightPkg, setHighlightPkg] = useState<string | null>('standard');
  const [customLeadsInput, setCustomLeadsInput] = useState<string>('30');
  const [minLeadsError, setMinLeadsError] = useState(false);
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({
    standard: 30,
  });

  const quickBundles = useMemo(() => PACKAGES.filter((p) => p.id !== 'standard'), []);
  const topPopularBundle = quickBundles[0] || PACKAGES.find((p) => p.id === 'standard') || PACKAGES[0];
  const currentLeads = quantities.standard || 30;
  const currentPrice = getBundlePrice(currentLeads);
  const currentPriceLabel = `$${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleQuantityChange = (value: number) => {
    const safeValue = Math.max(5, value);
    setQuantities((prev) => ({ ...prev, standard: safeValue }));
    setCustomLeadsInput(String(safeValue));
    setMinLeadsError(false);
  };

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

  const handleReadOnlyPayClick = () => {
    toast({
      title: 'Read-only preview',
      description: 'You can explore bundles here. Use Open Platform to sign in and complete checkout.',
    });
  };

  return (
    <div className="min-h-screen w-full app-shell-bg app-shell-text">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-8 p-8">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-[#1C1917]">Bundle Preview</h1>
          <Badge className="bg-stone-800 text-white hover:bg-stone-800">Read Only</Badge>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/shop"
            className="inline-flex items-center justify-center rounded-full bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-black"
          >
            Open Platform
          </a>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-8 items-stretch flex-1 min-h-0">
        <div className="col-span-12 lg:col-span-8 space-y-6 min-h-0 flex flex-col">
          <div className="grid md:grid-cols-2 gap-4">
            <Card
              id={`pkg-${topPopularBundle.id}`}
              className={cn(
                "rounded-[32px] shadow-sm bg-[#1C1917] text-[#FAFAF9] transition-all border border-stone-700/80",
                highlightPkg === topPopularBundle.id && "ring-4 ring-violet-300/80"
              )}
            >
              <CardContent className="p-8">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/15 rounded-full">
                      <Mail className="h-5 w-5 text-stone-100" />
                    </div>
                    <span className="font-semibold text-stone-100">{topPopularBundle.name}</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-4">
                  <span className="text-5xl font-bold tracking-tight">
                    ${topPopularBundle.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <Badge variant="secondary" className="bg-[#E5E4E2] text-[#1C1917] hover:bg-[#E5E4E2] hover:text-[#1C1917] px-2 py-1 uppercase text-[10px] font-bold">
                    {topPopularBundle.leads} Leads
                  </Badge>
                </div>
                <p className="text-sm text-stone-300 mt-2">Most bought bundle right now</p>
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
                    Preview
                  </Badge>
                </div>
                <p className="text-sm text-stone-400 mt-2">Sample public visibility of available inventory</p>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-[32px] border-none shadow-sm bg-white text-stone-900 overflow-hidden border border-stone-100">
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
                            onClick={() => handleQuantityChange(n)}
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
                          onClick={() => handleQuantityChange((quantities.standard || 5) - 1)}
                        >
                          -
                        </Button>
                        <Input
                          type="text"
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
                          onClick={() => handleQuantityChange((quantities.standard || 5) + 1)}
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
                        <span className="font-black text-stone-700">{currentPriceLabel}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-stone-400">
                        <span className="font-semibold">Taxes (Included)</span>
                        <span className="font-semibold">$0.00</span>
                      </div>
                      <div className="border-t border-stone-200 pt-3 flex items-center justify-between">
                        <span className="text-2xl font-black text-stone-800">Total Cost</span>
                        <span className="text-5xl font-black tracking-tight text-violet-600">{currentPriceLabel}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={handleReadOnlyPayClick}
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
                          <div className="pay-btn-txt1">Preview Only</div>
                          <div className="pay-btn-txt2">{currentPriceLabel}</div>
                        </div>
                      </button>
                      <p className="text-center text-xs font-semibold text-stone-500">
                        Checkout is disabled on this page.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-4 min-h-0">
          <Card className="rounded-[40px] border-none shadow-sm h-full min-h-0 bg-[#1C1917] text-[#FAFAF9]">
            <CardContent className="p-10 flex flex-col h-full">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black">Popular Bundles</h3>
                <Sparkles className="h-5 w-5 text-yellow-400" />
              </div>

              <div className="space-y-8 flex-1">
                {quickBundles.map((pkg) => (
                  <button
                    id={`pkg-${pkg.id}`}
                    key={pkg.id}
                    type="button"
                    onClick={() => {
                      setHighlightPkg(pkg.id);
                      handleQuantityChange(pkg.leads);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between rounded-2xl px-2 py-2 transition-all text-left",
                      highlightPkg === pkg.id
                        ? "bg-violet-500/10 ring-1 ring-violet-400/40"
                        : "hover:bg-white/5"
                    )}
                  >
                    <div className="flex items-center gap-5">
                      <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center transition-all", pkg.color)}>
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
                  </button>
                ))}
              </div>

              <div className="mt-12 p-8 rounded-[2.5rem] bg-stone-800/30 border border-stone-700/50 text-center space-y-4">
                <Target className="h-8 w-8 text-stone-500 mx-auto" />
                <div className="space-y-1">
                  <p className="font-black text-stone-200">Custom Mining</p>
                  <p className="text-xs text-stone-500 font-medium">Bulk data extraction for specific industries.</p>
                </div>
                <Button
                  variant="outline"
                  className="w-full rounded-2xl h-12 border-stone-600 text-stone-400 hover:bg-white hover:text-stone-900 transition-all font-black uppercase text-[10px] tracking-widest"
                  onClick={() =>
                    toast({
                      title: 'Contact support',
                      description: 'Sign in on the platform to request custom mining.',
                    })
                  }
                >
                  Contact Support
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </div>
  );
}

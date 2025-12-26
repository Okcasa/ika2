'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bell, ArrowUpRight, Zap, Mail, Video, Check } from 'lucide-react';

const PACKAGES = [
  {
    id: 'standard',
    name: 'Standard',
    basePrice: 5,
    description: 'Essential leads for growth.',
    accent: 'text-blue-600',
    bg: 'bg-blue-50',
    icon: <Mail className="w-5 h-5 text-blue-600" />,
    features: ['Email Support', 'Basic Info', '24h Delivery']
  },
  {
    id: 'premium',
    name: 'Premium',
    basePrice: 12,
    description: 'High-intent vetted leads.',
    accent: 'text-purple-600',
    bg: 'bg-purple-50',
    icon: <Zap className="w-5 h-5 text-purple-600" />,
    features: ['Priority Support', 'Full Profile', 'Instant Delivery']
  },
  {
    id: 'enterprise',
    name: 'Exclusive',
    basePrice: 25,
    description: '1-on-1 exclusive access.',
    accent: 'text-emerald-600',
    bg: 'bg-emerald-50',
    icon: <Video className="w-5 h-5 text-emerald-600" />,
    features: ['Dedicated Agent', 'Verified', 'Real-time Sync']
  },
];

const PRESETS = [10, 30, 50, 100, 200];

function ProductPageContent() {
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({
    standard: 10,
    premium: 5,
    enterprise: 1,
  });

  const handleQuantityChange = (id: string, value: number) => {
    // Ensure value is at least 1 and handle max limits if needed
    const safeValue = Math.max(1, value);
    setQuantities((prev) => ({ ...prev, [id]: safeValue }));
  };

  return (
    <div className="px-8 py-6 space-y-8 bg-[#E5E4E2] min-h-screen text-stone-900 select-none">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Marketplace
          </h1>
          <p className="text-sm text-stone-500">Select your lead packages.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="rounded-full border-stone-300 bg-white hover:bg-stone-100 hover:text-stone-900 text-stone-700 shadow-sm h-9 text-xs">
            Credits: $1,240
          </Button>
          <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center cursor-pointer shadow-sm hover:shadow border border-stone-200">
             <Bell className="w-4 h-4 text-stone-600" />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PACKAGES.map((pkg) => (
          <div key={pkg.id} className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-full">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className={`w-10 h-10 rounded-xl ${pkg.bg} flex items-center justify-center`}>
                  {pkg.icon}
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Per Lead</p>
                  <p className="text-lg font-bold text-stone-900">${pkg.basePrice}</p>
                </div>
              </div>
              
              <h3 className="font-bold text-lg text-stone-900">{pkg.name}</h3>
              <p className="text-xs text-stone-500 mt-1 mb-4">{pkg.description}</p>

              <div className="space-y-2 mb-6">
                {pkg.features.map((feat) => (
                  <div key={feat} className="flex items-center gap-2 text-xs text-stone-600">
                    <Check className={`w-3 h-3 ${pkg.accent}`} />
                    {feat}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-stone-50 rounded-xl p-4 border border-stone-100">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-medium text-stone-500">Quantity</span>
                <Input 
                  type="number" 
                  min={1}
                  value={quantities[pkg.id]}
                  onChange={(e) => handleQuantityChange(pkg.id, parseInt(e.target.value) || 0)}
                  className="w-20 h-8 text-right font-bold text-stone-900 border-stone-200 bg-white"
                />
              </div>
              
              {/* Preset Buttons */}
              <div className="flex flex-wrap gap-2 mb-4">
                {PRESETS.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => handleQuantityChange(pkg.id, amount)}
                    className={`h-8 min-w-[3rem] px-3 text-xs font-semibold rounded-lg transition-all border
                      ${quantities[pkg.id] === amount 
                        ? 'bg-stone-900 text-white border-stone-900 shadow-md transform scale-105' 
                        : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400 hover:bg-stone-50'
                      }`}
                  >
                    {amount}
                  </button>
                ))}
              </div>
              
              <Slider
                value={[quantities[pkg.id]]}
                max={200}
                min={1}
                step={1}
                onValueChange={(val) => handleQuantityChange(pkg.id, val[0])}
                className="py-2"
              />

              <div className="flex justify-between items-center pt-4 mt-2 border-t border-stone-200">
                <div className="text-xl font-bold text-stone-900">
                  ${(pkg.basePrice * quantities[pkg.id]).toLocaleString()}
                </div>
                <Button size="sm" className="rounded-full bg-stone-900 hover:bg-stone-800 text-white w-8 h-8 p-0 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="pt-4 pb-12">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-stone-800">Recent Activity</h2>
          <Button variant="link" size="sm" className="text-stone-500 hover:text-stone-900 text-xs">View All</Button>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-xs font-bold text-stone-500">
                  #{i}4
                </div>
                <div>
                  <p className="font-semibold text-sm text-stone-900">Standard Lead Bundle</p>
                  <p className="text-xs text-stone-400">March 24, 2024 • 10:42 AM</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">Completed</span>
                <span className="font-bold text-sm text-stone-900">$500.00</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function RootProductsPage() {
  return (
    <div className="flex min-h-screen bg-[#E5E4E2]">
      {/* Sidebar with high z-index to stay on top */}
      <div className="hidden md:block fixed left-0 top-0 h-full z-50">
        <Sidebar />
      </div>
      
      {/* Main Content Area */}
      <main 
        className="flex-1 p-0 min-h-screen relative z-0 transition-[margin] duration-75"
        style={{ marginLeft: 'var(--sidebar-width, 256px)' }}
      >
        <ProductPageContent />
      </main>
    </div>
  );
}

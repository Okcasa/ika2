'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const PACKAGES = [
  {
    id: 'starter',
    name: 'Starter Pack',
    count: 50,
    price: 9,
    originalPrice: 29,
    description: '50 Leads',
    color: 'bg-blue-100 text-blue-600',
    popular: false,
    status: 'Active'
  },
  {
    id: 'growth',
    name: 'Growth Pack',
    count: 100,
    price: 16,
    originalPrice: 49,
    description: '100 Leads',
    color: 'bg-purple-100 text-purple-600',
    popular: true,
    status: 'Active'
  },
  {
    id: 'pro',
    name: 'Pro Bundle',
    count: 250,
    price: 35,
    originalPrice: 99,
    description: '250 Leads',
    color: 'bg-orange-100 text-orange-600',
    popular: false,
    status: 'Active'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    count: 1000,
    price: 120,
    originalPrice: 299,
    description: '1000 Leads',
    color: 'bg-green-100 text-green-600',
    popular: false,
    status: 'Offline'
  },
];

export default function ProductsPage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-0">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#1C1917]">Products</h1>
        <p className="text-stone-500">Available lead packages.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {PACKAGES.map((pkg) => (
           <Card key={pkg.id} className="rounded-[32px] border-none shadow-sm hover:shadow-md transition-shadow bg-[#1C1917] text-[#FAFAF9]">
             <CardContent className="p-8">
               <div className="flex justify-between items-start mb-6">
                 <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${pkg.color}`}>
                    <Package className="h-6 w-6" />
                 </div>
                 <Badge variant={pkg.status === 'Active' ? 'secondary' : 'outline'} className={pkg.status === 'Active' ? 'bg-green-100 text-green-700' : 'border-stone-600 text-stone-400'}>
                   {pkg.status}
                 </Badge>
               </div>

               <h3 className="text-xl font-bold mb-2">{pkg.name}</h3>
               <p className="text-stone-400 mb-6">{pkg.description}</p>

               <div className="flex items-baseline gap-2 mb-6">
                 <span className="text-4xl font-bold">${pkg.price}</span>
                 <span className="text-stone-500 line-through">${pkg.originalPrice}</span>
               </div>

               <div className="w-full py-3 text-center rounded-full bg-[#E5E4E2] text-[#1C1917] font-semibold">
                 {pkg.count} Leads
               </div>
             </CardContent>
           </Card>
        ))}
      </div>
    </div>
  );
}

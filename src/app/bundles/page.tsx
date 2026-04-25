import type { Metadata } from 'next';
import BundlesClientPage from './bundles-client';

export const metadata: Metadata = {
  title: 'Lead Bundles & Pricing - Buy Sales Leads Online',
  description: 'Browse affordable lead bundles for local businesses, SMMA, and B2B sales. Choose from Starter, Growth, Pro, and Enterprise lead packages. Instant delivery.',
  keywords: ['lead bundles', 'buy sales leads', 'lead packages', 'local business leads pricing', 'SMMA lead packages', 'B2B lead bundles', 'cheap leads', 'verified leads'],
  alternates: {
    canonical: 'https://www.ikaleads.site/bundles',
  },
  openGraph: {
    url: 'https://www.ikaleads.site/bundles',
    title: 'Lead Bundles & Pricing - Buy Sales Leads Online | ikaLeads',
    description: 'Browse affordable lead bundles for local businesses, SMMA, and B2B sales. Choose from Starter, Growth, Pro, and Enterprise lead packages.',
    type: 'website',
  },
};

export default function BundlesPage() {
  return <BundlesClientPage />;
}

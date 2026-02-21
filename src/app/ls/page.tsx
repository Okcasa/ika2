'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LeadUploader } from '@/components/lead-uploader';
import { LeadsTable } from '@/components/leads-table';
import { EditLeadDialog } from '@/components/edit-lead-dialog';
import type { Lead, ProcessedLead } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { Briefcase, Lock, ShieldCheck, ArrowRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';

const PAGE_SIZE = 50;
const mapMarketplaceLead = (row: any): ProcessedLead => ({
  id: row.id,
  businessName: row.business_name ?? '',
  phoneNumber: row.phone ?? '',
  website: row.website ?? '',
  businessType: row.business_type ?? 'Unknown',
  correctedBusinessName: row.business_name ?? '',
  correctedPhoneNumber: row.phone ?? '',
  correctedWebsite: row.website ?? '',
  confidenceScore: 1,
  status: 'completed',
  leadStatus: 'new',
  groups: [],
  history: [],
});

const buildMarketplacePayload = (lead: any) => ({
  business_name: lead.correctedBusinessName ?? lead.businessName ?? '',
  contact_name: lead.contactName ?? '',
  email: lead.email ?? '',
  phone: lead.correctedPhoneNumber ?? lead.phoneNumber ?? '',
  address: lead.address ?? '',
  website: lead.correctedWebsite ?? lead.website ?? null,
  business_type: lead.businessType ?? 'Unknown',
});

export default function AdminUploadPage() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [accessKey, setAccessKey] = useState('');
  const [allLeads, setAllLeads] = useState<ProcessedLead[]>([]);
  const [visibleLeads, setVisibleLeads] = useState<ProcessedLead[]>([]);
  const [editingLead, setEditingLead] = useState<ProcessedLead | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const loadMarketplaceLeads = async () => {
    const { data, error } = await supabase
      .from('marketplace_leads')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: "Failed to load leads", description: error.message, variant: "destructive" });
      return;
    }
    const mapped = (data || []).map(mapMarketplaceLead);
    setAllLeads(mapped);
    setVisibleLeads(mapped.slice(0, PAGE_SIZE));
  };

  // Load existing leads on mount
  useEffect(() => {
    loadMarketplaceLeads();
  }, []);

  const handleCheckKey = () => {
    if (accessKey === 'okcasa') { // Simple secret key
      setIsAuthorized(true);
      toast({ title: "Access Granted", description: "Welcome to the Admin Workspace." });
    } else {
      toast({ title: "Access Denied", description: "Invalid admin key.", variant: "destructive" });
    }
  };

  const handleLeadsUpload = async (rawLeads: Lead[]) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: "Sign in required", description: "Please sign in to upload leads.", variant: "destructive" });
      return;
    }

    const processedLeads = rawLeads.map(lead => ({
      ...lead,
      correctedBusinessName: lead.businessName,
      correctedPhoneNumber: lead.phoneNumber,
      correctedWebsite: lead.website,
      businessType: lead.businessType || 'Unknown',
      confidenceScore: 1,
      status: 'completed' as const,
      leadStatus: 'new' as const,
      groups: [],
      history: []
    }));

    const insertPayload = processedLeads.map((lead) => ({
      ...buildMarketplacePayload(lead),
      uploaded_by: session.user.id,
      status: 'available',
    }));

    const { error } = await supabase.from('marketplace_leads').insert(insertPayload);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return;
    }

    await loadMarketplaceLeads();
    toast({
      title: "Upload complete!",
      description: `${rawLeads.length} leads added to the marketplace.`,
    });
  };

  const handleUpdateLead = (updatedLead: ProcessedLead) => {
    const newAllLeads = allLeads.map(lead => lead.id === updatedLead.id ? updatedLead : lead);
    setAllLeads(newAllLeads);
    setVisibleLeads(newAllLeads.slice(0, visibleLeads.length));
    supabase
      .from('marketplace_leads')
      .update(buildMarketplacePayload(updatedLead))
      .eq('id', updatedLead.id);
    setEditingLead(null);
  };

  const handleDeleteLead = (leadId: string) => {
    const newAllLeads = allLeads.filter(lead => lead.id !== leadId);
    setAllLeads(newAllLeads);
    setVisibleLeads(newAllLeads.slice(0, visibleLeads.length));
    supabase.from('marketplace_leads').delete().eq('id', leadId);
  };
  
  const handleReset = () => {
    if (confirm("Are you sure? This will wipe the entire marketplace.")) {
      setAllLeads([]);
      setVisibleLeads([]);
      supabase.from('marketplace_leads').delete().neq('id', '');
      toast({ title: "System Reset", description: "All data cleared." });
    }
  };

  const handleRemoveWithWebsites = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: "Sign in required", description: "Please sign in to remove leads.", variant: "destructive" });
      window.dispatchEvent(new Event('auth:open'));
      return;
    }

    const hasWebsite = (value: string | null) => {
      const v = (value || '').trim().toLowerCase();
      if (!v || v === 'n/a' || v === 'na' || v === 'none') return false;
      return true;
    };

    const idsToDelete: string[] = [];
    const pageSize = 1000;
    let offset = 0;
    while (true) {
      const { data: rows, error: fetchError } = await supabase
        .from('marketplace_leads')
        .select('id, website')
        .eq('uploaded_by', session.user.id)
        .range(offset, offset + pageSize - 1);
      if (fetchError) {
        toast({ title: "Remove failed", description: fetchError.message, variant: "destructive" });
        return;
      }
      const batch = (rows || []).filter((r) => hasWebsite(r.website)).map((r) => r.id);
      idsToDelete.push(...batch);
      if (!rows || rows.length < pageSize) break;
      offset += pageSize;
    }
    if (idsToDelete.length === 0) {
      toast({ title: "No leads removed", description: "No leads with websites found." });
      return;
    }

    const chunkSize = 500;
    for (let i = 0; i < idsToDelete.length; i += chunkSize) {
      const chunk = idsToDelete.slice(i, i + chunkSize);
      const { error } = await supabase
        .from('marketplace_leads')
        .delete()
        .in('id', chunk);
      if (error) {
        toast({ title: "Remove failed", description: error.message, variant: "destructive" });
        return;
      }
    }
    await loadMarketplaceLeads();
    toast({ title: "Leads removed", description: `${idsToDelete.length} leads removed.` });
  };

  const handlePublishNext = async () => {
    if (allLeads.length === 0) {
      toast({ title: "No leads to publish", description: "Upload leads first." });
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: "Sign in required", description: "Please sign in to publish leads.", variant: "destructive" });
      window.dispatchEvent(new Event('auth:open'));
      return;
    }
    // Remove any leads with websites before publishing
    await handleRemoveWithWebsites();

    const { data: rows, error: fetchError } = await supabase
      .from('marketplace_leads')
      .select('id')
      .eq('uploaded_by', session.user.id);
    if (fetchError) {
      toast({ title: "Publish failed", description: fetchError.message, variant: "destructive" });
      return;
    }
    const ids = (rows || []).map((r) => r.id);
    if (ids.length === 0) {
      toast({ title: "No leads to publish", description: "No eligible leads after removing websites." });
      return;
    }
    const { error } = await supabase
      .from('marketplace_leads')
      .update({ status: 'available' })
      .eq('uploaded_by', session.user.id);
    if (error) {
      toast({ title: "Publish failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Leads published", description: "Marketplace leads are now live." });
    router.push('/shop');
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen app-shell-bg app-shell-text flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-xl border border-stone-200 text-center space-y-8">
          <div className="w-20 h-20 bg-stone-900 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-black/20">
            <Lock className="w-10 h-10 text-white" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-stone-900">Admin Access</h1>
            <p className="text-stone-500 text-sm">Enter your secure key to manage lead uploads.</p>
          </div>
          <div className="space-y-4">
            <Input 
              type="password" 
              placeholder="Admin Secret Key" 
              className="h-14 rounded-2xl border-stone-200 bg-stone-50 text-center text-lg font-bold tracking-widest text-stone-900"
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCheckKey()}
            />
            <Button onClick={handleCheckKey} className="w-full h-14 rounded-2xl bg-stone-900 text-white font-bold text-lg hover:bg-stone-800 transition-all">
              Verify Identity
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-shell-bg app-shell-text p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex justify-between items-end">
          <div>
            <div className="flex items-center gap-3 text-stone-400 mb-2">
               <ShieldCheck className="w-5 h-5" />
               <span className="text-xs font-bold uppercase tracking-widest">Secure Admin Workspace</span>
            </div>
            <h1 className="text-4xl font-black">Lead Importer</h1>
          </div>
          <div className="flex gap-4">
             <Button variant="outline" onClick={handleReset} className="rounded-xl border-red-200 text-red-600 hover:bg-red-50">
                <Trash2 className="w-4 h-4 mr-2" /> Reset System
             </Button>
             <Button onClick={() => router.push('/')} className="rounded-xl bg-stone-900 text-white">
                Go to Home <ArrowRight className="w-4 h-4 ml-2" />
             </Button>
          </div>
        </header>

        {allLeads.length === 0 ? (
          <div className="bg-white rounded-[3rem] p-12 border border-stone-200 shadow-sm text-center space-y-8">
             <div className="max-w-md mx-auto space-y-4">
               <Briefcase className="w-12 h-12 text-stone-300 mx-auto" />
               <h2 className="text-2xl font-bold">Ready for Upload</h2>
               <p className="text-stone-500">Drag and drop your lead CSV here to populate the marketplace instantly.</p>
             </div>
             <LeadUploader onLeadsUpload={handleLeadsUpload} />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-[2.5rem] p-4 border border-stone-200 shadow-sm overflow-hidden">
                <LeadsTable
                leads={visibleLeads}
                totalLeads={allLeads.length}
                onEdit={setEditingLead}
                onDelete={handleDeleteLead}
                onReset={handleReset}
                onScan={handleRemoveWithWebsites}
                onLoadMore={() => setVisibleLeads(allLeads.slice(0, visibleLeads.length + PAGE_SIZE))}
                onNext={handlePublishNext}
              />
            </div>
          </div>
        )}

        {editingLead && (
          <EditLeadDialog
            lead={editingLead}
            onSave={handleUpdateLead}
            onOpenChange={(isOpen) => !isOpen && setEditingLead(null)}
          />
        )}
      </div>
    </div>
  );
}

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

const PAGE_SIZE = 50;
const LEADS_KEY = 'ika_leads_data'; // Synchronized key

export default function AdminUploadPage() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [accessKey, setAccessKey] = useState('');
  const [allLeads, setAllLeads] = useState<ProcessedLead[]>([]);
  const [visibleLeads, setVisibleLeads] = useState<ProcessedLead[]>([]);
  const [editingLead, setEditingLead] = useState<ProcessedLead | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  // Load existing leads on mount
  useEffect(() => {
    const saved = localStorage.getItem(LEADS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      setAllLeads(parsed);
      setVisibleLeads(parsed.slice(0, PAGE_SIZE));
    }
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
    
    const combinedLeads = [...allLeads, ...processedLeads];
    setAllLeads(combinedLeads);
    setVisibleLeads(combinedLeads.slice(0, PAGE_SIZE));
    localStorage.setItem(LEADS_STORAGE_KEY_LEGACY, JSON.stringify(combinedLeads)); // Safeguard
    localStorage.setItem(LEADS_KEY, JSON.stringify(combinedLeads));
    
    toast({
      title: "Upload complete!",
      description: `${rawLeads.length} leads added to the marketplace.`,
    });
  };

  // Helper for old key cleanup
  const LEADS_STORAGE_KEY_LEGACY = 'leadsorter_leads';

  const handleUpdateLead = (updatedLead: ProcessedLead) => {
    const newAllLeads = allLeads.map(lead => lead.id === updatedLead.id ? updatedLead : lead);
    setAllLeads(newAllLeads);
    setVisibleLeads(newAllLeads.slice(0, visibleLeads.length));
    localStorage.setItem(LEADS_KEY, JSON.stringify(newAllLeads));
    setEditingLead(null);
  };

  const handleDeleteLead = (leadId: string) => {
    const newAllLeads = allLeads.filter(lead => lead.id !== leadId);
    setAllLeads(newAllLeads);
    setVisibleLeads(newAllLeads.slice(0, visibleLeads.length));
    localStorage.setItem(LEADS_KEY, JSON.stringify(newAllLeads));
  };
  
  const handleReset = () => {
    if (confirm("Are you sure? This will wipe the entire marketplace.")) {
      setAllLeads([]);
      setVisibleLeads([]);
      localStorage.removeItem(LEADS_KEY);
      localStorage.removeItem(LEADS_STORAGE_KEY_LEGACY);
      toast({ title: "System Reset", description: "All data cleared." });
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#E5E4E2] flex items-center justify-center p-4">
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
    <div className="min-h-screen bg-[#E5E4E2] p-8 text-stone-900">
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
                onScan={() => {}} // Placeholder
                onLoadMore={() => setVisibleLeads(allLeads.slice(0, visibleLeads.length + PAGE_SIZE))}
                onNext={() => router.push('/')}
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

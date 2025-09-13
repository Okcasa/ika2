'use client';

import { useState } from 'react';
import { Header } from '@/components/header';
import { LeadUploader } from '@/components/lead-uploader';
import { LeadsTable } from '@/components/leads-table';
import { EditLeadDialog } from '@/components/edit-lead-dialog';
import { processLeadAction } from '@/app/actions';
import type { Lead, ProcessedLead } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [leads, setLeads] = useState<ProcessedLead[]>([]);
  const [editingLead, setEditingLead] = useState<ProcessedLead | null>(null);
  const { toast } = useToast();

  const handleLeadsUpload = async (rawLeads: Lead[]) => {
    const totalLeads = rawLeads.length;

    const processedLeads = rawLeads.map(lead => ({
      ...lead,
      correctedBusinessName: lead.businessName,
      correctedPhoneNumber: lead.phoneNumber,
      correctedWebsite: lead.website,
      businessType: lead.businessType || 'Unknown',
      confidenceScore: 1,
      status: 'completed' as const,
    }));
    
    setLeads(processedLeads);
    
    toast({
      title: "Upload complete!",
      description: `${totalLeads} leads have been loaded.`,
      className: 'bg-accent text-accent-foreground border-accent'
    });
  };

  const handleUpdateLead = (updatedLead: ProcessedLead) => {
    setLeads(leads.map(lead => lead.id === updatedLead.id ? updatedLead : lead));
    setEditingLead(null);
    toast({
        title: "Lead Updated",
        description: `${updatedLead.correctedBusinessName} has been saved.`,
        className: 'bg-accent text-accent-foreground border-accent'
    })
  };

  const handleDeleteLead = (leadId: string) => {
    setLeads(leads.filter(lead => lead.id !== leadId));
    toast({
      title: "Lead Deleted",
      description: "The lead has been removed from the list.",
    });
  };
  
  const handleReset = () => {
    setLeads([]);
  }

  const handleScanForWebsites = () => {
    const originalCount = leads.length;
    const filteredLeads = leads.filter(lead => !lead.correctedWebsite || lead.correctedWebsite.trim() === '');
    const removedCount = originalCount - filteredLeads.length;
    setLeads(filteredLeads);
    toast({
      title: 'Scan complete!',
      description: `Removed ${removedCount} leads with websites.`,
      className: 'bg-accent text-accent-foreground border-accent'
    });
  };

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow container mx-auto px-4 py-8">
        <Header />
        <div className="mt-8 max-w-7xl mx-auto">
          {leads.length === 0 && (
            <LeadUploader onLeadsUpload={handleLeadsUpload} />
          )}
          
          {leads.length > 0 && (
            <LeadsTable
              leads={leads}
              onEdit={setEditingLead}
              onDelete={handleDeleteLead}
              onReset={handleReset}
              onScan={handleScanForWebsites}
            />
          )}
        </div>
        
        {editingLead && (
          <EditLeadDialog
            lead={editingLead}
            onSave={handleUpdateLead}
            onOpenChange={(isOpen) => !isOpen && setEditingLead(null)}
          />
        )}
      </main>
      <footer className="text-center py-4">
        <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} LeadSorter Pro. All rights reserved.</p>
      </footer>
    </div>
  );
}

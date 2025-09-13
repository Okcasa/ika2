'use client';

import { useState } from 'react';
import { Header } from '@/components/header';
import { LeadUploader } from '@/components/lead-uploader';
import { LeadsTable } from '@/components/leads-table';
import { EditLeadDialog } from '@/components/edit-lead-dialog';
import { processLeadAction } from '@/app/actions';
import type { Lead, ProcessedLead } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

export default function Home() {
  const [leads, setLeads] = useState<ProcessedLead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [editingLead, setEditingLead] = useState<ProcessedLead | null>(null);
  const { toast } = useToast();

  const handleLeadsUpload = async (rawLeads: Lead[]) => {
    setIsLoading(true);
    setLeads([]);
    setProgress(0);
    const totalLeads = rawLeads.length;

    const initialLeads = rawLeads.map(lead => ({
      ...lead,
      correctedBusinessName: lead.businessName,
      correctedPhoneNumber: lead.phoneNumber,
      correctedWebsite: lead.website,
      businessType: lead.businessType || 'Processing...',
      confidenceScore: lead.businessType ? 1 : 0,
      status: 'processing' as const,
    }));
    setLeads(initialLeads);

    const processQueue = rawLeads.map(async (lead, index) => {
      try {
        const result = await processLeadAction(lead);
        setLeads(prev => {
          const newLeads = [...prev];
          newLeads[index] = result;
          return newLeads;
        });
        if (result.status === 'error') {
           toast({
            variant: "destructive",
            title: `Error processing ${result.businessName}`,
            description: result.errorMessage,
          });
        }
      } catch (e) {
        setLeads(prev => {
          const newLeads = [...prev];
          newLeads[index] = {
            ...lead,
            correctedBusinessName: lead.businessName,
            correctedPhoneNumber: lead.phoneNumber,
            correctedWebsite: lead.website,
            businessType: 'Error',
            confidenceScore: 0,
            status: 'error',
            errorMessage: e instanceof Error ? e.message : 'Failed to process',
          };
          return newLeads;
        });
      } finally {
        setProgress(p => p + (100 / totalLeads));
      }
    });

    await Promise.all(processQueue);
    
    setIsLoading(false);
    setProgress(100);
    toast({
      title: "Processing complete!",
      description: `${totalLeads} leads have been processed.`,
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
    setIsLoading(false);
    setProgress(0);
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
          {leads.length === 0 && !isLoading && (
            <LeadUploader onLeadsUpload={handleLeadsUpload} />
          )}
          
          {isLoading && (
            <div className="flex flex-col items-center gap-4 p-8 bg-card rounded-lg shadow-sm">
              <p className="font-semibold text-primary">Processing your leads...</p>
              <p className="text-sm text-muted-foreground">Please wait while our AI corrects and classifies your data.</p>
              <Progress value={progress} className="w-full max-w-md" />
              <p className="font-mono text-sm font-bold text-primary">{Math.round(progress)}%</p>
            </div>
          )}

          {leads.length > 0 && (
            <LeadsTable
              leads={leads}
              onEdit={setEditingLead}
              onDelete={handleDeleteLead}
              onReset={handleReset}
              onScan={handleScanForWebsites}
              isScanning={isLoading}
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

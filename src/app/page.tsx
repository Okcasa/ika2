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
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function Home() {
  const [leads, setLeads] = useState<ProcessedLead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [editingLead, setEditingLead] = useState<ProcessedLead | null>(null);
  const [useAI, setUseAI] = useState(true);
  const { toast } = useToast();

  const handleLeadsUpload = async (rawLeads: Lead[]) => {
    setIsLoading(true);
    setLeads([]);
    setProgress(0);
    const totalLeads = rawLeads.length;

    if (!useAI) {
      const nonAiLeads: ProcessedLead[] = rawLeads.map(lead => ({
        ...lead,
        correctedBusinessName: lead.businessName,
        correctedPhoneNumber: lead.phoneNumber,
        correctedWebsite: lead.website,
        businessType: 'Unknown',
        confidenceScore: 0,
        status: 'completed',
      }));
      setLeads(nonAiLeads);
      setIsLoading(false);
      setProgress(100);
      toast({
        title: "Leads Loaded",
        description: `${totalLeads} leads have been loaded without AI processing.`,
      });
      return;
    }
    
    const initialLeads = rawLeads.map(lead => ({
      ...lead,
      correctedBusinessName: lead.businessName,
      correctedPhoneNumber: lead.phoneNumber,
      correctedWebsite: lead.website,
      businessType: 'Processing...',
      confidenceScore: 0,
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

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow container mx-auto px-4 py-8">
        <Header />
        <div className="mt-8 max-w-7xl mx-auto">
          {leads.length === 0 && !isLoading && (
            <>
              <div className="flex items-center justify-center space-x-2 mb-4">
                <Switch id="ai-toggle" checked={useAI} onCheckedChange={setUseAI} />
                <Label htmlFor="ai-toggle">Enable AI Processing</Label>
              </div>
              <LeadUploader onLeadsUpload={handleLeadsUpload} />
            </>
          )}
          
          {isLoading && (
            <div className="flex flex-col items-center gap-4 p-8 bg-card rounded-lg shadow-sm">
              <p className="font-semibold text-primary">{useAI ? 'Processing your leads...' : 'Loading your leads...'}</p>
              <p className="text-sm text-muted-foreground">{useAI ? 'Please wait while our AI corrects and classifies your data.' : 'Please wait while your leads are being loaded.'}</p>
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

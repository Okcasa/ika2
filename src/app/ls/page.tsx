'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { LeadUploader } from '@/components/lead-uploader';
import { LeadsTable } from '@/components/leads-table';
import { EditLeadDialog } from '@/components/edit-lead-dialog';
import type { Lead, ProcessedLead } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Briefcase } from 'lucide-react';

const PAGE_SIZE = 50;
const LEADS_KEY = 'leadsorter_leads';

export default function Home() {
  const [allLeads, setAllLeads] = useState<ProcessedLead[]>([]);
  const [visibleLeads, setVisibleLeads] = useState<ProcessedLead[]>([]);
  const [editingLead, setEditingLead] = useState<ProcessedLead | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const heroImage = PlaceHolderImages.find(p => p.id === 'hero-background');


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
      leadStatus: 'new' as const,
    }));
    
    setAllLeads(processedLeads);
    setVisibleLeads(processedLeads.slice(0, PAGE_SIZE));
    localStorage.setItem(LEADS_KEY, JSON.stringify(processedLeads));
    
    toast({
      title: "Upload complete!",
      description: `${totalLeads} leads have been loaded.`,
    });
  };
  
  const loadMoreLeads = () => {
    const currentLength = visibleLeads.length;
    const nextLeads = allLeads.slice(currentLength, currentLength + PAGE_SIZE);
    setVisibleLeads([...visibleLeads, ...nextLeads]);
  };

  const handleUpdateLead = (updatedLead: ProcessedLead) => {
    const newAllLeads = allLeads.map(lead => lead.id === updatedLead.id ? updatedLead : lead);
    const newVisibleLeads = visibleLeads.map(lead => lead.id === updatedLead.id ? updatedLead : lead);

    setAllLeads(newAllLeads);
    setVisibleLeads(newVisibleLeads);
localStorage.setItem(LEADS_KEY, JSON.stringify(newAllLeads));
    
    setEditingLead(null);
    toast({
        title: "Lead Updated",
        description: `${updatedLead.correctedBusinessName} has been saved.`,
    })
  };

  const handleDeleteLead = (leadId: string) => {
    const newAllLeads = allLeads.filter(lead => lead.id !== leadId);
    const newVisibleLeads = visibleLeads.filter(lead => lead.id !== leadId);

    setAllLeads(newAllLeads);
    setVisibleLeads(newVisibleLeads);
    localStorage.setItem(LEADS_KEY, JSON.stringify(newAllLeads));
    
    toast({
      title: "Lead Deleted",
      description: "The lead has been removed from the list.",
    });
  };
  
  const handleReset = () => {
    setAllLeads([]);
    setVisibleLeads([]);
    localStorage.removeItem(LEADS_KEY);
    localStorage.removeItem('leadsorter_dispensed_leads');
  }

  const handleScanForWebsites = () => {
    const filteredLeads = allLeads.filter(lead => !lead.correctedWebsite || lead.correctedWebsite.trim() === '');
    const removedCount = allLeads.length - filteredLeads.length;
    setAllLeads(filteredLeads);
    setVisibleLeads(filteredLeads.slice(0, PAGE_SIZE));
    localStorage.setItem(LEADS_KEY, JSON.stringify(filteredLeads));
    toast({
      title: 'Scan complete!',
      description: `Removed ${removedCount} leads with websites.`,
    });
  };

  const handleNext = () => {
    try {
        localStorage.setItem(LEADS_KEY, JSON.stringify(allLeads));
        toast({
            title: "Leads Saved!",
            description: "Your leads have been saved. You're being redirected to the dashboard.",
        });
        router.push('/dashboard');
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Failed to save leads",
            description: error instanceof Error ? error.message : "There was an error saving your leads to the browser storage.",
        });
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow">
         {allLeads.length === 0 ? (
          <>
            {heroImage && (
              <div className="relative h-64 w-full">
                  <Image 
                      src={heroImage.imageUrl}
                      alt={heroImage.description}
                      data-ai-hint={heroImage.imageHint}
                      fill
                      style={{objectFit: "cover"}}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
              </div>
            )}
            <div className="container mx-auto px-4 -mt-32">
                <div className="flex flex-col items-center justify-center gap-4 text-center">
                    <Briefcase className="h-12 w-12 text-primary" />
                    <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl font-headline">
                      Team Workspace
                    </h1>
                    <p className="mt-2 text-lg text-muted-foreground max-w-2xl mx-auto">
                      Upload your CSV to sort, review, and clean your business leads instantly.
                    </p>
                </div>
                <LeadUploader onLeadsUpload={handleLeadsUpload} />
            </div>
          </>
        ) : (
          <div className="container mx-auto px-4 py-8">
            <LeadsTable
              leads={visibleLeads}
              totalLeads={allLeads.length}
              onEdit={setEditingLead}
              onDelete={handleDeleteLead}
              onReset={handleReset}
              onScan={handleScanForWebsites}
              onLoadMore={loadMoreLeads}
              onNext={handleNext}
            />
          </div>
        )}
        
        {editingLead && (
          <EditLeadDialog
            lead={editingLead}
            onSave={handleUpdateLead}
            onOpenChange={(isOpen) => !isOpen && setEditingLead(null)}
          />
        )}
      </main>
      <footer className="text-center py-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Workspace. All rights reserved.</p>
      </footer>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ProcessedLead } from '@/lib/types';
import { Phone, Building, Globe } from 'lucide-react';

const LEADS_KEY = 'leadsorter_leads';
const VIEWED_LEADS_COUNT_KEY = 'leadsorter_viewed_count';

export default function DashboardPage() {
  const [allLeads, setAllLeads] = useState<ProcessedLead[]>([]);
  const [dispensedLeads, setDispensedLeads] = useState<ProcessedLead[]>([]);
  const [viewedCount, setViewedCount] = useState(0);

  useEffect(() => {
    // This effect runs only on the client side
    const storedLeads = localStorage.getItem(LEADS_KEY);
    if (storedLeads) {
      setAllLeads(JSON.parse(storedLeads));
    }
    const storedCount = localStorage.getItem(VIEWED_LEADS_COUNT_KEY);
    if (storedCount) {
      setViewedCount(parseInt(storedCount, 10));
    }
  }, []);

  const getLeads = () => {
    const remainingLeads = allLeads.slice(viewedCount);
    const leadsToDispense = remainingLeads.slice(0, 20);
    setDispensedLeads(leadsToDispense);
    
    const newViewedCount = viewedCount + leadsToDispense.length;
    setViewedCount(newViewedCount);
    localStorage.setItem(VIEWED_LEADS_COUNT_KEY, newViewedCount.toString());
  };
  
  const resetProgress = () => {
    setViewedCount(0);
    setDispensedLeads([]);
    localStorage.setItem(VIEWED_LEADS_COUNT_KEY, '0');
  }

  const leadsRemaining = allLeads.length - viewedCount;

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow container mx-auto px-4 py-8">
        <Header />
        <div className="mt-8 max-w-7xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Your Lead Dispenser</CardTitle>
              <CardDescription>
                Get your next batch of leads to contact. You have {leadsRemaining > 0 ? leadsRemaining : 0} leads remaining.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-center">
                <Button onClick={getLeads} disabled={leadsRemaining <= 0}>Get 20 Leads</Button>
                <Button variant="outline" onClick={resetProgress}>Reset Progress</Button>
              </div>

              {dispensedLeads.length > 0 && (
                <div className="mt-8">
                    <h3 className="text-xl font-semibold mb-4">Your 20 Leads for Today</h3>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Business Name</TableHead>
                                    <TableHead>Phone Number</TableHead>
                                    <TableHead>Website</TableHead>
                                    <TableHead>Business Type</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {dispensedLeads.map(lead => (
                                    <TableRow key={lead.id}>
                                        <TableCell className="font-medium">{lead.correctedBusinessName}</TableCell>
                                        <TableCell>
                                            <a href={`tel:${lead.correctedPhoneNumber}`} className="flex items-center gap-2 hover:text-primary">
                                                <Phone className="h-4 w-4" />
                                                {lead.correctedPhoneNumber}
                                            </a>
                                        </TableCell>
                                        <TableCell>
                                            {lead.correctedWebsite ? (
                                                <a href={lead.correctedWebsite.startsWith('http') ? lead.correctedWebsite : `https://${lead.correctedWebsite}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 underline hover:text-primary">
                                                    <Globe className="h-4 w-4" />
                                                    Visit Website
                                                </a>
                                            ) : <span className="text-muted-foreground">N/A</span>}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Building className="h-4 w-4 text-muted-foreground" />
                                                {lead.businessType}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <footer className="text-center py-4">
        <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} LeadSorter Pro. All rights reserved.</p>
      </footer>
    </div>
  );
}

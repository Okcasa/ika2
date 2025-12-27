'use client';

import { useState, useEffect, useMemo } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Phone, 
  Mail, 
  ArrowUpRight, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  XCircle,
  FileEdit,
  History,
  Calculator
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Storage Key
const LEADS_STORAGE_KEY = 'ika_leads_data';

function LeadsPageContent() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  // Use a debounced search term to prevent lagging while typing
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [leads, setLeads] = useState<any[]>([]);
  const [closingLead, setClosingLead] = useState<any>(null);
  const [editingLead, setEditingLead] = useState<any>(null);
  const [closeAmount, setCloseAmount] = useState('');
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Optimized Load from Storage
  useEffect(() => {
    // Load data in a non-blocking way
    const loadData = () => {
      try {
        const saved = localStorage.getItem(LEADS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setLeads(parsed);
        }
      } catch (e) {
        console.error("Failed to load leads", e);
      }
    };
    
    // Use requestAnimationFrame to let the UI paint first
    requestAnimationFrame(() => {
      setTimeout(loadData, 0);
    });
  }, []);

  // Calculate Smart Projections - Memoized
  const stats = useMemo(() => {
    // Create a quick summary without iterating multiple times if possible
    let closedCount = 0;
    let activeCount = 0;
    let totalClosedValue = 0;

    for (const l of leads) {
      const isClosed = l.status === 'Closed' || l.status === 'Closed Deal';
      
      if (isClosed) {
        closedCount++;
        totalClosedValue += (parseFloat(l.value.replace(/[$,]/g, '')) || 0);
      } else if (l.status !== 'Not Interested') {
        activeCount++;
      }
    }

    const averageDealValue = closedCount > 0 ? totalClosedValue / closedCount : 0;
    const projectedRevenue = totalClosedValue + (activeCount * averageDealValue);

    return {
      totalClosedValue,
      averageDealValue,
      projectedRevenue,
      closedCount,
      activeCount
    };
  }, [leads]);

  const handleCloseDeal = () => {
    if (!closingLead || !closeAmount) return;

    const updatedLeads = leads.map(l => 
      l.id === closingLead.id 
        ? { ...l, status: 'Closed', value: `$${parseFloat(closeAmount).toLocaleString()}`, color: 'bg-emerald-100 text-emerald-700' } 
        : l
    );

    setLeads(updatedLeads);
    localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(updatedLeads));

    toast({
      title: "Deal Closed!",
      description: `Successfully closed ${closingLead.name} for $${closeAmount}`,
    });

    setIsCloseDialogOpen(false);
    setClosingLead(null);
    setCloseAmount('');
  };

  const handleEditSave = () => {
    if (!editingLead) return;

    const updatedLeads = leads.map(l => 
      l.id === editingLead.id ? editingLead : l
    );

    setLeads(updatedLeads);
    localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(updatedLeads));

    toast({
      title: "Lead Updated",
      description: `Successfully updated ${editingLead.name}`,
    });

    setIsEditDialogOpen(false);
    setEditingLead(null);
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Memoize filtered leads to avoid re-calculation on every render
  const filteredLeads = useMemo(() => {
    if (!debouncedSearch) return leads;
    
    const lowerSearch = debouncedSearch.toLowerCase();
    return leads.filter(lead => 
      (lead.name || lead.businessName || '').toLowerCase().includes(lowerSearch) || 
      (lead.company || lead.businessName || '').toLowerCase().includes(lowerSearch)
    );
  }, [leads, debouncedSearch]);

  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const paginatedLeads = filteredLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  // Reset to page 1 if search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="p-8 space-y-8 bg-[#E5E4E2] min-h-screen text-stone-900 select-none">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-900">Leads</h1>
          <p className="text-stone-500 mt-1">Manage your lead pipeline and close deals.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="bg-white border-stone-200 text-stone-600 hover:bg-stone-50">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button className="bg-stone-900 text-white hover:bg-stone-800">
            <ArrowUpRight className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm relative overflow-hidden group">
          <div className="absolute right-4 top-4 p-2 bg-stone-50 rounded-full text-stone-300 group-hover:text-stone-900 transition-colors">
            <Calculator className="w-4 h-4" />
          </div>
          <p className="text-sm font-medium text-stone-500 uppercase tracking-wider">Projected Revenue</p>
          <p className="text-3xl font-black text-stone-900 mt-2">${stats.projectedRevenue.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</p>
          <div className="flex items-center mt-4 text-[10px] font-bold text-stone-400 gap-2">
            <span className="bg-stone-100 px-2 py-1 rounded-full text-stone-600 uppercase tracking-widest">
              Avg: ${stats.averageDealValue.toLocaleString(undefined, {maximumFractionDigits: 0})}
            </span>
            <span>Based on {stats.closedCount} deals</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <p className="text-sm font-medium text-stone-500 uppercase tracking-wider">Active Pipeline</p>
          <p className="text-3xl font-black text-stone-900 mt-2">{stats.activeCount}</p>
          <div className="flex items-center mt-4 text-xs font-medium text-stone-500 bg-stone-100 w-fit px-2 py-1 rounded-full">
            Ready to close
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <p className="text-sm font-medium text-stone-500 uppercase tracking-wider">Closed Value</p>
          <p className="text-3xl font-black text-stone-900 mt-2">${stats.totalClosedValue.toLocaleString()}</p>
          <div className="flex items-center mt-4 text-[10px] font-bold text-stone-900 bg-stone-100 w-fit px-2.5 py-1 rounded-full uppercase tracking-widest">
             Closing Rate: {leads.length > 0 ? ((stats.closedCount / leads.length) * 100).toFixed(0) : 0}%
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        {/* Table Controls */}
        <div className="p-6 border-b border-stone-100 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <Input 
              placeholder="Search leads..." 
              className="pl-10 bg-stone-50 border-stone-200 focus:bg-white transition-colors h-11 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-stone-100 h-14">
              <TableHead className="w-[280px] pl-6 text-xs font-bold uppercase tracking-wider text-stone-400">Lead</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-stone-400">Status</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-stone-400">Scheduled</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-stone-400">Value</TableHead>
              <TableHead className="text-right pr-6 text-xs font-bold uppercase tracking-wider text-stone-400">Quick Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedLeads.map((lead) => (
              <TableRow key={lead.id} className="hover:bg-stone-50/50 border-stone-100 transition-colors group">
                <TableCell className="pl-6 py-5">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10 border border-stone-100 shadow-sm">
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${lead.name || lead.businessName}`} />
                      <AvatarFallback>{lead.avatar || lead.businessName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-stone-900">{lead.name || lead.businessName}</p>
                      <p className="text-[11px] font-medium text-stone-400 uppercase tracking-tight">{lead.company || lead.businessName}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={`font-bold border-0 px-3 py-1 rounded-full text-[11px] shadow-sm transition-colors cursor-default ${
                    lead.status === 'Closed' || lead.status === 'Closed Deal' ? 'bg-green-100 text-green-700 hover:bg-green-500 hover:text-white' :
                    lead.status === 'Not Interested' ? 'bg-red-100 text-red-700 hover:bg-red-500 hover:text-white' :
                    lead.status === 'No Answer' || lead.status === 'Follow Up' ? 'bg-amber-100 text-amber-700 hover:bg-amber-500 hover:text-white' :
                    lead.status === 'Meeting Scheduled' || lead.status === 'Scheduled' ? 'bg-purple-100 text-purple-700 hover:bg-purple-500 hover:text-white' :
                    (lead.color || 'bg-stone-100 text-stone-600') + ' hover:bg-stone-200'
                  }`}>
                    {lead.status}
                  </Badge>
                </TableCell>
                <TableCell>
                   <div className="flex items-center gap-2 text-xs font-medium text-stone-500">
                     <CalendarIcon className="h-3 w-3" />
                     {lead.scheduledDate}
                   </div>
                </TableCell>
                <TableCell className="font-bold text-stone-700">{lead.value}</TableCell>
                <TableCell className="text-right pr-6">
                  <div className="flex items-center justify-end gap-1">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-9 w-9 rounded-full hover:bg-white hover:shadow-sm text-stone-400 hover:text-stone-900 transition-all"
                      onClick={() => router.push('/logs')}
                    >
                      <History className="w-4 h-4" />
                    </Button>

                    <Dialog open={isEditDialogOpen && editingLead?.id === lead.id} onOpenChange={(open) => {
                        setIsEditDialogOpen(open);
                        if(open) setEditingLead({...lead});
                    }}>
                      <DialogTrigger asChild>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-9 w-9 rounded-full hover:bg-white hover:shadow-sm text-stone-400 hover:text-stone-900 transition-all"
                        >
                          <FileEdit className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-bold">Edit Lead Info</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-6 py-6">
                          <div className="space-y-2">
                            <Label htmlFor="edit-name" className="text-stone-500 font-bold uppercase text-[10px] tracking-widest">Full Name</Label>
                            <Input
                              id="edit-name"
                              value={editingLead?.name || editingLead?.businessName || ''}
                              onChange={(e) => setEditingLead({...editingLead, name: e.target.value})}
                              className="h-12 bg-stone-50 border-stone-200 text-stone-900 font-semibold"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-company" className="text-stone-500 font-bold uppercase text-[10px] tracking-widest">Company</Label>
                            <Input
                              id="edit-company"
                              value={editingLead?.company || editingLead?.businessName || ''}
                              onChange={(e) => setEditingLead({...editingLead, company: e.target.value})}
                              className="h-12 bg-stone-50 border-stone-200 text-stone-900 font-semibold"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={handleEditSave} className="w-full h-12 bg-stone-900 text-white font-bold text-lg rounded-xl transition-all shadow-lg hover:bg-stone-800">
                            Save Changes
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    
                    {lead.status !== 'Closed' && lead.status !== 'Closed Deal' && lead.status !== 'Not Interested' && (
                      <Dialog open={isCloseDialogOpen && closingLead?.id === lead.id} onOpenChange={(open) => {
                        setIsCloseDialogOpen(open);
                        if(open) setClosingLead(lead);
                      }}>
                        <DialogTrigger asChild>
                          <Button size="sm" className="ml-2 h-9 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 font-bold shadow-sm shadow-emerald-600/20">
                            Close Deal
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle className="text-2xl font-bold">Close Deal: {lead.name || lead.businessName}</DialogTitle>
                          </DialogHeader>
                          <div className="grid gap-6 py-6">
                            <div className="space-y-2">
                              <Label htmlFor="amount" className="text-stone-500 font-bold uppercase text-[10px] tracking-widest">Final Sale Amount</Label>
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-stone-400">$</span>
                                <Input
                                  id="amount"
                                  type="number"
                                  value={closeAmount}
                                  onChange={(e) => setCloseAmount(e.target.value)}
                                  placeholder="0.00"
                                  className="pl-8 h-12 text-lg font-bold bg-stone-50 border-stone-200 text-stone-900"
                                />
                              </div>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button onClick={handleCloseDeal} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg rounded-xl transition-all shadow-lg shadow-emerald-600/20">
                              Confirm Sale
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {/* Pagination */}
        <div className="p-6 border-t border-stone-100 flex justify-between items-center bg-stone-50/30">
          <div className="text-xs font-bold text-stone-400 uppercase tracking-widest">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs font-bold bg-white text-stone-700 border-stone-200 hover:bg-stone-50 hover:text-stone-900 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs font-bold bg-stone-900 text-white border-stone-900 hover:bg-stone-800 hover:text-white disabled:opacity-50 disabled:bg-stone-300 disabled:border-stone-300 disabled:cursor-not-allowed"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RootLeadsPage() {
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
        <LeadsPageContent />
      </main>
    </div>
  );
}

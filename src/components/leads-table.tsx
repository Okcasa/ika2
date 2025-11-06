'use client';

import { useState, useEffect, useRef } from 'react';
import { Download, Edit, Trash2, RotateCcw, Loader2, ScanSearch, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { ProcessedLead } from '@/lib/types';
import { cn } from '@/lib/utils';

interface LeadsTableProps {
  leads: ProcessedLead[];
  totalLeads: number;
  onEdit: (lead: ProcessedLead) => void;
  onDelete: (leadId: string) => void;
  onReset: () => void;
  onScan: () => void;
  isScanning?: boolean;
  onLoadMore: () => void;
  onNext: () => void;
}

export function LeadsTable({ leads, totalLeads, onEdit, onDelete, onReset, onScan, isScanning, onLoadMore, onNext }: LeadsTableProps) {
  const [isFloating, setIsFloating] = useState(false);
  const cardHeaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsFloating(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '-80px 0px 0px 0px' } 
    );

    if (cardHeaderRef.current) {
      observer.observe(cardHeaderRef.current);
    }

    return () => {
      if (cardHeaderRef.current) {
        observer.unobserve(cardHeaderRef.current);
      }
    };
  }, []);

  const handleScanClick = () => {
    onScan();
    setIsFloating(false); 
  };
  
  const downloadCSV = () => {
    const headers = ['businessName', 'phoneNumber', 'website', 'businessType'];
    const csvContent = [
      headers.join(','),
      ...leads
        .filter(lead => lead.status === 'completed')
        .map(lead => [
          `"${lead.correctedBusinessName.replace(/"/g, '""')}"`,
          `"${lead.correctedPhoneNumber.replace(/"/g, '""')}"`,
          `"${lead.correctedWebsite.replace(/"/g, '""')}"`,
          `"${lead.businessType.replace(/"/g, '""')}"`,
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.href) {
      URL.revokeObjectURL(link.href);
    }
    link.href = URL.createObjectURL(blob);
    link.download = `leads-corrected-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const getStatusBadge = (status: ProcessedLead['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="secondary" className="bg-green-500/10 border-green-500/20 text-green-400">Completed</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return null;
    }
  }

  const ActionButtons = ({ isFloatingButtons = false }: { isFloatingButtons?: boolean }) => (
    <div className={cn(
      "flex flex-wrap gap-2 w-full sm:w-auto",
      isFloatingButtons && "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-background/80 backdrop-blur-sm p-2 rounded-xl border shadow-lg"
    )}>
      <Button variant="outline" size="sm" onClick={onReset} className="flex-1 sm:flex-none">
        <RotateCcw className="mr-2 h-4 w-4" />
        Start Over
      </Button>
      <Button variant="outline" size="sm" onClick={handleScanClick} disabled={isScanning} className="flex-1 sm:flex-none">
        <ScanSearch className="mr-2 h-4 w-4" />
        Remove with websites
      </Button>
      <Button size="sm" onClick={downloadCSV} className="flex-1 sm:flex-none">
        <Download className="mr-2 h-4 w-4" />
        Download CSV
      </Button>
      <Button size="sm" onClick={onNext} className="flex-1 sm:flex-none">
        Next
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );

  const hasMoreLeads = leads.length < totalLeads;

  return (
    <Card className="animate-in fade-in duration-500 shadow-lg">
      <CardHeader ref={cardHeaderRef} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
            <CardTitle>2. Review & Download</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Review the data, edit as needed, and download your clean list.</p>
        </div>
        <ActionButtons />
      </CardHeader>

      {isFloating && !isScanning && <ActionButtons isFloatingButtons />}

      <CardContent>
        <TooltipProvider>
          <div className="overflow-x-auto border rounded-lg shadow-inner">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Business Name</TableHead>
                  <TableHead className="min-w-[150px]">Phone Number</TableHead>
                  <TableHead className="min-w-[200px]">Website</TableHead>
                  <TableHead>Business Type</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id} className={cn("h-[60px]")}>
                    <TableCell className="font-medium font-code">{lead.correctedBusinessName}</TableCell>
                    <TableCell className="font-code">{lead.correctedPhoneNumber}</TableCell>
                    <TableCell className="font-code text-sm">
                      {lead.correctedWebsite ? (
                        <a href={lead.correctedWebsite.startsWith('http') ? lead.correctedWebsite : `https://${lead.correctedWebsite}`} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary truncate block max-w-xs">
                          {lead.correctedWebsite}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{lead.businessType}</Badge>
                    </TableCell>
                    <TableCell className="flex justify-center items-center h-[60px]">
                      {lead.status === 'error' && lead.errorMessage ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>{getStatusBadge(lead.status)}</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">{lead.errorMessage}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : getStatusBadge(lead.status)}
                    </TableCell>
                    <TableCell className="text-right">
                       <div className="flex items-center justify-end gap-2">
                        <>
                          <Button variant="ghost" size="icon" onClick={() => onEdit(lead)}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive/70 hover:text-destructive" onClick={() => onDelete(lead.id)}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TooltipProvider>
      </CardContent>
      {hasMoreLeads && (
        <CardFooter className="flex-col items-stretch gap-4 border-t px-6 py-4">
            <div className="flex items-center justify-center">
                <Button onClick={onLoadMore}>Show More</Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
                Showing {leads.length} of {totalLeads} leads
            </p>
        </CardFooter>
      )}
    </Card>
  );
}

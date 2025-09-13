'use client';

import { Download, Edit, Trash2, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface LeadsTableProps {
  leads: ProcessedLead[];
  onEdit: (lead: ProcessedLead) => void;
  onDelete: (leadId: string) => void;
  onReset: () => void;
}

export function LeadsTable({ leads, onEdit, onDelete, onReset }: LeadsTableProps) {
  
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
        return <Badge variant="secondary" className="bg-accent/20 border border-accent/30 text-green-800 dark:text-green-300">Completed</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'processing':
        return (
          <Badge variant="outline" className="flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" />
            Processing
          </Badge>
        );
      default:
        return null;
    }
  }

  return (
    <Card className="animate-in fade-in duration-500">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
            <CardTitle>2. Review & Download</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Review the AI-corrected data, edit as needed, and download your clean list.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
           <Button variant="outline" size="sm" onClick={onReset} className="flex-1 sm:flex-none">
            <RotateCcw className="mr-2 h-4 w-4" />
            Start Over
          </Button>
          <Button size="sm" onClick={downloadCSV} className="flex-1 sm:flex-none">
            <Download className="mr-2 h-4 w-4" />
            Download CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="overflow-x-auto border rounded-lg">
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
                  <TableRow key={lead.id} className="h-[60px]">
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
                        <Button variant="ghost" size="icon" onClick={() => onEdit(lead)}>
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive/70 hover:text-destructive" onClick={() => onDelete(lead.id)}>
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}

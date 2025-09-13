'use client';

import { useState, useRef } from 'react';
import { UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Lead } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";

interface LeadUploaderProps {
  onLeadsUpload: (leads: Lead[]) => void;
}

export function LeadUploader({ onLeadsUpload }: LeadUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file && file.type === 'text/csv') {
      processFile(file);
    } else {
      toast({
        variant: "destructive",
        title: "Invalid File Type",
        description: "Please upload a valid .csv file.",
      });
    }
  };
  
  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        toast({ variant: "destructive", title: "Error Reading File", description: "Could not read the file content." });
        return;
      }
      
      try {
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) throw new Error("CSV must have a header and at least one data row.");

        const headerLine = lines.shift()!.toLowerCase();
        const headers = headerLine.split(',').map(h => h.trim().replace(/"/g, ''));
        
        const nameIndex = headers.findIndex(h => h.includes('name'));
        const phoneIndex = headers.findIndex(h => h.includes('phone'));
        const websiteIndex = headers.findIndex(h => h.includes('website') || h.includes('url'));
        const businessTypeIndex = headers.findIndex(h => h.includes('businesstype') || h.includes('business type'));
        
        if (nameIndex === -1 || phoneIndex === -1) {
          throw new Error("CSV must contain 'name' and 'phone' columns.");
        }
        
        const leadsData: Lead[] = lines.map((line, index) => {
          const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); // Handle commas inside quotes
          
          let website = websiteIndex !== -1 ? (values[websiteIndex]?.trim().replace(/"/g, '') || '') : '';
          let businessType = businessTypeIndex !== -1 ? (values[businessTypeIndex]?.trim().replace(/"/g, '') || undefined) : undefined;
          
          if(website && !website.includes('http') && !website.includes('www')) {
            if (!businessType) { // only move if businessType is not already set from its own column
              businessType = website;
            }
            website = '';
          }

          return {
            id: `lead-${index}-${Date.now()}`,
            businessName: values[nameIndex]?.trim().replace(/"/g, '') || '',
            phoneNumber: values[phoneIndex]?.trim().replace(/"/g, '') || '',
            website: website,
            businessType: businessType,
          };
        }).filter(lead => lead.businessName && lead.phoneNumber);

        if (leadsData.length === 0) {
          throw new Error("No valid leads found in the file.");
        }

        onLeadsUpload(leadsData);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "CSV Parsing Error",
          description: error instanceof Error ? error.message : "An unknown error occurred while parsing.",
        });
      }
    };
    reader.onerror = () => {
        toast({ variant: "destructive", title: "File Error", description: "Failed to read file." });
    }
    reader.readAsText(file);
  };

  return (
    <Card className="w-full animate-in fade-in duration-500">
      <CardHeader>
        <CardTitle>1. Upload Your Leads</CardTitle>
        <CardDescription>Drag & drop your CSV file here or click to browse. The AI will automatically process the data.</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          onDragEnter={() => setIsDragging(true)}
          onDragLeave={() => setIsDragging(false)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
        >
          <UploadCloud className={`h-12 w-12 mb-4 transition-colors ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
          <p className="text-center text-muted-foreground">
            {isDragging ? 'Drop the file here' : 'Drag & drop a .csv file or click to select'}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
        <div className="mt-6 text-center">
            <Button onClick={() => fileInputRef.current?.click()}>
                Browse Files
            </Button>
            <p className="text-xs text-muted-foreground mt-2">Required CSV columns: <span className="font-semibold">name</span>, <span className="font-semibold">phone</span>. Optional: <span className="font-semibold">website</span>, <span className="font-semibold">business type</span>.</p>
        </div>
      </CardContent>
    </Card>
  );
}

'use client';

import { useState, useRef } from 'react';
import { UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
        const businessTypeIndex = headers.findIndex(h => h.includes('businesstype') || h.includes('business type'));
        
        if (nameIndex === -1 || phoneIndex === -1) {
          throw new Error("CSV must contain 'name' and 'phone' columns.");
        }
        
        const leadsData: Lead[] = lines.map((line, index) => {
          const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); // Handle commas inside quotes
          
          let website = '';
          let businessType = businessTypeIndex !== -1 ? (values[businessTypeIndex]?.trim().replace(/"/g, '') || undefined) : undefined;
          
          values.forEach((value) => {
              const cleanValue = value?.trim().replace(/"/g, '') || '';
              if (cleanValue.includes('www') || cleanValue.includes('http')) {
                  website = cleanValue;
              }
          });

          if (!businessType) {
            values.forEach((value, i) => {
              const cleanValue = value?.trim().replace(/"/g, '') || '';
               if (i !== nameIndex && i !== phoneIndex && i !== businessTypeIndex && !website && cleanValue && !cleanValue.match(/^\d/) && !cleanValue.includes('@')) {
                businessType = cleanValue;
               }
            });
          }


          let phoneNumber = values[phoneIndex]?.trim().replace(/"/g, '') || '';
          if (phoneNumber.startsWith('tel:')) {
            phoneNumber = phoneNumber.substring(4);
          }

          return {
            id: `lead-${index}-${Date.now()}`,
            businessName: values[nameIndex]?.trim().replace(/"/g, '') || '',
            phoneNumber: phoneNumber,
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
    <Card className="w-full max-w-lg mx-auto animate-in fade-in duration-500 shadow-lg mt-8 border-dashed border-2 bg-transparent hover:border-primary/50 transition-colors">
      <CardContent className="p-6">
        <div
          onDragEnter={() => setIsDragging(true)}
          onDragLeave={() => setIsDragging(false)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center p-12 rounded-lg cursor-pointer transition-colors ${isDragging ? 'bg-primary/10' : ''}`}
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
           <Button variant="link" className="mt-2">
                Browse Files
            </Button>
            <p className="text-xs text-muted-foreground mt-4">Required CSV columns: <span className="font-semibold font-code">name</span>, <span className="font-semibold font-code">phone</span>. Optional: <span className="font-semibold font-code">website</span>, <span className="font-semibold font-code">business type</span>.</p>
        </div>
      </CardContent>
    </Card>
  );
}

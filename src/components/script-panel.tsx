'use client';

import { useState, useEffect } from 'react';
import type { ProcessedLead, LeadStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LeadInteractionDialog } from '@/components/lead-interaction-dialog'; // We can reuse this logic
import {
    Phone,
    Globe,
    Building
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { LeadInteractionForm } from '@/components/lead-interaction-form';

interface ScriptPanelProps {
  lead: ProcessedLead;
  onSave: (lead: ProcessedLead) => void;
}

export function ScriptPanel({ lead, onSave }: ScriptPanelProps) {
  const defaultScript = `Hello, is this ${lead.correctedBusinessName}?\n\nMy name is [Your Name] and I'm calling from [Your Company]. I'm calling today because we specialize in [Your Service] for businesses like yours, a ${lead.businessType}.\n\nI wanted to see if you'd be open to a brief chat about how we might be able to help you.`;
  
  const [script, setScript] = useState(defaultScript);

  useEffect(() => {
    setScript(`Hello, is this ${lead.correctedBusinessName}?\n\nMy name is [Your Name] and I'm calling from [Your Company]. I'm calling today because we specialize in [Your Service] for businesses like yours, a ${lead.businessType}.\n\nI wanted to see if you'd be open to a brief chat about how we might be able to help you.`);
  }, [lead]);

  return (
    <div className="p-4 h-full flex flex-col gap-6">
        <div>
            <CardTitle>{lead.correctedBusinessName}</CardTitle>
            <CardDescription className="flex items-center gap-1.5 mt-1">
                <Building className="h-4 w-4" />
                {lead.businessType}
            </CardDescription>

            <div className="mt-4 flex flex-col gap-2 text-sm">
                <a href={`tel:${lead.correctedPhoneNumber}`} className="flex items-center gap-2 hover:text-primary">
                    <Phone className="h-4 w-4" />
                    {lead.correctedPhoneNumber}
                </a>
                {lead.correctedWebsite ? (
                    <a href={lead.correctedWebsite.startsWith('http') ? lead.correctedWebsite : `https://${lead.correctedWebsite}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary underline">
                        <Globe className="h-4 w-4" />
                        Visit Website
                    </a>
                ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Globe className="h-4 w-4" />
                        N/A
                    </div>
                )}
            </div>
        </div>

        <Separator />

        <div className='flex-grow flex flex-col gap-2'>
            <h3 className="text-lg font-semibold">Call Script</h3>
            <Textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                className="h-full flex-grow resize-none text-base"
                rows={10}
            />
        </div>

        <Separator />

        <div>
            <LeadInteractionForm lead={lead} onSave={onSave} />
        </div>
    </div>
  );
}

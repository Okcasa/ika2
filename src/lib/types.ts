export interface Lead {
  id: string;
  businessName: string;
  phoneNumber: string;
  website: string;
  businessType?: string;
}

export type LeadStatus = 'new' | 'contacted' | 'no-answer' | 'not-interested' | 'call-back' | 'wrong-number' | 'meeting-scheduled' | 'interested' | 'sale-made' | 'closed-lost';

export interface ProcessedLead extends Lead {
  correctedBusinessName: string;
  correctedPhoneNumber: string;
  correctedWebsite: string;
  businessType: string;
  confidenceScore: number;
  status: 'processing' | 'completed' | 'error';
  errorMessage?: string;
  leadStatus?: LeadStatus;
  notes?: string;
  meetingTime?: string;
}

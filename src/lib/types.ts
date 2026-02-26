export interface Lead {
  id: string;
  businessName: string;
  phoneNumber: string;
  website: string;
  businessType?: string;
}

export type LeadStatus = 'new' | 'no-answer' | 'not-interested' | 'call-back' | 'wrong-number' | 'meeting-scheduled' | 'sale-made' | 'closed-lost';

export interface ProcessedLead extends Lead {
  correctedBusinessName: string;
  correctedPhoneNumber: string;
  correctedWebsite: string;
  businessType: string;
  confidenceScore: number;
  status: 'processing' | 'completed' | 'error';
  errorMessage?: string;
  leadStatus?: LeadStatus;
  teamId?: string;
  userId?: string;
  name?: string;
  company?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  value?: string;
  color?: string;
  groups?: string[];
  history?: any[];
  openedAt?: number | string | null;
  closedAt?: number | string | null;
  notes?: string;
  meetingTime?: string;
  ownerName?: string;
  invoiceSent?: boolean;
}

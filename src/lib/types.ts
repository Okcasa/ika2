export interface Lead {
  id: string;
  businessName: string;
  phoneNumber: string;
  website: string;
}

export interface ProcessedLead extends Lead {
  correctedBusinessName: string;
  correctedPhoneNumber: string;
  correctedWebsite: string;
  businessType: string;
  confidenceScore: number;
  status: 'processing' | 'completed' | 'error';
  errorMessage?: string;
}

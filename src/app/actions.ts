'use server';

import type { Lead, ProcessedLead } from '@/lib/types';

export async function processLeadAction(lead: Lead): Promise<ProcessedLead> {
  // This function now simply maps the raw lead data to the processed lead format
  // without any AI processing.
  try {
    const processedLead: ProcessedLead = {
      ...lead,
      correctedBusinessName: lead.businessName,
      correctedPhoneNumber: lead.phoneNumber,
      correctedWebsite: lead.website || '',
      businessType: lead.businessType || 'Unknown',
      confidenceScore: 1, // Default confidence to 1 as it's user-provided or unknown
      status: 'completed',
    };
    return processedLead;
  } catch (error) {
    console.error(`Error processing lead "${lead.businessName}":`, error);
    return {
      ...lead,
      correctedBusinessName: lead.businessName,
      correctedPhoneNumber: lead.phoneNumber,
      correctedWebsite: lead.website,
      businessType: 'Error',
      confidenceScore: 0,
      status: 'error',
      errorMessage: error instanceof Error ? error.message : 'An unknown error occurred during processing',
    };
  }
}

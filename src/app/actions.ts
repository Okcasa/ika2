'use server';

import { classifyBusinessType } from '@/ai/flows/classify-business-type';
import { correctLeadData } from '@/ai/flows/correct-lead-data';
import type { Lead, ProcessedLead } from '@/lib/types';

export async function processLeadAction(lead: Lead): Promise<ProcessedLead> {
  try {
    // Run both AI flows in parallel for efficiency
    const [correctionResult, classificationResult] = await Promise.all([
      correctLeadData({
        businessName: lead.businessName,
        phoneNumber: lead.phoneNumber,
        website: lead.website,
        address: '', // No address from CSV
      }),
      classifyBusinessType({
        businessName: lead.businessName,
        website: lead.website,
        description: '', // No description from CSV
      }),
    ]);
    
    const processedLead: ProcessedLead = {
      ...lead,
      correctedBusinessName: correctionResult.correctedBusinessName || lead.businessName,
      correctedPhoneNumber: correctionResult.correctedPhoneNumber || lead.phoneNumber,
      correctedWebsite: correctionResult.correctedWebsite || lead.website || '',
      businessType: classificationResult.businessType || 'Unknown',
      confidenceScore: classificationResult.confidenceScore || 0,
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
      errorMessage: error instanceof Error ? error.message : 'An unknown error occurred during AI processing',
    };
  }
}

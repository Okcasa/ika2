'use server';

import { classifyBusinessType } from '@/ai/flows/classify-business-type';
import { correctLeadData } from '@/ai/flows/correct-lead-data';
import type { Lead, ProcessedLead } from '@/lib/types';

export async function processLeadAction(lead: Lead): Promise<ProcessedLead> {
  try {
    const correctionPromise = correctLeadData({
      businessName: lead.businessName,
      phoneNumber: lead.phoneNumber,
      website: lead.website,
      address: '', // No address from CSV
    });
    
    // Only classify if businessType is not provided in the lead
    const classificationPromise = lead.businessType
      ? Promise.resolve({ businessType: lead.businessType, confidenceScore: 1 })
      : classifyBusinessType({
          businessName: lead.businessName,
          website: lead.website,
          description: '', // No description from CSV
        });

    const [correctionResult, classificationResult] = await Promise.all([
      correctionPromise,
      classificationPromise,
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

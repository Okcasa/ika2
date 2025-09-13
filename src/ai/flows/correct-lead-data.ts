'use server';

/**
 * @fileOverview Implements the lead data correction flow.
 *
 * - correctLeadData - A function that corrects and enhances lead data.
 * - CorrectLeadDataInput - The input type for the correctLeadData function.
 * - CorrectLeadDataOutput - The return type for the correctLeadData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CorrectLeadDataInputSchema = z.object({
  businessName: z.string().describe('The name of the business.'),
  phoneNumber: z.string().describe('The phone number of the business.'),
  website: z.string().optional().describe('The website of the business, if available.'),
  address: z.string().optional().describe('The address of the business, if available.'),
});

export type CorrectLeadDataInput = z.infer<typeof CorrectLeadDataInputSchema>;

const CorrectLeadDataOutputSchema = z.object({
  correctedBusinessName: z.string().describe('The corrected name of the business.'),
  correctedPhoneNumber: z.string().describe('The corrected phone number of the business.'),
  correctedWebsite: z.string().optional().describe('The corrected website of the business, if available.'),
  correctedAddress: z.string().optional().describe('The corrected address of the business, if available.'),
});

export type CorrectLeadDataOutput = z.infer<typeof CorrectLeadDataOutputSchema>;

export async function correctLeadData(input: CorrectLeadDataInput): Promise<CorrectLeadDataOutput> {
  return correctLeadDataFlow(input);
}

const validatePhoneNumber = ai.defineTool({
  name: 'validatePhoneNumber',
  description: 'Validates a phone number and returns the corrected phone number if it is invalid.',
  inputSchema: z.object({
    phoneNumber: z.string().describe('The phone number to validate.'),
  }),
  outputSchema: z.string().describe('The validated or corrected phone number.'),
}, async (input) => {
  // Placeholder implementation for phone number validation.
  // In a real application, this would call an external phone validation service.
  // For now, just return the original number.
  return input.phoneNumber;
});

const findUpdatedUrl = ai.defineTool({
  name: 'findUpdatedUrl',
  description: 'Finds the updated URL for a given website if it is outdated or invalid.',
  inputSchema: z.object({
    website: z.string().describe('The website URL to check for updates.'),
  }),
  outputSchema: z.string().optional().describe('The updated website URL, if found.'),
}, async (input) => {
  // Placeholder implementation for finding updated URLs.
  // In a real application, this would call an external URL validation service.
  // For now, just return the original URL.
  return input.website;
});

const validateAddress = ai.defineTool({
  name: 'validateAddress',
  description: 'Validates an address and returns the corrected address if it is invalid.',
  inputSchema: z.object({
    address: z.string().describe('The address to validate.'),
  }),
  outputSchema: z.string().describe('The validated or corrected address.'),
}, async (input) => {
  // Placeholder implementation for address validation.
  // In a real application, this would call an external address validation service.
  // For now, just return the original address.
  return input.address;
});

const correctLeadDataPrompt = ai.definePrompt({
  name: 'correctLeadDataPrompt',
  tools: [validatePhoneNumber, findUpdatedUrl, validateAddress],
  input: {schema: CorrectLeadDataInputSchema},
  output: {schema: CorrectLeadDataOutputSchema},
  prompt: `You are an expert data correction specialist. Your job is to correct any errors and inconsistencies in the provided lead data.

  Correct and improve the following lead information, using the available tools to validate phone numbers, website URLs, and addresses. If no website or address is available, leave those fields blank.

  Business Name: {{{businessName}}}
  Phone Number: {{{phoneNumber}}}
  Website: {{{website}}}
  Address: {{{address}}}

  Return the corrected information in the specified format.`, // Ensure prompt is clear and concise
});

const correctLeadDataFlow = ai.defineFlow(
  {
    name: 'correctLeadDataFlow',
    inputSchema: CorrectLeadDataInputSchema,
    outputSchema: CorrectLeadDataOutputSchema,
  },
  async input => {
    const {output} = await correctLeadDataPrompt(input);
    return output!;
  }
);

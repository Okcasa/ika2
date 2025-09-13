'use server';

/**
 * @fileOverview Classifies the type of business for a given lead based on available information.
 *
 * @remarks
 * This flow uses AI to classify the type of business based on available information such as business name,
 * website, and a short description. The classification helps users quickly understand the nature of each lead
 * and prioritize their outreach efforts.
 *
 * @exports classifyBusinessType - A function that classifies the business type.
 * @exports ClassifyBusinessTypeInput - The input type for the classifyBusinessType function.
 * @exports ClassifyBusinessTypeOutput - The return type for the classifyBusinessType function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ClassifyBusinessTypeInputSchema = z.object({
  businessName: z.string().describe('The name of the business.'),
  website: z.string().optional().describe('The website of the business.'),
  description: z.string().optional().describe('A short description of the business.'),
});
export type ClassifyBusinessTypeInput = z.infer<typeof ClassifyBusinessTypeInputSchema>;

const ClassifyBusinessTypeOutputSchema = z.object({
  businessType: z.string().describe('The classified type of business (e.g., General Contractor, Restaurant).'),
  confidenceScore: z.number().describe('A confidence score (0-1) indicating the accuracy of the classification.'),
});
export type ClassifyBusinessTypeOutput = z.infer<typeof ClassifyBusinessTypeOutputSchema>;

export async function classifyBusinessType(input: ClassifyBusinessTypeInput): Promise<ClassifyBusinessTypeOutput> {
  return classifyBusinessTypeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'classifyBusinessTypePrompt',
  input: {schema: ClassifyBusinessTypeInputSchema},
  output: {schema: ClassifyBusinessTypeOutputSchema},
  prompt: `You are an AI assistant specializing in classifying businesses based on their name, website, and description.

  Analyze the provided information and determine the most appropriate business type. If a website is provided, prioritize its content as the primary source of information.

  Business Name: {{{businessName}}}
  Website: {{{website}}}
  Description: {{{description}}}

  Respond with the business type and a confidence score (0-1) indicating the accuracy of your classification.
  The business type should be a common business category (e.g., General Contractor, Restaurant, Software Company).
  The confidence score should reflect how certain you are about the classification based on the available information.
  If a field is missing, fill it in with 'Unknown'.
  If you are not sure, then make your best guess, and set the confidence score appropriately.
`,
});

const classifyBusinessTypeFlow = ai.defineFlow(
  {
    name: 'classifyBusinessTypeFlow',
    inputSchema: ClassifyBusinessTypeInputSchema,
    outputSchema: ClassifyBusinessTypeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

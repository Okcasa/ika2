import { Lead, ProcessedLead } from "./types";

const FIRST_NAMES = ["James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles", "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen"];
const LAST_NAMES = ["Smith", "Johnson", "Williams", "Jones", "Brown", "Davis", "Miller", "Wilson", "Moore", "Taylor", "Anderson", "Thomas", "Jackson", "White", "Harris"];
const BUSINESS_TYPES = ["Plumbing", "Electrical", "Landscaping", "HVAC", "Roofing", "Painting", "Cleaning", "Consulting", "Marketing", "Legal", "Medical", "Dental"];
const CITIES = ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Jose"];

function generateRandomPhoneNumber() {
  const areaCode = Math.floor(Math.random() * 800) + 200;
  const prefix = Math.floor(Math.random() * 900) + 100;
  const line = Math.floor(Math.random() * 9000) + 1000;
  return `(${areaCode}) ${prefix}-${line}`;
}

function generateRandomBusinessName(lastName: string, type: string) {
  const suffixes = ["Services", "Solutions", "Group", "Inc", "Co", "LLC", "Partners", "Enterprises"];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return `${lastName} ${type} ${suffix}`;
}

export function generateMockLeads(count: number): ProcessedLead[] {
  const leads: ProcessedLead[] = [];

  for (let i = 0; i < count; i++) {
    const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const type = BUSINESS_TYPES[Math.floor(Math.random() * BUSINESS_TYPES.length)];
    const city = CITIES[Math.floor(Math.random() * CITIES.length)];

    const businessName = generateRandomBusinessName(lastName, type);
    const hasWebsite = Math.random() > 0.8; // 80% don't have websites (as requested "preview of new leads that have no website")

    const lead: ProcessedLead = {
      id: `mock-${i}`,
      businessName: businessName,
      phoneNumber: generateRandomPhoneNumber(),
      website: hasWebsite ? `www.${businessName.toLowerCase().replace(/ /g, '')}.com` : '',
      businessType: type,
      correctedBusinessName: businessName,
      correctedPhoneNumber: generateRandomPhoneNumber(),
      correctedWebsite: hasWebsite ? `www.${businessName.toLowerCase().replace(/ /g, '')}.com` : '',
      confidenceScore: 1,
      status: 'completed',
      leadStatus: 'new',
      ownerName: `${firstName} ${lastName}`,
      notes: `Located in ${city}`,
    };

    leads.push(lead);
  }

  return leads;
}

export const MOCK_LEADS = generateMockLeads(3000);

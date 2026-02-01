import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { loans } from './schema.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const client = postgres(connectionString);
const db = drizzle(client);

// Amounts in micro-units (10,000ths of a dollar): $50,000 = 500000000
// Rates in basis points: 5.5% = 550 bps
const sampleLoans = [
  {
    principalAmountMicros: 500000000,  // $50,000
    interestRateBps: 550,              // 5.50%
    termMonths: 60,
    status: 'ACTIVE' as const,
  },
  {
    principalAmountMicros: 250000000,  // $25,000
    interestRateBps: 450,              // 4.50%
    termMonths: 36,
    status: 'ACTIVE' as const,
  },
  {
    principalAmountMicros: 1000000000, // $100,000
    interestRateBps: 650,              // 6.50%
    termMonths: 120,
    status: 'DRAFT' as const,
  },
  {
    principalAmountMicros: 150000000,  // $15,000
    interestRateBps: 399,              // 3.99%
    termMonths: 24,
    status: 'CLOSED' as const,
  },
  {
    principalAmountMicros: 750000000,  // $75,000
    interestRateBps: 525,              // 5.25%
    termMonths: 84,
    status: 'ACTIVE' as const,
  },
];

async function main() {
  console.log('Seeding database...');

  await db.insert(loans).values(sampleLoans);

  console.log(`Inserted ${sampleLoans.length} sample loans`);
  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

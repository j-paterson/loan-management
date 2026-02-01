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

const sampleLoans = [
  {
    principalAmount: '50000.0000',
    interestRate: '0.055000',
    termMonths: 60,
    status: 'ACTIVE' as const,
  },
  {
    principalAmount: '25000.0000',
    interestRate: '0.045000',
    termMonths: 36,
    status: 'ACTIVE' as const,
  },
  {
    principalAmount: '100000.0000',
    interestRate: '0.065000',
    termMonths: 120,
    status: 'DRAFT' as const,
  },
  {
    principalAmount: '15000.0000',
    interestRate: '0.039900',
    termMonths: 24,
    status: 'CLOSED' as const,
  },
  {
    principalAmount: '75000.0000',
    interestRate: '0.052500',
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

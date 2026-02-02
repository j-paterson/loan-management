import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { loans, borrowers, payments, loanStatusHistory, type LoanStatus } from './schema.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const client = postgres(connectionString);
const db = drizzle(client);

// Sample borrowers with credit profiles for underwriting
const sampleBorrowers = [
  {
    name: 'Alice Johnson',
    email: 'alice.johnson@email.com',
    phone: '555-0101',
    creditScore: 750,
    annualIncomeMicros: 850000000, // $85,000
    monthlyDebtMicros: 15000000,   // $1,500/month existing debt
  },
  {
    name: 'Bob Smith',
    email: 'bob.smith@email.com',
    phone: '555-0102',
    creditScore: 680,
    annualIncomeMicros: 650000000, // $65,000
    monthlyDebtMicros: 8000000,    // $800/month existing debt
  },
  {
    name: 'Carol Williams',
    email: 'carol.williams@email.com',
    phone: '555-0103',
    creditScore: 720,
    annualIncomeMicros: 950000000, // $95,000
    monthlyDebtMicros: 20000000,   // $2,000/month existing debt
  },
  {
    name: 'David Brown',
    email: 'david.brown@email.com',
    phone: '555-0104',
    creditScore: 590, // Below minimum - will fail underwriting
    annualIncomeMicros: 450000000, // $45,000
    monthlyDebtMicros: 12000000,   // $1,200/month existing debt
  },
  {
    name: 'Eva Martinez',
    email: 'eva.martinez@email.com',
    phone: '555-0105',
    creditScore: 800,
    annualIncomeMicros: 1200000000, // $120,000
    monthlyDebtMicros: 25000000,    // $2,500/month existing debt
  },
];

// Amounts in micro-units (10,000ths of a dollar): $50,000 = 500000000
// Rates in basis points: 5.5% = 550 bps
const sampleLoans: Array<{
  principalAmountMicros: number;
  interestRateBps: number;
  termMonths: number;
  status: LoanStatus;
}> = [
  {
    principalAmountMicros: 500000000,  // $50,000
    interestRateBps: 550,              // 5.50%
    termMonths: 60,
    status: 'ACTIVE',
  },
  {
    principalAmountMicros: 250000000,  // $25,000
    interestRateBps: 450,              // 4.50%
    termMonths: 36,
    status: 'ACTIVE',
  },
  {
    principalAmountMicros: 1000000000, // $100,000
    interestRateBps: 650,              // 6.50%
    termMonths: 120,
    status: 'DRAFT',
  },
  {
    principalAmountMicros: 150000000,  // $15,000
    interestRateBps: 399,              // 3.99%
    termMonths: 24,
    status: 'PAID_OFF', // Changed from CLOSED
  },
  {
    principalAmountMicros: 750000000,  // $75,000
    interestRateBps: 525,              // 5.25%
    termMonths: 84,
    status: 'ACTIVE',
  },
];

async function main() {
  console.log('Seeding database...');

  // Clear existing data first (order matters due to foreign keys)
  await db.delete(payments);
  await db.delete(loanStatusHistory);
  await db.delete(loans);
  await db.delete(borrowers);
  console.log('Cleared existing data');

  // Insert borrowers first
  const insertedBorrowers = await db.insert(borrowers).values(sampleBorrowers).returning();
  console.log(`Inserted ${insertedBorrowers.length} sample borrowers`);

  // Insert loans with borrower assignments
  const loansWithBorrowers = sampleLoans.map((loan, index) => ({
    ...loan,
    borrowerId: insertedBorrowers[index % insertedBorrowers.length].id,
  }));

  const insertedLoans = await db.insert(loans).values(loansWithBorrowers).returning();
  console.log(`Inserted ${insertedLoans.length} sample loans`);

  // Create status history entries for each loan
  const statusHistoryEntries = insertedLoans.map(loan => ({
    loanId: loan.id,
    fromStatus: null,
    toStatus: loan.status as LoanStatus,
    changedAt: loan.createdAt,
    changedBy: 'seed',
    reason: 'Initial loan creation',
  }));

  await db.insert(loanStatusHistory).values(statusHistoryEntries);
  console.log(`Inserted ${statusHistoryEntries.length} status history entries`);

  // Insert sample payments for ACTIVE loans
  // Amounts in micro-units: $5,000 = 50000000
  const samplePayments = [
    // Payments for first ACTIVE loan ($50,000 principal)
    { loanId: insertedLoans[0].id, amountMicros: 50000000, paidAt: new Date('2024-01-15') },  // $5,000
    { loanId: insertedLoans[0].id, amountMicros: 50000000, paidAt: new Date('2024-02-15') },  // $5,000
    { loanId: insertedLoans[0].id, amountMicros: 50000000, paidAt: new Date('2024-03-15') },  // $5,000
    // Payments for second ACTIVE loan ($25,000 principal)
    { loanId: insertedLoans[1].id, amountMicros: 25000000, paidAt: new Date('2024-01-20') },  // $2,500
    { loanId: insertedLoans[1].id, amountMicros: 25000000, paidAt: new Date('2024-02-20') },  // $2,500
    // Payments for fifth ACTIVE loan ($75,000 principal)
    { loanId: insertedLoans[4].id, amountMicros: 100000000, paidAt: new Date('2024-01-01') }, // $10,000
    { loanId: insertedLoans[4].id, amountMicros: 100000000, paidAt: new Date('2024-02-01') }, // $10,000
  ];

  await db.insert(payments).values(samplePayments);
  console.log(`Inserted ${samplePayments.length} sample payments`);

  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

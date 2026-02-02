-- Drop old columns and add new columns to payments table
ALTER TABLE "payments" DROP COLUMN IF EXISTS "principal_micros";
--> statement-breakpoint
ALTER TABLE "payments" DROP COLUMN IF EXISTS "interest_micros";
--> statement-breakpoint
ALTER TABLE "payments" DROP COLUMN IF EXISTS "balance_after_micros";
--> statement-breakpoint
ALTER TABLE "payments" DROP COLUMN IF EXISTS "payment_number";
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
--> statement-breakpoint
-- Update paid_at to remove default (we want it to be required from input)
ALTER TABLE "payments" ALTER COLUMN "paid_at" DROP DEFAULT;

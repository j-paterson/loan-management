-- Create borrowers table
CREATE TABLE IF NOT EXISTS "borrowers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);

-- Add borrower_id to loans table (initially nullable for migration)
ALTER TABLE "loans" ADD COLUMN IF NOT EXISTS "borrower_id" uuid;

-- Add foreign key constraint
DO $$ BEGIN
 ALTER TABLE "loans" ADD CONSTRAINT "loans_borrower_id_borrowers_id_fk" FOREIGN KEY ("borrower_id") REFERENCES "public"."borrowers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Note: After seeding borrowers and updating existing loans,
-- run: ALTER TABLE loans ALTER COLUMN borrower_id SET NOT NULL;

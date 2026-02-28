-- Add new array column with default
ALTER TABLE "Payment" ADD COLUMN "additionalMethods" "PaymentMethod"[] DEFAULT ARRAY[]::"PaymentMethod"[];

-- Copy existing single additionalMethod into array (one element)
UPDATE "Payment" SET "additionalMethods" = ARRAY["additionalMethod"]::"PaymentMethod"[] WHERE "additionalMethod" IS NOT NULL;

-- Drop old column
ALTER TABLE "Payment" DROP COLUMN "additionalMethod";

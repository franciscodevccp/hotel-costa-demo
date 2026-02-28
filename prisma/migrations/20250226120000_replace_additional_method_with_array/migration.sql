-- Add new array column if not exists (seguro si la BD ya tiene additionalMethods)
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "additionalMethods" "PaymentMethod"[] DEFAULT ARRAY[]::"PaymentMethod"[];

-- Solo copiar y eliminar columna antigua si existe (BD que venían de additionalMethod singular)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Payment' AND column_name = 'additionalMethod'
  ) THEN
    UPDATE "Payment" SET "additionalMethods" = ARRAY["additionalMethod"]::"PaymentMethod"[] WHERE "additionalMethod" IS NOT NULL;
    ALTER TABLE "Payment" DROP COLUMN "additionalMethod";
  END IF;
END $$;

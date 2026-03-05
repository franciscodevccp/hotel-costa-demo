-- AlterEnum: añadir CLUB y DELEGACION solo si no existen
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'GuestType' AND e.enumlabel = 'CLUB') THEN
    ALTER TYPE "GuestType" ADD VALUE 'CLUB';
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'GuestType' AND e.enumlabel = 'DELEGACION') THEN
    ALTER TYPE "GuestType" ADD VALUE 'DELEGACION';
  END IF;
END
$$;

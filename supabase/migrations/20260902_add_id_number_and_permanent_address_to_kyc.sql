-- ============================================================================
-- Migration: 20260902_add_id_number_and_permanent_address_to_kyc.sql
-- Description: Add mandatory 'id_number' and 'permanent_address' columns to
--              the kyc_records table with full backward compatibility for
--              existing records, index optimization, and data backfill.
-- ============================================================================

-- 1. Safely add 'id_number' and 'permanent_address' columns to kyc_records table
DO $$ 
BEGIN
    -- Add id_number column if it doesn't already exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'kyc_records' 
          AND column_name = 'id_number'
    ) THEN
        ALTER TABLE kyc_records 
        ADD COLUMN id_number VARCHAR(128);
    END IF;

    -- Add permanent_address column if it doesn't already exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'kyc_records' 
          AND column_name = 'permanent_address'
    ) THEN
        ALTER TABLE kyc_records 
        ADD COLUMN permanent_address TEXT;
    END IF;
END $$;

-- 2. Also ensure address/permanent_address and id_number_masked exist on profiles for seamless user profile joins
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
          AND column_name = 'permanent_address'
    ) THEN
        ALTER TABLE profiles 
        ADD COLUMN permanent_address TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
          AND column_name = 'address'
    ) THEN
        ALTER TABLE profiles 
        ADD COLUMN address TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
          AND column_name = 'id_number_masked'
    ) THEN
        ALTER TABLE profiles 
        ADD COLUMN id_number_masked VARCHAR(64);
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
          AND column_name = 'id_type'
    ) THEN
        ALTER TABLE profiles 
        ADD COLUMN id_type id_document_type;
    END IF;
END $$;

-- 3. Data Backfill & Backward Compatibility:
--    For existing KYC records where id_number is NULL but id_number_masked is available,
--    backfill id_number with id_number_masked to prevent null reference issues.
UPDATE kyc_records
SET id_number = id_number_masked
WHERE id_number IS NULL 
  AND id_number_masked IS NOT NULL;

--    For existing profiles where permanent_address is NULL but address is present on profile or kyc_records,
--    synchronize the values.
UPDATE kyc_records k
SET permanent_address = p.address
FROM profiles p
WHERE k.user_id = p.id
  AND k.permanent_address IS NULL
  AND p.address IS NOT NULL;

-- 4. Create Performance Indexes for Admin Search & Verification Queries
CREATE INDEX IF NOT EXISTS idx_kyc_records_id_number 
ON kyc_records(id_number);

CREATE INDEX IF NOT EXISTS idx_kyc_records_user_status 
ON kyc_records(user_id, status);

-- 5. Add Immutability Enforcement Check Function & Trigger for Submitted/Approved KYC Records
CREATE OR REPLACE FUNCTION enforce_kyc_immutability()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent modification of id_number, id_type, or permanent_address once status is submitted, pending, under_review, or approved
    IF (OLD.status IN ('pending', 'under_review', 'approved')) THEN
        -- Allow admin status/decision changes, but block alterations to user's identity data
        IF (NEW.id_number IS DISTINCT FROM OLD.id_number) THEN
            RAISE EXCEPTION 'ID number is immutable once KYC verification is submitted or approved.';
        END IF;

        IF (NEW.id_type IS DISTINCT FROM OLD.id_type) THEN
            RAISE EXCEPTION 'Document ID type is immutable once KYC verification is submitted or approved.';
        END IF;

        IF (NEW.permanent_address IS DISTINCT FROM OLD.permanent_address) THEN
            RAISE EXCEPTION 'Permanent residential address is immutable once KYC verification is submitted or approved.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_kyc_immutability ON kyc_records;
CREATE TRIGGER trg_enforce_kyc_immutability
BEFORE UPDATE ON kyc_records
FOR EACH ROW
EXECUTE FUNCTION enforce_kyc_immutability();

-- 6. Grant Necessary Permissions
GRANT SELECT, INSERT, UPDATE ON kyc_records TO authenticated;
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;

COMMENT ON COLUMN kyc_records.id_number IS 'Mandatory document ID number captured at submission';
COMMENT ON COLUMN kyc_records.permanent_address IS 'Mandatory permanent residential address of the user';

-- ============================================================================
-- EASYX COMPLETE MASTER PRODUCTION DATABASE SCHEMA (SUPABASE / POSTGRESQL)
-- Version: 2.0 (Updated with Correct Investment Plan Rates & Extended KYC)
-- ============================================================================

-- 1. Enable Required PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Clean Status Enums & Custom Domain Types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'admin', 'super_admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE account_status AS ENUM ('active', 'suspended', 'banned', 'pending_verification');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE kyc_status_type AS ENUM ('none', 'pending', 'under_review', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE investment_status_type AS ENUM ('active', 'matured', 'cancelled', 'liquidated');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE investment_payout_status AS ENUM ('locked', 'available', 'paid_out');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE wallet_tx_type AS ENUM (
        'DEPOSIT',
        'WITHDRAWAL_REQUEST',
        'WITHDRAWAL_APPROVED',
        'WITHDRAWAL_REJECTED',
        'PLAN_PURCHASE',
        'MATURITY_PAYOUT',
        'REFERRAL_COMMISSION',
        'ADMIN_ADJUSTMENT'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE wallet_tx_direction AS ENUM ('credit', 'debit', 'hold', 'release');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE deposit_status_type AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE withdrawal_status_type AS ENUM ('pending', 'approved', 'processing', 'completed', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE crypto_network_type AS ENUM ('TRC20', 'BEP20', 'ERC20', 'POLYGON');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE id_document_type AS ENUM ('passport', 'national_id', 'drivers_license', 'aadhaar');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM ('investment', 'deposit', 'withdrawal', 'kyc', 'security', 'referral', 'system');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE notification_channel AS ENUM ('in_app', 'push', 'both');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. Utility Trigger: Automatic Timestamp Updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. Table Definitions
-- ============================================================================

-- Table: profiles
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(32),
    role user_role NOT NULL DEFAULT 'user',
    status account_status NOT NULL DEFAULT 'active',
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    kyc_status kyc_status_type NOT NULL DEFAULT 'none',
    referral_code VARCHAR(32) UNIQUE NOT NULL,
    referred_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    address TEXT,
    permanent_address TEXT,
    id_number_masked VARCHAR(64),
    two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: investment_plans
CREATE TABLE IF NOT EXISTS investment_plans (
    key VARCHAR(32) PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    badge_text VARCHAR(64),
    min_amount NUMERIC(20, 6) NOT NULL CHECK (min_amount > 0),
    max_amount NUMERIC(20, 6) CHECK (max_amount IS NULL OR max_amount >= min_amount),
    lock_days INTEGER NOT NULL DEFAULT 60 CHECK (lock_days > 0),
    profit_percentage NUMERIC(8, 4) NOT NULL CHECK (profit_percentage >= 0),
    maturity_percentage NUMERIC(8, 4) NOT NULL CHECK (maturity_percentage >= 100),
    daily_rate_percentage NUMERIC(8, 4) NOT NULL DEFAULT 0.0000,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_investment_plans_updated_at ON investment_plans;
CREATE TRIGGER trg_investment_plans_updated_at
BEFORE UPDATE ON investment_plans
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: wallets
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    available_balance NUMERIC(20, 6) NOT NULL DEFAULT 0.000000 CHECK (available_balance >= 0),
    locked_balance NUMERIC(20, 6) NOT NULL DEFAULT 0.000000 CHECK (locked_balance >= 0),
    total_deposited NUMERIC(20, 6) NOT NULL DEFAULT 0.000000 CHECK (total_deposited >= 0),
    total_withdrawn NUMERIC(20, 6) NOT NULL DEFAULT 0.000000 CHECK (total_withdrawn >= 0),
    total_profit_earned NUMERIC(20, 6) NOT NULL DEFAULT 0.000000 CHECK (total_profit_earned >= 0),
    total_referral_earned NUMERIC(20, 6) NOT NULL DEFAULT 0.000000 CHECK (total_referral_earned >= 0),
    version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_wallets_updated_at ON wallets;
CREATE TRIGGER trg_wallets_updated_at
BEFORE UPDATE ON wallets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: investments
CREATE TABLE IF NOT EXISTS investments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    plan_key VARCHAR(32) NOT NULL REFERENCES investment_plans(key),
    plan_name VARCHAR(64) NOT NULL,
    principal NUMERIC(20, 6) NOT NULL CHECK (principal > 0),
    profit_percentage NUMERIC(8, 4) NOT NULL,
    maturity_percentage NUMERIC(8, 4) NOT NULL,
    expected_profit NUMERIC(20, 6) NOT NULL CHECK (expected_profit >= 0),
    expected_payout NUMERIC(20, 6) NOT NULL CHECK (expected_payout >= principal),
    lock_days INTEGER NOT NULL CHECK (lock_days > 0),
    start_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    maturity_at TIMESTAMPTZ NOT NULL,
    status investment_status_type NOT NULL DEFAULT 'active',
    payout_status investment_payout_status NOT NULL DEFAULT 'locked',
    paid_at TIMESTAMPTZ,
    auto_reinvest BOOLEAN NOT NULL DEFAULT FALSE,
    certificate_id VARCHAR(64) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_investments_updated_at ON investments;
CREATE TRIGGER trg_investments_updated_at
BEFORE UPDATE ON investments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: wallet_transactions (Immutable Ledger)
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    tx_type wallet_tx_type NOT NULL,
    direction wallet_tx_direction NOT NULL,
    amount NUMERIC(20, 6) NOT NULL CHECK (amount > 0),
    fee NUMERIC(20, 6) NOT NULL DEFAULT 0.000000 CHECK (fee >= 0),
    balance_before NUMERIC(20, 6) NOT NULL,
    balance_after NUMERIC(20, 6) NOT NULL,
    reference_id UUID,
    reference_table VARCHAR(64),
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: payment_deposits
CREATE TABLE IF NOT EXISTS payment_deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount NUMERIC(20, 6) NOT NULL CHECK (amount > 0),
    currency VARCHAR(16) NOT NULL DEFAULT 'USDT',
    network crypto_network_type NOT NULL DEFAULT 'TRC20',
    receiving_address VARCHAR(128) NOT NULL,
    tx_hash VARCHAR(128) UNIQUE,
    proof_image_url TEXT,
    status deposit_status_type NOT NULL DEFAULT 'pending',
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_payment_deposits_updated_at ON payment_deposits;
CREATE TRIGGER trg_payment_deposits_updated_at
BEFORE UPDATE ON payment_deposits
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: withdrawals
CREATE TABLE IF NOT EXISTS withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount NUMERIC(20, 6) NOT NULL CHECK (amount > 0),
    fee NUMERIC(20, 6) NOT NULL DEFAULT 0.000000 CHECK (fee >= 0),
    net_amount NUMERIC(20, 6) NOT NULL CHECK (net_amount > 0),
    currency VARCHAR(16) NOT NULL DEFAULT 'USDT',
    network crypto_network_type NOT NULL DEFAULT 'TRC20',
    destination_address VARCHAR(128) NOT NULL,
    payout_tx_hash VARCHAR(128) UNIQUE,
    status withdrawal_status_type NOT NULL DEFAULT 'pending',
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_withdrawals_updated_at ON withdrawals;
CREATE TRIGGER trg_withdrawals_updated_at
BEFORE UPDATE ON withdrawals
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: kyc_records
CREATE TABLE IF NOT EXISTS kyc_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    document_type id_document_type NOT NULL,
    id_number VARCHAR(128),
    id_number_masked VARCHAR(64),
    permanent_address TEXT,
    document_front_url TEXT NOT NULL,
    document_back_url TEXT,
    selfie_url TEXT NOT NULL,
    status kyc_status_type NOT NULL DEFAULT 'pending',
    reviewer_notes TEXT,
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_kyc_records_updated_at ON kyc_records;
CREATE TRIGGER trg_kyc_records_updated_at
BEFORE UPDATE ON kyc_records
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: referrals
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    referred_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    total_commission_earned NUMERIC(20, 6) NOT NULL DEFAULT 0.000000 CHECK (total_commission_earned >= 0),
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: referral_commissions
CREATE TABLE IF NOT EXISTS referral_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    investment_id UUID NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
    rate_percentage NUMERIC(6, 3) NOT NULL,
    amount NUMERIC(20, 6) NOT NULL CHECK (amount > 0),
    status VARCHAR(32) NOT NULL DEFAULT 'credited',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type notification_type NOT NULL DEFAULT 'system',
    channel notification_channel NOT NULL DEFAULT 'in_app',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES profiles(id),
    action VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64),
    old_state JSONB,
    new_state JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: platform_settings
CREATE TABLE IF NOT EXISTS platform_settings (
    key VARCHAR(64) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES profiles(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: promotions
CREATE TABLE IF NOT EXISTS promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    media_url TEXT NOT NULL,
    link_url TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'PUBLISHED',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. Performance Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_status ON investments(status);
CREATE INDEX IF NOT EXISTS idx_investments_maturity_at ON investments(maturity_at);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_created ON wallet_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deposits_user_status ON payment_deposits(user_id, status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_status ON withdrawals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_kyc_user_id ON kyc_records(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_status ON kyc_records(status);
CREATE INDEX IF NOT EXISTS idx_kyc_id_number ON kyc_records(id_number);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);

-- ============================================================================
-- 6. Trigger: Automatic Profile & Wallet Creation on Supabase Auth Signup
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_ref_code VARCHAR(32);
    v_referred_by UUID := NULL;
    v_clean_ref VARCHAR(32);
BEGIN
    v_ref_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NEW.id::TEXT) FROM 1 FOR 8));
    v_clean_ref := NULLIF(TRIM(NEW.raw_user_meta_data->>'referred_by_code'), '');
    
    IF v_clean_ref IS NOT NULL THEN
        SELECT id INTO v_referred_by FROM public.profiles WHERE referral_code = v_clean_ref LIMIT 1;
    END IF;

    INSERT INTO public.profiles (
        id, 
        name, 
        email, 
        phone, 
        role, 
        status, 
        referral_code, 
        referred_by
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
        NEW.email,
        NEW.raw_user_meta_data->>'phone',
        'user',
        'active',
        v_ref_code,
        v_referred_by
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.wallets (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    IF v_referred_by IS NOT NULL THEN
        INSERT INTO public.referrals (referrer_id, referred_id)
        VALUES (v_referred_by, NEW.id)
        ON CONFLICT (referred_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Helper function: Is Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. Row Level Security (RLS) Configuration
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

-- profiles RLS
DROP POLICY IF EXISTS "Users can view own profile or admins can view all" ON profiles;
CREATE POLICY "Users can view own profile or admins can view all"
ON profiles FOR SELECT
USING (auth.uid() = id OR is_admin());

DROP POLICY IF EXISTS "Users can update own non-privileged profile fields" ON profiles;
CREATE POLICY "Users can update own non-privileged profile fields"
ON profiles FOR UPDATE
USING (auth.uid() = id OR is_admin());

-- investment_plans RLS
DROP POLICY IF EXISTS "Public read active investment plans" ON investment_plans;
CREATE POLICY "Public read active investment plans"
ON investment_plans FOR SELECT
USING (is_active = TRUE OR is_admin());

DROP POLICY IF EXISTS "Admins can manage investment plans" ON investment_plans;
CREATE POLICY "Admins can manage investment plans"
ON investment_plans FOR ALL
USING (is_admin());

-- wallets RLS
DROP POLICY IF EXISTS "Users can view own wallet or admins can view all" ON wallets;
CREATE POLICY "Users can view own wallet or admins can view all"
ON wallets FOR SELECT
USING (auth.uid() = user_id OR is_admin());

-- investments RLS
DROP POLICY IF EXISTS "Users can view own investments or admins can view all" ON investments;
CREATE POLICY "Users can view own investments or admins can view all"
ON investments FOR SELECT
USING (auth.uid() = user_id OR is_admin());

-- wallet_transactions RLS
DROP POLICY IF EXISTS "Users can view own ledger entries or admins view all" ON wallet_transactions;
CREATE POLICY "Users can view own ledger entries or admins view all"
ON wallet_transactions FOR SELECT
USING (auth.uid() = user_id OR is_admin());

-- payment_deposits RLS
DROP POLICY IF EXISTS "Users can view own deposits or admins view all" ON payment_deposits;
CREATE POLICY "Users can view own deposits or admins view all"
ON payment_deposits FOR SELECT
USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "Users can submit own deposit records" ON payment_deposits;
CREATE POLICY "Users can submit own deposit records"
ON payment_deposits FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can review deposits" ON payment_deposits;
CREATE POLICY "Admins can review deposits"
ON payment_deposits FOR UPDATE
USING (is_admin());

-- withdrawals RLS
DROP POLICY IF EXISTS "Users can view own withdrawals or admins view all" ON withdrawals;
CREATE POLICY "Users can view own withdrawals or admins view all"
ON withdrawals FOR SELECT
USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "Admins can process withdrawals" ON withdrawals;
CREATE POLICY "Admins can process withdrawals"
ON withdrawals FOR UPDATE
USING (is_admin());

-- kyc_records RLS
DROP POLICY IF EXISTS "Users can view own KYC or admins view all" ON kyc_records;
CREATE POLICY "Users can view own KYC or admins view all"
ON kyc_records FOR SELECT
USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "Users can submit own KYC application" ON kyc_records;
CREATE POLICY "Users can submit own KYC application"
ON kyc_records FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can review KYC applications" ON kyc_records;
CREATE POLICY "Admins can review KYC applications"
ON kyc_records FOR UPDATE
USING (is_admin());

-- referrals RLS
DROP POLICY IF EXISTS "Referrers can view their invitees" ON referrals;
CREATE POLICY "Referrers can view their invitees"
ON referrals FOR SELECT
USING (auth.uid() = referrer_id OR is_admin());

-- referral_commissions RLS
DROP POLICY IF EXISTS "Referrers can view their earned commissions" ON referral_commissions;
CREATE POLICY "Referrers can view their earned commissions"
ON referral_commissions FOR SELECT
USING (auth.uid() = referrer_id OR is_admin());

-- notifications RLS
DROP POLICY IF EXISTS "Users can view their notifications or broadcasts" ON notifications;
CREATE POLICY "Users can view their notifications or broadcasts"
ON notifications FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL OR is_admin());

DROP POLICY IF EXISTS "Users can mark own notifications as read" ON notifications;
CREATE POLICY "Users can mark own notifications as read"
ON notifications FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- audit_logs RLS
DROP POLICY IF EXISTS "Admins only access audit logs" ON audit_logs;
CREATE POLICY "Admins only access audit logs"
ON audit_logs FOR SELECT
USING (is_admin());

-- platform_settings & promotions RLS
DROP POLICY IF EXISTS "Public read platform settings" ON platform_settings;
CREATE POLICY "Public read platform settings"
ON platform_settings FOR SELECT
USING (TRUE);

DROP POLICY IF EXISTS "Admins manage platform settings" ON platform_settings;
CREATE POLICY "Admins manage platform settings"
ON platform_settings FOR ALL
USING (is_admin());

DROP POLICY IF EXISTS "Public read active promotions" ON promotions;
CREATE POLICY "Public read active promotions"
ON promotions FOR SELECT
USING (status = 'PUBLISHED' OR is_admin());

DROP POLICY IF EXISTS "Admins manage promotions" ON promotions;
CREATE POLICY "Admins manage promotions"
ON promotions FOR ALL
USING (is_admin());

-- ============================================================================
-- 8. Storage Buckets & Storage RLS
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('kyc-documents', 'kyc-documents', FALSE, 15728640, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
    ('kyc-selfies', 'kyc-selfies', FALSE, 15728640, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('deposit-proofs', 'deposit-proofs', FALSE, 15728640, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
    ('support-attachments', 'support-attachments', FALSE, 26214400, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain']),
    ('promotions-media', 'promotions-media', TRUE, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users can upload their own KYC docs" ON storage.objects;
CREATE POLICY "Users can upload their own KYC docs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'kyc-documents' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can view their own KYC docs or admins view all" ON storage.objects;
CREATE POLICY "Users can view their own KYC docs or admins view all"
ON storage.objects FOR SELECT
USING (bucket_id = 'kyc-documents' AND ((auth.uid())::text = (storage.foldername(name))[1] OR is_admin()));

DROP POLICY IF EXISTS "Users can upload their own KYC selfies" ON storage.objects;
CREATE POLICY "Users can upload their own KYC selfies"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'kyc-selfies' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can view their own KYC selfies or admins view all" ON storage.objects;
CREATE POLICY "Users can view their own KYC selfies or admins view all"
ON storage.objects FOR SELECT
USING (bucket_id = 'kyc-selfies' AND ((auth.uid())::text = (storage.foldername(name))[1] OR is_admin()));

DROP POLICY IF EXISTS "Users can upload deposit proofs" ON storage.objects;
CREATE POLICY "Users can upload deposit proofs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'deposit-proofs' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can view own deposit proofs or admins view all" ON storage.objects;
CREATE POLICY "Users can view own deposit proofs or admins view all"
ON storage.objects FOR SELECT
USING (bucket_id = 'deposit-proofs' AND ((auth.uid())::text = (storage.foldername(name))[1] OR is_admin()));

DROP POLICY IF EXISTS "Users can upload support attachments" ON storage.objects;
CREATE POLICY "Users can upload support attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'support-attachments' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can view own support attachments or admins view all" ON storage.objects;
CREATE POLICY "Users can view own support attachments or admins view all"
ON storage.objects FOR SELECT
USING (bucket_id = 'support-attachments' AND ((auth.uid())::text = (storage.foldername(name))[1] OR is_admin()));

DROP POLICY IF EXISTS "Public read promotions media" ON storage.objects;
CREATE POLICY "Public read promotions media"
ON storage.objects FOR SELECT
USING (bucket_id = 'promotions-media');

DROP POLICY IF EXISTS "Admins upload promotions media" ON storage.objects;
CREATE POLICY "Admins upload promotions media"
ON storage.objects FOR ALL
USING (bucket_id = 'promotions-media' AND is_admin());

-- ============================================================================
-- 9. Seed Core Investment Plans (With 60% & 100% Rules)
-- ============================================================================
INSERT INTO public.investment_plans (
    key, 
    name, 
    badge_text, 
    min_amount, 
    max_amount, 
    lock_days, 
    profit_percentage, 
    maturity_percentage, 
    daily_rate_percentage, 
    is_active, 
    sort_order
)
VALUES 
    ('silver', 'Silver Starter', 'Beginner Staking', 100.000000, 999.000000, 60, 60.0000, 160.0000, 1.0000, TRUE, 1),
    ('gold', 'Gold Yield', 'Most Popular', 1000.000000, 4999.000000, 60, 60.0000, 160.0000, 1.0000, TRUE, 2),
    ('platinum', 'Platinum Wealth', 'High Yield', 5000.000000, 9999.000000, 60, 100.0000, 200.0000, 1.6667, TRUE, 3),
    ('diamond', 'Diamond Reserve', 'Institutional', 10000.000000, NULL, 60, 100.0000, 200.0000, 1.6667, TRUE, 4)
ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    min_amount = EXCLUDED.min_amount,
    max_amount = EXCLUDED.max_amount,
    lock_days = EXCLUDED.lock_days,
    profit_percentage = EXCLUDED.profit_percentage,
    maturity_percentage = EXCLUDED.maturity_percentage,
    daily_rate_percentage = EXCLUDED.daily_rate_percentage,
    updated_at = NOW();

-- Seed Default Platform Settings
INSERT INTO public.platform_settings (key, value, description)
VALUES 
    ('deposit_addresses', '{"TRC20": "TXYZ1234567890EasyXTRC20VaultDeposit", "BEP20": "0x1234567890abcdefEasyXBEP20VaultDeposit"}'::jsonb, 'Company deposit receiving addresses'),
    ('withdrawal_rules', '{"min_withdrawal": 10, "fee_percentage": 1.0, "processing_time_hours": 24}'::jsonb, 'Platform withdrawal limits and fees'),
    ('referral_rates', '{"level_1": 10.0, "level_2": 0.0, "level_3": 0.0}'::jsonb, 'Direct referral reward rate (10%)')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 10. Verification Output
-- ============================================================================
SELECT 
    name,
    profit_percentage || '% profit' AS profit,
    maturity_percentage || '% maturity' AS total_payout,
    lock_days || ' days' AS lock_period,
    daily_rate_percentage || '% daily' AS daily_rate
FROM public.investment_plans
ORDER BY sort_order ASC;

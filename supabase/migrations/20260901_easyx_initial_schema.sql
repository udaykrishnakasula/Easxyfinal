-- ============================================================================
-- EasyX Production Database Architecture & Schema Definition (Supabase / Postgres)
-- ============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Clean Status Enums & Custom Types
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

-- 3. Utility Function: Automatic Timestamp Updates
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
    two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TRIGGER trg_investment_plans_updated_at
BEFORE UPDATE ON investment_plans
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: wallets
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    available_balance NUMERIC(20, 6) NOT NULL DEFAULT 0.000000 CHECK (available_balance >= 0),
    total_invested NUMERIC(20, 6) NOT NULL DEFAULT 0.000000 CHECK (total_invested >= 0),
    total_profit NUMERIC(20, 6) NOT NULL DEFAULT 0.000000 CHECK (total_profit >= 0),
    total_deposited NUMERIC(20, 6) NOT NULL DEFAULT 0.000000 CHECK (total_deposited >= 0),
    total_withdrawn NUMERIC(20, 6) NOT NULL DEFAULT 0.000000 CHECK (total_withdrawn >= 0),
    pending_withdrawal NUMERIC(20, 6) NOT NULL DEFAULT 0.000000 CHECK (pending_withdrawal >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_wallets_updated_at
BEFORE UPDATE ON wallets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: investments
CREATE TABLE IF NOT EXISTS investments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    plan_key VARCHAR(32) NOT NULL REFERENCES investment_plans(key),
    plan_name VARCHAR(64) NOT NULL,
    principal NUMERIC(20, 6) NOT NULL CHECK (principal > 0),
    profit_percentage NUMERIC(8, 4) NOT NULL,
    maturity_percentage NUMERIC(8, 4) NOT NULL,
    expected_profit NUMERIC(20, 6) NOT NULL,
    expected_payout NUMERIC(20, 6) NOT NULL,
    lock_days INTEGER NOT NULL CHECK (lock_days > 0),
    start_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    maturity_at TIMESTAMPTZ NOT NULL,
    status investment_status_type NOT NULL DEFAULT 'active',
    payout_status investment_payout_status NOT NULL DEFAULT 'locked',
    payout_released_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_maturity_after_start CHECK (maturity_at > start_at)
);

CREATE TRIGGER trg_investments_updated_at
BEFORE UPDATE ON investments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: wallet_transactions (Immutable double-entry ledger)
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    type wallet_tx_type NOT NULL,
    direction wallet_tx_direction NOT NULL,
    amount NUMERIC(20, 6) NOT NULL CHECK (amount > 0),
    balance_after NUMERIC(20, 6) NOT NULL CHECK (balance_after >= 0),
    ref_type VARCHAR(32),
    ref_id UUID,
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    idempotency_key VARCHAR(64) UNIQUE,
    note TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: payment_deposits
CREATE TABLE IF NOT EXISTS payment_deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    network crypto_network_type NOT NULL,
    amount NUMERIC(20, 6) NOT NULL CHECK (amount > 0),
    approved_amount NUMERIC(20, 6) CHECK (approved_amount IS NULL OR approved_amount > 0),
    to_address VARCHAR(128) NOT NULL,
    tx_hash VARCHAR(128),
    proof_file_url VARCHAR(512),
    status deposit_status_type NOT NULL DEFAULT 'pending',
    admin_note TEXT,
    decided_by UUID REFERENCES profiles(id),
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_payment_deposits_updated_at
BEFORE UPDATE ON payment_deposits
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: withdrawals
CREATE TABLE IF NOT EXISTS withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    amount NUMERIC(20, 6) NOT NULL CHECK (amount > 0),
    fee NUMERIC(20, 6) NOT NULL DEFAULT 0.000000 CHECK (fee >= 0),
    net_amount NUMERIC(20, 6) NOT NULL CHECK (net_amount > 0),
    network crypto_network_type NOT NULL,
    destination_address VARCHAR(128) NOT NULL,
    status withdrawal_status_type NOT NULL DEFAULT 'pending',
    payout_tx_hash VARCHAR(128),
    rejection_reason TEXT,
    processed_by UUID REFERENCES profiles(id),
    decided_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_withdrawals_updated_at
BEFORE UPDATE ON withdrawals
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: kyc_records
CREATE TABLE IF NOT EXISTS kyc_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    country VARCHAR(4) NOT NULL DEFAULT 'US',
    id_type id_document_type NOT NULL,
    id_number_masked VARCHAR(32) NOT NULL,
    id_front_storage_path VARCHAR(512),
    id_back_storage_path VARCHAR(512),
    selfie_storage_path VARCHAR(512),
    liveness_score NUMERIC(5, 2) CHECK (liveness_score IS NULL OR (liveness_score >= 0 AND liveness_score <= 100)),
    liveness_passed BOOLEAN NOT NULL DEFAULT FALSE,
    status kyc_status_type NOT NULL DEFAULT 'pending',
    reject_reason TEXT,
    decided_by UUID REFERENCES profiles(id),
    decided_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_kyc_records_updated_at
BEFORE UPDATE ON kyc_records
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: referrals (Single-Tier direct affiliate)
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    referee_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    referral_code VARCHAR(32) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_no_self_referral CHECK (referrer_id <> referee_id)
);

-- Table: referral_commissions
CREATE TABLE IF NOT EXISTS referral_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    referee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    investment_id UUID NOT NULL REFERENCES investments(id) ON DELETE RESTRICT,
    tier_percentage NUMERIC(6, 4) NOT NULL CHECK (tier_percentage > 0),
    commission_amount NUMERIC(20, 6) NOT NULL CHECK (commission_amount > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'credited' CHECK (status IN ('pending', 'credited', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(160) NOT NULL,
    body TEXT NOT NULL,
    type notification_type NOT NULL DEFAULT 'system',
    channel notification_channel NOT NULL DEFAULT 'in_app',
    action_url VARCHAR(255),
    action_text VARCHAR(64),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    sender_admin VARCHAR(120),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: support_tickets
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(32) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    subject VARCHAR(200) NOT NULL,
    category VARCHAR(32) NOT NULL CHECK (category IN ('deposit', 'withdrawal', 'investment', 'kyc', 'account', 'technical', 'other')),
    priority VARCHAR(16) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'awaiting_user', 'resolved', 'closed')),
    assigned_admin_id UUID REFERENCES profiles(id),
    first_response_due_at TIMESTAMPTZ,
    first_responded_at TIMESTAMPTZ,
    resolution_due_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_support_tickets_updated_at
BEFORE UPDATE ON support_tickets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: support_messages
CREATE TABLE IF NOT EXISTS support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_type VARCHAR(16) NOT NULL CHECK (sender_type IN ('user', 'admin', 'ai_assistant', 'system')),
    sender_id UUID REFERENCES profiles(id),
    sender_name VARCHAR(120) NOT NULL,
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    is_internal_note BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: audit_logs (Immutable)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES profiles(id),
    admin_email VARCHAR(255) NOT NULL,
    action VARCHAR(64) NOT NULL,
    entity_type VARCHAR(32) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    amount NUMERIC(20, 6),
    reason TEXT,
    meta JSONB DEFAULT '{}'::jsonb,
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
    id VARCHAR(32) PRIMARY KEY,
    title VARCHAR(160) NOT NULL,
    subtitle TEXT,
    media_type VARCHAR(16) NOT NULL CHECK (media_type IN ('image', 'video')),
    media_url VARCHAR(512) NOT NULL,
    badge_text VARCHAR(64),
    badge_color VARCHAR(32) DEFAULT 'violet',
    cta_text VARCHAR(64),
    cta_link VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. Indexes for Performance & Query Scalability
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_role_status ON profiles(role, status);

CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_status_maturity ON investments(status, maturity_at) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_created ON wallet_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_ref ON wallet_transactions(ref_type, ref_id);

CREATE INDEX IF NOT EXISTS idx_deposits_status_created ON payment_deposits(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status_created ON withdrawals(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kyc_status_submitted ON kyc_records(status, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_referrer ON referral_commissions(referrer_id, created_at DESC);

-- ============================================================================
-- 6. Helper Functions & Auth Sync Trigger
-- ============================================================================

-- Check if current authenticated user has administrative privileges
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile and wallet upon Supabase auth sign-up
CREATE OR REPLACE FUNCTION handle_new_user_profile()
RETURNS TRIGGER AS $$
DECLARE
    gen_ref VARCHAR(32);
    p_name VARCHAR(120);
BEGIN
    p_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
    gen_ref := 'EX' || UPPER(SUBSTRING(p_name FROM 1 FOR 3)) || FLOOR(1000 + RANDOM() * 8999)::TEXT;

    INSERT INTO profiles (
        id,
        name,
        email,
        phone,
        role,
        status,
        email_verified,
        kyc_status,
        referral_code,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        p_name,
        NEW.email,
        NEW.raw_user_meta_data->>'phone',
        'user',
        'active',
        (NEW.email_confirmed_at IS NOT NULL),
        'none',
        gen_ref,
        NOW(),
        NOW()
    );

    INSERT INTO wallets (
        user_id,
        available_balance,
        total_invested,
        total_profit,
        total_deposited,
        total_withdrawn,
        pending_withdrawal,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        0.000000,
        0.000000,
        0.000000,
        0.000000,
        0.000000,
        0.000000,
        NOW(),
        NOW()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user_profile();

-- ============================================================================
-- 7. Row Level Security (RLS) Policies
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
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

-- profiles RLS
CREATE POLICY "Users can view own profile or admins can view all"
ON profiles FOR SELECT
USING (auth.uid() = id OR is_admin());

CREATE POLICY "Users can update own non-privileged profile fields"
ON profiles FOR UPDATE
USING (auth.uid() = id OR is_admin());

-- investment_plans RLS
CREATE POLICY "Public read active investment plans"
ON investment_plans FOR SELECT
USING (is_active = TRUE OR is_admin());

CREATE POLICY "Admins can manage investment plans"
ON investment_plans FOR ALL
USING (is_admin());

-- wallets RLS
CREATE POLICY "Users can view own wallet or admins can view all"
ON wallets FOR SELECT
USING (auth.uid() = user_id OR is_admin());

-- investments RLS
CREATE POLICY "Users can view own investments or admins can view all"
ON investments FOR SELECT
USING (auth.uid() = user_id OR is_admin());

-- wallet_transactions RLS (Read-only for users)
CREATE POLICY "Users can view own ledger entries or admins view all"
ON wallet_transactions FOR SELECT
USING (auth.uid() = user_id OR is_admin());

-- payment_deposits RLS
CREATE POLICY "Users can view own deposits or admins view all"
ON payment_deposits FOR SELECT
USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can submit own deposit records"
ON payment_deposits FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can review deposits"
ON payment_deposits FOR UPDATE
USING (is_admin());

-- withdrawals RLS
CREATE POLICY "Users can view own withdrawals or admins view all"
ON withdrawals FOR SELECT
USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Admins can process withdrawals"
ON withdrawals FOR UPDATE
USING (is_admin());

-- kyc_records RLS
CREATE POLICY "Users can view own KYC or admins view all"
ON kyc_records FOR SELECT
USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can submit own KYC application"
ON kyc_records FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can review KYC applications"
ON kyc_records FOR UPDATE
USING (is_admin());

-- referrals RLS
CREATE POLICY "Referrers can view their invitees"
ON referrals FOR SELECT
USING (auth.uid() = referrer_id OR is_admin());

-- referral_commissions RLS
CREATE POLICY "Referrers can view their earned commissions"
ON referral_commissions FOR SELECT
USING (auth.uid() = referrer_id OR is_admin());

-- notifications RLS
CREATE POLICY "Users can view their notifications or broadcasts"
ON notifications FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL OR is_admin());

CREATE POLICY "Users can mark own notifications as read"
ON notifications FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- audit_logs RLS
CREATE POLICY "Admins only access audit logs"
ON audit_logs FOR SELECT
USING (is_admin());

-- platform_settings & promotions RLS
CREATE POLICY "Public read platform settings"
ON platform_settings FOR SELECT
USING (TRUE);

CREATE POLICY "Admins manage platform settings"
ON platform_settings FOR ALL
USING (is_admin());

CREATE POLICY "Public read active promotions"
ON promotions FOR SELECT
USING (status = 'PUBLISHED' OR is_admin());

CREATE POLICY "Admins manage promotions"
ON promotions FOR ALL
USING (is_admin());

-- ============================================================================
-- 8. Seed Core Investment Plans
-- ============================================================================

INSERT INTO investment_plans (key, name, badge_text, min_amount, max_amount, lock_days, profit_percentage, maturity_percentage, daily_rate_percentage, is_active, sort_order)
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
    daily_rate_percentage = EXCLUDED.daily_rate_percentage;

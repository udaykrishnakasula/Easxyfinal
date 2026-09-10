-- ============================================================================
-- EasyX Mission-Critical Financial Procedures & RPC Functions (PostgreSQL)
-- ============================================================================

-- 1. RPC: Atomic Investment Purchase with Double-Entry Ledger and Referral Credit
CREATE OR REPLACE FUNCTION rpc_purchase_investment_plan(
    p_plan_key VARCHAR(32),
    p_amount NUMERIC(20, 6)
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_plan RECORD;
    v_wallet RECORD;
    v_investment_id UUID;
    v_lock_days INTEGER;
    v_expected_profit NUMERIC(20, 6);
    v_expected_payout NUMERIC(20, 6);
    v_start_at TIMESTAMPTZ := NOW();
    v_maturity_at TIMESTAMPTZ;
    v_new_available NUMERIC(20, 6);
    v_new_invested NUMERIC(20, 6);
    v_referrer_id UUID;
    v_commission_rate NUMERIC(6, 4) := 10.0000; -- 10% direct commission
    v_commission_amount NUMERIC(20, 6);
    v_ref_wallet RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: User authentication required';
    END IF;

    -- Fetch and validate plan
    SELECT * INTO v_plan FROM investment_plans WHERE key = p_plan_key AND is_active = TRUE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or inactive investment plan: %', p_plan_key;
    END IF;

    IF p_amount < v_plan.min_amount THEN
        RAISE EXCEPTION 'Minimum investment amount for % is % USDT', v_plan.name, v_plan.min_amount;
    END IF;

    IF v_plan.max_amount IS NOT NULL AND p_amount > v_plan.max_amount THEN
        RAISE EXCEPTION 'Maximum investment amount for % is % USDT', v_plan.name, v_plan.max_amount;
    END IF;

    -- Fetch and lock user wallet for update
    SELECT * INTO v_wallet FROM wallets WHERE user_id = v_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Wallet not found for user %', v_user_id;
    END IF;

    IF v_wallet.available_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient available balance. Required: %, Available: %', p_amount, v_wallet.available_balance;
    END IF;

    -- Calculate financial variables
    v_lock_days := v_plan.lock_days;
    v_expected_profit := ROUND(p_amount * (v_plan.profit_percentage / 100.0), 6);
    v_expected_payout := ROUND(p_amount * (v_plan.maturity_percentage / 100.0), 6);
    v_maturity_at := v_start_at + (v_lock_days || ' days')::INTERVAL;

    -- Create investment record
    INSERT INTO investments (
        user_id,
        plan_key,
        plan_name,
        principal,
        profit_percentage,
        maturity_percentage,
        expected_profit,
        expected_payout,
        lock_days,
        start_at,
        maturity_at,
        status,
        payout_status,
        created_at,
        updated_at
    ) VALUES (
        v_user_id,
        v_plan.key,
        v_plan.name,
        p_amount,
        v_plan.profit_percentage,
        v_plan.maturity_percentage,
        v_expected_profit,
        v_expected_payout,
        v_lock_days,
        v_start_at,
        v_maturity_at,
        'active',
        'locked',
        NOW(),
        NOW()
    ) RETURNING id INTO v_investment_id;

    -- Update user wallet balances atomically
    v_new_available := v_wallet.available_balance - p_amount;
    v_new_invested := v_wallet.total_invested + p_amount;

    UPDATE wallets SET
        available_balance = v_new_available,
        total_invested = v_new_invested,
        updated_at = NOW()
    WHERE id = v_wallet.id;

    -- Record in double-entry ledger
    INSERT INTO wallet_transactions (
        wallet_id,
        user_id,
        type,
        direction,
        amount,
        balance_after,
        ref_type,
        ref_id,
        status,
        note,
        created_by,
        created_at
    ) VALUES (
        v_wallet.id,
        v_user_id,
        'PLAN_PURCHASE',
        'debit',
        p_amount,
        v_new_available,
        'investments',
        v_investment_id,
        'completed',
        'Purchased plan ' || v_plan.name || ' with lock duration ' || v_lock_days || ' days',
        v_user_id,
        NOW()
    );

    -- Check direct referrer for affiliate bonus
    SELECT referred_by INTO v_referrer_id FROM profiles WHERE id = v_user_id;
    IF v_referrer_id IS NOT NULL THEN
        v_commission_amount := ROUND(p_amount * (v_commission_rate / 100.0), 6);
        IF v_commission_amount > 0 THEN
            INSERT INTO referral_commissions (
                referrer_id,
                referee_id,
                investment_id,
                tier_percentage,
                commission_amount,
                status,
                created_at
            ) VALUES (
                v_referrer_id,
                v_user_id,
                v_investment_id,
                v_commission_rate,
                v_commission_amount,
                'credited',
                NOW()
            );

            -- Credit referrer's wallet
            SELECT * INTO v_ref_wallet FROM wallets WHERE user_id = v_referrer_id FOR UPDATE;
            IF FOUND THEN
                UPDATE wallets SET
                    available_balance = available_balance + v_commission_amount,
                    total_profit = total_profit + v_commission_amount,
                    updated_at = NOW()
                WHERE id = v_ref_wallet.id;

                INSERT INTO wallet_transactions (
                    wallet_id,
                    user_id,
                    type,
                    direction,
                    amount,
                    balance_after,
                    ref_type,
                    ref_id,
                    status,
                    note,
                    created_by,
                    created_at
                ) VALUES (
                    v_ref_wallet.id,
                    v_referrer_id,
                    'REFERRAL_COMMISSION',
                    'credit',
                    v_commission_amount,
                    v_ref_wallet.available_balance + v_commission_amount,
                    'referral_commissions',
                    v_investment_id,
                    'completed',
                    'Direct referral affiliate reward (' || v_commission_rate || '%) from invitee purchase',
                    v_user_id,
                    NOW()
                );
            END IF;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'investment_id', v_investment_id,
        'plan_name', v_plan.name,
        'principal', p_amount,
        'expected_profit', v_expected_profit,
        'expected_payout', v_expected_payout,
        'maturity_at', v_maturity_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. RPC: Withdrawal Request with Escrow Hold
CREATE OR REPLACE FUNCTION rpc_request_withdrawal(
    p_amount NUMERIC(20, 6),
    p_network crypto_network_type,
    p_destination_address VARCHAR(128)
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_profile RECORD;
    v_wallet RECORD;
    v_withdrawal_id UUID;
    v_fee NUMERIC(20, 6) := 0.000000;
    v_net_amount NUMERIC(20, 6);
    v_new_available NUMERIC(20, 6);
    v_new_pending NUMERIC(20, 6);
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: User authentication required';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Withdrawal amount must be greater than zero';
    END IF;

    -- Verify KYC compliance
    SELECT * INTO v_profile FROM profiles WHERE id = v_user_id;
    IF v_profile.kyc_status <> 'approved' THEN
        RAISE EXCEPTION 'KYC verification required before requesting withdrawals';
    END IF;

    -- Fetch and lock wallet
    SELECT * INTO v_wallet FROM wallets WHERE user_id = v_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Wallet not found for user %', v_user_id;
    END IF;

    IF v_wallet.available_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient available balance. Required: %, Available: %', p_amount, v_wallet.available_balance;
    END IF;

    v_net_amount := p_amount - v_fee;
    v_new_available := v_wallet.available_balance - p_amount;
    v_new_pending := v_wallet.pending_withdrawal + p_amount;

    -- Insert withdrawal record
    INSERT INTO withdrawals (
        user_id,
        amount,
        fee,
        net_amount,
        network,
        destination_address,
        status,
        created_at,
        updated_at
    ) VALUES (
        v_user_id,
        p_amount,
        v_fee,
        v_net_amount,
        p_network,
        p_destination_address,
        'pending',
        NOW(),
        NOW()
    ) RETURNING id INTO v_withdrawal_id;

    -- Update wallet with escrow hold
    UPDATE wallets SET
        available_balance = v_new_available,
        pending_withdrawal = v_new_pending,
        updated_at = NOW()
    WHERE id = v_wallet.id;

    -- Record hold in ledger
    INSERT INTO wallet_transactions (
        wallet_id,
        user_id,
        type,
        direction,
        amount,
        balance_after,
        ref_type,
        ref_id,
        status,
        note,
        created_by,
        created_at
    ) VALUES (
        v_wallet.id,
        v_user_id,
        'WITHDRAWAL_REQUEST',
        'hold',
        p_amount,
        v_new_available,
        'withdrawals',
        v_withdrawal_id,
        'pending',
        'Withdrawal request queued for administrative review',
        v_user_id,
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'withdrawal_id', v_withdrawal_id,
        'amount', p_amount,
        'net_amount', v_net_amount,
        'status', 'pending'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RPC: Admin Decision on Deposit
CREATE OR REPLACE FUNCTION rpc_admin_decide_deposit(
    p_deposit_id UUID,
    p_action VARCHAR(16),
    p_approved_amount NUMERIC(20, 6) DEFAULT NULL,
    p_admin_note TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_admin_id UUID;
    v_admin_email VARCHAR(255);
    v_deposit RECORD;
    v_wallet RECORD;
    v_credit_amount NUMERIC(20, 6);
    v_new_available NUMERIC(20, 6);
BEGIN
    v_admin_id := auth.uid();
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Forbidden: Administrator privileges required';
    END IF;

    SELECT email INTO v_admin_email FROM profiles WHERE id = v_admin_id;

    SELECT * INTO v_deposit FROM payment_deposits WHERE id = p_deposit_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Deposit record % not found', p_deposit_id;
    END IF;

    IF v_deposit.status <> 'pending' THEN
        RAISE EXCEPTION 'Deposit has already been decided: %', v_deposit.status;
    END IF;

    IF p_action = 'approve' THEN
        v_credit_amount := COALESCE(p_approved_amount, v_deposit.amount);
        IF v_credit_amount <= 0 THEN
            RAISE EXCEPTION 'Approved amount must be greater than zero';
        END IF;

        UPDATE payment_deposits SET
            status = 'approved',
            approved_amount = v_credit_amount,
            admin_note = p_admin_note,
            decided_by = v_admin_id,
            decided_at = NOW(),
            updated_at = NOW()
        WHERE id = p_deposit_id;

        -- Credit user's wallet
        SELECT * INTO v_wallet FROM wallets WHERE user_id = v_deposit.user_id FOR UPDATE;
        v_new_available := v_wallet.available_balance + v_credit_amount;

        UPDATE wallets SET
            available_balance = v_new_available,
            total_deposited = total_deposited + v_credit_amount,
            updated_at = NOW()
        WHERE id = v_wallet.id;

        -- Record ledger credit
        INSERT INTO wallet_transactions (
            wallet_id,
            user_id,
            type,
            direction,
            amount,
            balance_after,
            ref_type,
            ref_id,
            status,
            note,
            created_by,
            created_at
        ) VALUES (
            v_wallet.id,
            v_deposit.user_id,
            'DEPOSIT',
            'credit',
            v_credit_amount,
            v_new_available,
            'payment_deposits',
            p_deposit_id,
            'completed',
            COALESCE(p_admin_note, 'USDT deposit confirmed and credited'),
            v_admin_id,
            NOW()
        );

        -- Log administrative audit
        INSERT INTO audit_logs (admin_id, admin_email, action, entity_type, entity_id, amount, reason, meta)
        VALUES (v_admin_id, v_admin_email, 'APPROVE_DEPOSIT', 'payment_deposits', p_deposit_id::TEXT, v_credit_amount, p_admin_note, jsonb_build_object('user_id', v_deposit.user_id));

        RETURN jsonb_build_object('success', true, 'status', 'approved', 'credited_amount', v_credit_amount);

    ELSIF p_action = 'reject' THEN
        UPDATE payment_deposits SET
            status = 'rejected',
            admin_note = p_admin_note,
            decided_by = v_admin_id,
            decided_at = NOW(),
            updated_at = NOW()
        WHERE id = p_deposit_id;

        INSERT INTO audit_logs (admin_id, admin_email, action, entity_type, entity_id, amount, reason, meta)
        VALUES (v_admin_id, v_admin_email, 'REJECT_DEPOSIT', 'payment_deposits', p_deposit_id::TEXT, v_deposit.amount, p_admin_note, jsonb_build_object('user_id', v_deposit.user_id));

        RETURN jsonb_build_object('success', true, 'status', 'rejected');
    ELSE
        RAISE EXCEPTION 'Invalid action: %. Must be approve or reject', p_action;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC: Admin Decision on Withdrawal
CREATE OR REPLACE FUNCTION rpc_admin_process_withdrawal(
    p_withdrawal_id UUID,
    p_action VARCHAR(16),
    p_tx_hash VARCHAR(128) DEFAULT NULL,
    p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_admin_id UUID;
    v_admin_email VARCHAR(255);
    v_withdrawal RECORD;
    v_wallet RECORD;
BEGIN
    v_admin_id := auth.uid();
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Forbidden: Administrator privileges required';
    END IF;

    SELECT email INTO v_admin_email FROM profiles WHERE id = v_admin_id;

    SELECT * INTO v_withdrawal FROM withdrawals WHERE id = p_withdrawal_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Withdrawal record % not found', p_withdrawal_id;
    END IF;

    IF v_withdrawal.status NOT IN ('pending', 'processing') THEN
        RAISE EXCEPTION 'Withdrawal cannot be processed from status: %', v_withdrawal.status;
    END IF;

    SELECT * INTO v_wallet FROM wallets WHERE user_id = v_withdrawal.user_id FOR UPDATE;

    IF p_action = 'complete' THEN
        UPDATE withdrawals SET
            status = 'completed',
            payout_tx_hash = p_tx_hash,
            processed_by = v_admin_id,
            decided_at = NOW(),
            completed_at = NOW(),
            updated_at = NOW()
        WHERE id = p_withdrawal_id;

        -- Deduct from pending_withdrawal and increment total_withdrawn
        UPDATE wallets SET
            pending_withdrawal = GREATEST(0, pending_withdrawal - v_withdrawal.amount),
            total_withdrawn = total_withdrawn + v_withdrawal.amount,
            updated_at = NOW()
        WHERE id = v_wallet.id;

        INSERT INTO wallet_transactions (
            wallet_id,
            user_id,
            type,
            direction,
            amount,
            balance_after,
            ref_type,
            ref_id,
            status,
            note,
            created_by,
            created_at
        ) VALUES (
            v_wallet.id,
            v_withdrawal.user_id,
            'WITHDRAWAL_APPROVED',
            'debit',
            v_withdrawal.amount,
            v_wallet.available_balance,
            'withdrawals',
            p_withdrawal_id,
            'completed',
            'Withdrawal broadcast on-chain: ' || COALESCE(p_tx_hash, 'Complete'),
            v_admin_id,
            NOW()
        );

        INSERT INTO audit_logs (admin_id, admin_email, action, entity_type, entity_id, amount, reason, meta)
        VALUES (v_admin_id, v_admin_email, 'COMPLETE_WITHDRAWAL', 'withdrawals', p_withdrawal_id::TEXT, v_withdrawal.amount, 'On-chain payout confirmed', jsonb_build_object('tx_hash', p_tx_hash, 'user_id', v_withdrawal.user_id));

        RETURN jsonb_build_object('success', true, 'status', 'completed');

    ELSIF p_action = 'reject' THEN
        UPDATE withdrawals SET
            status = 'rejected',
            rejection_reason = p_rejection_reason,
            processed_by = v_admin_id,
            decided_at = NOW(),
            updated_at = NOW()
        WHERE id = p_withdrawal_id;

        -- Return held funds from pending_withdrawal back to available_balance
        UPDATE wallets SET
            available_balance = available_balance + v_withdrawal.amount,
            pending_withdrawal = GREATEST(0, pending_withdrawal - v_withdrawal.amount),
            updated_at = NOW()
        WHERE id = v_wallet.id;

        INSERT INTO wallet_transactions (
            wallet_id,
            user_id,
            type,
            direction,
            amount,
            balance_after,
            ref_type,
            ref_id,
            status,
            note,
            created_by,
            created_at
        ) VALUES (
            v_wallet.id,
            v_withdrawal.user_id,
            'WITHDRAWAL_REJECTED',
            'release',
            v_withdrawal.amount,
            v_wallet.available_balance + v_withdrawal.amount,
            'withdrawals',
            p_withdrawal_id,
            'completed',
            'Withdrawal rejected: ' || COALESCE(p_rejection_reason, 'Failed compliance check'),
            v_admin_id,
            NOW()
        );

        INSERT INTO audit_logs (admin_id, admin_email, action, entity_type, entity_id, amount, reason, meta)
        VALUES (v_admin_id, v_admin_email, 'REJECT_WITHDRAWAL', 'withdrawals', p_withdrawal_id::TEXT, v_withdrawal.amount, p_rejection_reason, jsonb_build_object('user_id', v_withdrawal.user_id));

        RETURN jsonb_build_object('success', true, 'status', 'rejected');
    ELSE
        RAISE EXCEPTION 'Invalid action: %. Must be complete or reject', p_action;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC: Automated Staking Maturity Worker
CREATE OR REPLACE FUNCTION rpc_cron_process_maturities()
RETURNS JSONB AS $$
DECLARE
    v_inv RECORD;
    v_wallet RECORD;
    v_count INTEGER := 0;
    v_total_paid NUMERIC(20, 6) := 0.000000;
BEGIN
    FOR v_inv IN 
        SELECT * FROM investments 
        WHERE status = 'active' 
        AND payout_status = 'locked' 
        AND maturity_at <= NOW()
        FOR UPDATE SKIP LOCKED
    LOOP
        -- Mark investment as matured
        UPDATE investments SET
            status = 'matured',
            payout_status = 'paid_out',
            payout_released_at = NOW(),
            updated_at = NOW()
        WHERE id = v_inv.id;

        -- Release payout to wallet
        SELECT * INTO v_wallet FROM wallets WHERE user_id = v_inv.user_id FOR UPDATE;
        IF FOUND THEN
            UPDATE wallets SET
                available_balance = available_balance + v_inv.expected_payout,
                total_invested = GREATEST(0, total_invested - v_inv.principal),
                total_profit = total_profit + v_inv.expected_profit,
                updated_at = NOW()
            WHERE id = v_wallet.id;

            -- Ledger entry
            INSERT INTO wallet_transactions (
                wallet_id,
                user_id,
                type,
                direction,
                amount,
                balance_after,
                ref_type,
                ref_id,
                status,
                note,
                created_at
            ) VALUES (
                v_wallet.id,
                v_inv.user_id,
                'MATURITY_PAYOUT',
                'credit',
                v_inv.expected_payout,
                v_wallet.available_balance + v_inv.expected_payout,
                'investments',
                v_inv.id,
                'completed',
                'Maturity payout for staking plan: ' || v_inv.plan_name || ' (Principal: ' || v_inv.principal || ' + Profit: ' || v_inv.expected_profit || ')',
                NOW()
            );

            -- Dispatch in-app notification to investor
            INSERT INTO notifications (
                user_id,
                title,
                body,
                type,
                channel,
                action_url,
                action_text,
                created_at
            ) VALUES (
                v_inv.user_id,
                'Staking Contract Matured: ' || v_inv.plan_name,
                'Your investment of ' || v_inv.principal || ' USDT has completed its 60-day lockup. Total return of ' || v_inv.expected_payout || ' USDT has been credited to your available balance.',
                'investment',
                'both',
                '/wallet',
                'View Wallet',
                NOW()
            );

            v_count := v_count + 1;
            v_total_paid := v_total_paid + v_inv.expected_payout;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'contracts_matured', v_count,
        'total_payout_credited', v_total_paid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

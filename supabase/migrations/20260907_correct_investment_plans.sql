-- ============================================================================
-- EasyX Migration: Correct Investment Plan Profit Percentages
-- Date: 2026-09-07
--
-- TARGETED CORRECTION (No new duplicate rows, preserves existing IDs & settings):
-- 1. Silver Starter  ('silver')   -> 60% profit, 160% maturity payout, 60 days lock
-- 2. Gold Yield      ('gold')     -> 60% profit, 160% maturity payout, 60 days lock
-- 3. Platinum Wealth ('platinum') -> 100% profit, 200% maturity payout, 60 days lock
-- 4. Diamond Reserve ('diamond')  -> 100% profit, 200% maturity payout, 60 days lock
--
-- Financial Math:
-- profit = principal * profit_percentage / 100
-- maturity_amount = principal + profit
-- ============================================================================

-- 1. Correct Silver Starter: 40% -> 60% profit
UPDATE public.investment_plans
SET 
    profit_percentage = 60.0000,
    maturity_percentage = 160.0000,
    daily_rate_percentage = 1.0000,
    lock_days = 60,
    updated_at = NOW()
WHERE key = 'silver';

-- 2. Confirm Gold Yield: 60% profit
UPDATE public.investment_plans
SET 
    profit_percentage = 60.0000,
    maturity_percentage = 160.0000,
    daily_rate_percentage = 1.0000,
    lock_days = 60,
    updated_at = NOW()
WHERE key = 'gold';

-- 3. Correct Platinum Wealth: 80% -> 100% profit
UPDATE public.investment_plans
SET 
    profit_percentage = 100.0000,
    maturity_percentage = 200.0000,
    daily_rate_percentage = 1.6667,
    lock_days = 60,
    updated_at = NOW()
WHERE key = 'platinum';

-- 4. Confirm Diamond Reserve: 100% profit
UPDATE public.investment_plans
SET 
    profit_percentage = 100.0000,
    maturity_percentage = 200.0000,
    daily_rate_percentage = 1.6667,
    lock_days = 60,
    updated_at = NOW()
WHERE key = 'diamond';

-- 5. Verification Query (Returns the updated state immediately)
SELECT 
    name,
    profit_percentage || '% profit' AS profit,
    maturity_percentage || '% total maturity payout' AS maturity,
    lock_days || ' days' AS lock_period,
    daily_rate_percentage || '% daily' AS daily_rate
FROM public.investment_plans
ORDER BY sort_order ASC;

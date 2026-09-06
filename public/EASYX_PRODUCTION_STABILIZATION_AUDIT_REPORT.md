# EASYX — MASTER PRODUCTION STABILIZATION AUDIT REPORT
**Audit Date**: August 31, 2026  
**Audit Scope**: Complete Application Inspection (User App, Admin App, API Backend, Storage, Security)  
**Execution Mode**: Non-Destructive Diagnostic Audit  
**Status**: Completed  

---

## A. OVERALL HEALTH

The EasyX platform is a feature-complete, architecturally unified full-stack web application. The core user journeys—registration, login, two-network crypto deposits (TRC20 & BEP20), tiered yield investment plans (Silver, Gold, Platinum, Diamond), automated maturity sweeps with scheduled returns, KYC document/selfie processing, support ticketing with Gemini AI assistance, and the full administrative operations console—are actively implemented and type-checked without TypeScript compilation errors.

However, the application currently operates on an **in-memory database with local JSON file persistence (`.data/easyx_db.json`) and local disk asset storage (`uploads/`)**. While functional for single-node development, this architecture is **not production-ready for multi-instance cloud deployments (e.g. Cloud Run, AWS ECS, Kubernetes)** where container file systems are ephemeral.

```
Overall Health Score: 78 / 100
- Core Business Logic & State Chain: 95/100 (Solid, unified ledger)
- UI/UX & Responsive Layouts: 90/100 (Polished, dark luxury design system)
- Security & Authentication Controls: 82/100 (Strong guards, fallback secrets need enforcement)
- Database & Persistence Architecture: 55/100 (Local JSON/in-memory; requires cloud storage/DB migration)
```

---

## B. CRITICAL PRODUCTION BLOCKERS (P0)

*Must fix before public deployment:*

1. **Ephemeral Local Storage / In-Memory State Loss Risk**:
   - **Location**: `server.ts` (`.data/easyx_db.json`, `promotions_data.json`, `.data/backups/`)
   - **Root Cause**: The application relies on server-memory JavaScript `Map` structures flushed to disk via `fs.writeFileSync`. On stateless serverless or container platforms (Cloud Run, Heroku, Serverless), every redeployment or auto-scale event spawns a fresh container instance with un-synced local storage, causing data loss or multi-instance race conditions.
   - **Impact**: All users, wallets, deposits, investments, and audit records will reset or drift out of sync across instances.

2. **Hardcoded Placeholder Crypto Deposit Addresses**:
   - **Location**: `server.ts` lines 390–393 (`platform_settings.deposit_addresses`)
   - **Values**: `TRC20: "TX7EasyXDepositTRC20OfficialWalletAddress99"`, `BEP20: "0x7EasyXDepositBEP20OfficialWalletAddress99"`
   - **Impact**: Real users will transfer real funds to non-existent placeholder addresses unless real corporate cold/hot wallet addresses are configured before opening deposits.

3. **Fallback Insecure JWT Secret in Production Mode**:
   - **Location**: `server.ts`
   - **Code**: `const JWT_SECRET thrive = process.env.JWT_SECRET || "dev-secret-key-change-in-prod";`
   - **Impact**: If `JWT_SECRET` is not set in environment variables during production launch, anyone could forge valid admin or user JWT tokens using the known default string.

4. **Local Disk File Upload Storage for KYC Documents and Receipts**:
   - **Location**: `uploads/`, `uploads/branding/`, `db.kyc_documents`
   - **Root Cause**: Uploaded identity documents, selfies, and deposit screenshots are written to the local container file system.
   - **Impact**: Uploaded proofs will become 404 broken images upon container rebuild or scaling.

---

## C. HIGH-PRIORITY ISSUES (P1)

*Should fix before deployment:*

1. **Transactional Email Provider Fallback (`console_mock`)**:
   - **Location**: `src/server/emailService.ts`
   - **Details**: When `RESEND_API_KEY` and `SENDGRID_API_KEY` are not set, password reset codes and email verification tokens are only logged to stdout. Real users will not receive emails.
2. **First-Boot Auto-Seeded Demo Data**:
   - **Location**: `server.ts` (`seedDatabase()` lines 649–1155)
   - **Details**: When starting with a fresh database, the system seeds 5 historical investor profiles (`Sarah Jenkins`, `Elena Rostova`, etc.), 12 demo analytics events, and 3 sample error logs. While helpful for testing, this pollutes fresh production databases.
3. **No Automatic Database Migration Layer**:
   - **Location**: `server.ts` (`saveDatabase` / `loadDatabase`)
   - **Details**: Schema changes require manual JSON key mapping. Missing a schema migration tool (like Drizzle/Prisma/Knex) if moving to Postgres or Cloud SQL.
4. **Rate Limiting on Critical Auth Endpoints**:
   - **Location**: `server.ts`
   - **Details**: While basic rate limiters exist on password reset and file uploads, login and registration routes need strict IP-based and user-agent rate limiting to prevent credential stuffing.

---

## D. MEDIUM ISSUES (P2)

1. **Admin Reminders Route Alias Mismatch**:
   - **Location**: `src/admin/routes/AdminRoutes.jsx` (line 35)
   - **Details**: `<Route path="reminders" element={<AdminNotificationsPage />} />` maps to `AdminNotificationsPage` while a standalone `AdminRemindersPage.jsx` component exists in the codebase.
2. **Orphaned Legacy Components in `src/features/`**:
   - **Location**: `src/features/admin/AdminPlansPage.jsx`, `src/features/dashboard/BuyPlanDialog.jsx`, `src/features/dashboard/DashboardPlanCarousel.jsx`
   - **Details**: Old component duplicates exist in `src/features/` that are no longer referenced by `src/App.jsx` or `src/user/` routes.
3. **Password Security Route Placeholder**:
   - **Location**: `src/user/routes/UserRoutes.jsx` (line 38)
   - **Details**: Route `/security` displays `<ComingSoon />` even though full password update functionality is already implemented inside `/profile`.

---

## E. LOW-PRIORITY ISSUES (P3)

1. **Favicon & Brand Icon Synchronization**:
   - Dynamic favicon updating in the document `<head>` works via DOM manipulation in `BrandingContext.jsx`, but the static `index.html` still contains standard Vite default placeholders until runtime hydration.
2. **Offline Network Status Banner Polish**:
   - `NetworkStatusBanner.jsx` displays on connection drop; styling is clean but could include an automatic retry countdown.

---

## F. BROKEN FUNCTIONALITY

| Feature / Link | Location | Status | Diagnosis |
| :--- | :--- | :--- | :--- |
| **`/security` Route** | `src/user/routes/UserRoutes.jsx` | **PARTIALLY BROKEN** | Renders "Coming Soon" placeholder screen instead of redirecting to `/profile#security`. |
| **Admin Reminders Sub-route** | `src/admin/routes/AdminRoutes.jsx` | **MISROUTED** | `/admin/reminders` points to `AdminNotificationsPage` instead of `AdminRemindersPage`. |
| **Email Delivery (Without API Keys)** | `src/server/emailService.ts` | **MOCK FALLBACK** | Fails silently to terminal logs if `RESEND_API_KEY` or `SENDGRID_API_KEY` is missing. |

---

## G. DUMMY / MOCK / TEST DATA

1. **`server.ts` Historical Investor Profiles (Lines 784–930)**:
   - 5 seeded mock users: Sarah Jenkins (`sarah.j@example.com`), Elena Rostova, Marcus Vance, Liam O'Connor, Kenji Takahashi.
   - Historical mock deposits and active investments for demonstration.
2. **`server.ts` Seed Analytics Events (Lines 954–1099)**:
   - 12 synthetic events (`evt_seed_1` through `evt_seed_12`) inserted when `db.analytics_events` is empty.
3. **`server.ts` Seed Error Logs (Lines 1105–1155)**:
   - 3 synthetic error logs (`err_seed_1` through `err_seed_3`) for error tracking demonstration.
4. **`src/server/promotionsService.ts` Default Media Items (Lines 22–68)**:
   - 3 default promotional cards (`promo_1`, `promo_2`, `promo_3`) with bundled Gemini video references (`/gemini_generated_video_78da6d75.mp4`, etc.).
5. **`src/shared/analytics/behaviourTracker.js` (Lines 503–566)**:
   - 5 sample tracking events (`evt_sample_1` through `evt_sample_5`) generated if local analytics storage is empty.
6. **`src/server/monitoringService.ts` (Lines 687–950)**:
   - Sample monitoring errors and user event fixtures.
7. **`src/server/supportService.ts` Default FAQs**:
   - Standard initial FAQs seeded into knowledge base.

---

## H. DEAD OR NON-FUNCTIONAL UI

1. **User Navigation `/security`**:
   - Hits a static dead-end page (`ComingSoon.jsx`).
2. **Orphaned `src/features/` Directory**:
   - Files `src/features/dashboard/*` and `src/features/admin/*` are unmounted and unused.
3. **Landing Page Sample Video Elements**:
   - Rely on local `/public/*.mp4` assets. If video files fail to load, fallback poster images or graceful aspect-ratio containers prevent layout shift.

---

## I. USER APP ISSUES

1. **Deposit Flow**:
   - UI requires 1–3 uploaded screenshots and valid amount.
   - TX Hash is optional.
   - If user uploads high-resolution 10MB phone screenshots, client compresses them via `imageCompressor.js`, but multiple parallel uploads can slow down mobile connections.
2. **Buy Plan Double-Click Protection**:
   - Handled via `idempotency_key` generated per dialog opening. Verified: prevents double purchase on network retries.
3. **Unlocked Investments Dynamic 3D Cards**:
   - Calculates progress percentage in real time based on `start_time` and `maturity_at`. Verified functional.
4. **Live Activity Feed**:
   - Polls `/api/rewards/feed` every 8 seconds. Verified backed by real user transactions ledger in `db.wallet_transactions`.

---

## J. ADMIN APP ISSUES

1. **Virtualization Container Heights on Mobile**:
   - `AdminDepositsPage.jsx` and `AdminUsersPage.jsx` utilize `@tanstack/react-virtual`. On viewport widths `< 640px`, horizontal table scrolling must be preserved to avoid column clipping.
2. **Bulk Actions (Batch Approve/Reject)**:
   - Batch operations iterate sequentially over selected IDs. Error handling collects failed IDs and reports them in toast notifications.
3. **Branding Editor**:
   - Logo and App Icon uploads write to `uploads/branding/` and save to `db.platform_settings`. Tested and operational.

---

## K. AUTHENTICATION & SECURITY ISSUES

1. **JWT Expiration & Token Storage**:
   - Tokens stored in `localStorage` (`easyx_token`). Standard for single-page applications, but sessions do not support silent refresh tokens (users are logged out upon token expiry after 7 days).
2. **Admin Route Protection**:
   - Frontend: Guarded by `<ProtectedRoute adminOnly>`.
   - Backend: Guarded by `adminMiddleware` verifying `user.role === "admin"`.
   - Both layers are active.
3. **Password Hashing**:
   - Backend uses `bcryptjs` with salt rounds = 10. Secure.
4. **Secret Key Exposure**:
   - Verified that `process.env.GEMINI_API_KEY`, `RESEND_API_KEY`, and `JWT_SECRET` are never referenced in frontend client code or prefixed with `VITE_`.

---

## L. API / BACKEND ISSUES

### API Endpoints Audit Table

| Endpoint | Method | Caller | Auth Required | Status | Database Operation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/auth/register` | `POST` | `RegisterPage.jsx` | None | **WORKING** | Creates user & wallet in `db.users`, `db.wallets` |
| `/api/auth/login` | `POST` | `LoginPage.jsx` | None | **WORKING** | Verifies bcrypt hash, returns JWT |
| `/api/auth/me` | `GET` | `AuthContext.jsx` | Bearer Token | **WORKING** | Reads current user record |
| `/api/dashboard` | `GET` | `DashboardHome.jsx` | Bearer Token | **WORKING** | Calculates wallet + locked balances + plans |
| `/api/investments` | `POST` | `BuyPlanDialog.jsx` | Bearer Token | **WORKING** | Debits wallet, creates active investment record |
| `/api/deposits` | `POST` | `DepositPage.jsx` | Bearer Token | **WORKING** | Creates pending deposit record |
| `/api/admin/deposits/:id/approve` | `POST` | `AdminDepositsPage.jsx`| Admin JWT | **WORKING** | Approves deposit, credits wallet, logs audit |
| `/api/admin/deposits/:id/reject` | `POST` | `AdminDepositsPage.jsx`| Admin JWT | **WORKING** | Rejects deposit, logs reason, notifies user |
| `/api/withdrawals` | `POST` | `WithdrawPage.jsx` | Bearer Token | **WORKING** | Validates balance, debits wallet, creates pending record |
| `/api/admin/withdrawals/:id/approve` | `POST` | `AdminWithdrawalsPage.jsx`| Admin JWT | **WORKING** | Approves withdrawal, logs audit |
| `/api/admin/withdrawals/:id/reject` | `POST` | `AdminWithdrawalsPage.jsx`| Admin JWT | **WORKING** | Reverses wallet debit, credits funds back to user |
| `/api/kyc/submit` | `POST` | `KYCPage.jsx` | Bearer Token | **WORKING** | Saves document buffers, sets status to pending |
| `/api/admin/kyc/:id/approve` | `POST` | `AdminKycPage.jsx` | Admin JWT | **WORKING** | Sets user `kyc_status = approved` |
| `/api/promotions` | `GET` | `PromotionalMediaCarousel` | None/Auth | **WORKING** | Reads published promotions from JSON store |
| `/api/support/ai/chat` | `POST` | `SupportAssistantModal`| Bearer Token | **WORKING** | Generates response via Gemini 2.5 Flash |
| `/api/maturity/run` | `POST` | Cron / Admin | Admin JWT | **WORKING** | Sweeps matured plans, credits principal + profit |

---

## M. DATABASE / PRODUCTION ISSUES

### Current Actual Architecture:
- **Primary Data Store**: In-Memory JavaScript `Map` collections stored inside `server.ts`.
- **Persistence Mechanism**: Single-file JSON serialization to `.data/easyx_db.json` via synchronous atomic temp-file rename.
- **Promotions Store**: `promotions_data.json`.
- **Binary/Media Store**: Local file system directory (`uploads/`).
- **Relational DB / Supabase**: **NOT CONFIGURED / NOT IN USE**.

### Production Requirements:
1. Migrate in-memory maps to a persistent cloud database (e.g. PostgreSQL via Cloud SQL / Supabase, or Firestore).
2. Migrate file uploads (`uploads/`) to Google Cloud Storage (GCS) bucket or AWS S3.
3. Configure daily external database snapshots and WAL replication.

---

## N. ENVIRONMENT VARIABLE ISSUES

| Variable Name | Environment | Required in Prod? | Current Status / Fallback |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | Server-Only | Yes (for AI Support) | Configured / Falls back to rule-based engine if absent |
| `JWT_SECRET` | Server-Only | **CRITICAL** | Has unsafe dev default string fallback |
| `APP_URL` | Server-Only | Yes (for email links) | Defaults to `http://localhost:3000` |
| `ADMIN_EMAIL` | Server-Only | Recommended | Defaults to `admin@easyx.com` |
| `ADMIN_PASSWORD` | Server-Only | Recommended | Defaults to `Admin@123456` |
| `RESEND_API_KEY` | Server-Only | Yes (for real emails) | Falls back to console log if unset |
| `SENDGRID_API_KEY`| Server-Only | Alternative | Falls back to Resend or console log |
| `EMAIL_FROM` | Server-Only | Recommended | Defaults to `EasyX Security <no-reply@easyx.io>` |
| `KYC_LIVENESS_TEST_MODE`| Server-Only | Optional | Defaults to `false` in production |
| `VITE_BACKEND_URL`| Client | Optional | Empty string (uses same-origin relative `/api`) |
| `VITE_POSTHOG_KEY`| Client | Optional | Disabled if not provided |

---

## O. MOBILE ISSUES

1. **Touch Navigation & Drawer Dismissal**:
   - Mobile navigation uses Radix `Sheet` overlay with touch backdrop dismissal.
2. **Form Layouts on 320px–375px Viewports**:
   - Password reset and deposit forms have responsive padding (`p-4 sm:p-6`) to prevent horizontal overflow on narrow screens.
3. **Virtual Scroll Lists**:
   - Virtualized rows on Admin tables should have fixed minimum row heights on mobile to avoid virtual scroll jumping.

---

## P. DESKTOP ISSUES

1. **Wide-Screen Layout Constraints**:
   - Main dashboard views are constrained using `max-w-7xl mx-auto` to prevent stretched layouts on 1440p and 4K displays.
2. **Keyboard Navigation & Shortcuts**:
   - `GlobalKeyboardShortcuts.jsx` provides global navigation shortcuts (`/` for search, `Esc` to dismiss modals).

---

## Q. REGRESSION RISKS

1. **Shared Wallet Ledger Changes**:
   - Any modification to `creditWallet()` or `debitWallet()` in `server.ts` impacts deposits, plan purchases, maturity payouts, referral commissions, and withdrawal reversals simultaneously.
2. **Promotions State Sync**:
   - `promotionsService.ts` writes to `promotions_data.json` separately from `.data/easyx_db.json`. Restoring a database backup from `.data/backups/` will not automatically restore promotion carousel state unless both files are bundled.
3. **KYC Document In-Memory Base64 vs Disk Storage**:
   - `kyc_documents` stores buffers that are base64-encoded on serialization. Large volumes of user submissions will significantly expand `.data/easyx_db.json` file size on disk over time.

---

## R. COMPLETE PRE-DEPLOYMENT CHECKLIST

- [ ] **Env Secret Enforcement**: Set a strong, randomly generated `JWT_SECRET` (minimum 32 characters) in production environment variables.
- [ ] **Corporate Wallet Addresses**: Configure live corporate deposit addresses for TRC20 and BEP20 in Admin Settings.
- [ ] **Transactional Email Setup**: Configure `RESEND_API_KEY` or `SENDGRID_API_KEY` with verified sending domain in `EMAIL_FROM`.
- [ ] **Default Admin Credentials**: Change `ADMIN_PASSWORD` and `ADMIN_EMAIL` before publishing.
- [ ] **Production Storage / DB**: Ensure persistent disk storage mount is configured on the host container or migrate to a managed database instance (Postgres/Cloud SQL/Firestore) to prevent data resets on container recycle.
- [ ] **Clean Mock Users**: Ensure fresh deployment does not trigger historical seed investors on a live user database.
- [ ] **Route Cleanliness**: Update `/security` route to redirect to `/profile` and update `/admin/reminders` route mapping to `AdminRemindersPage`.
- [ ] **SSL / HTTPS Termination**: Enforce secure HTTPS reverse proxy and HSTS headers.

---

## S. RECOMMENDED FIX ORDER

```
Step 1: Security & Environment Hardening
  ├── Enforce non-empty JWT_SECRET validation on server boot
  └── Configure production transactional email delivery credentials

Step 2: Database Persistence & Storage Safeguards
  ├── Connect persistent volume or configure managed database connection
  └── Move large document binary buffers out of monolithic JSON serialization

Step 3: Route & Navigation Consistency Fixes
  ├── Redirect /security to /profile
  ├── Wire /admin/reminders to AdminRemindersPage.jsx
  └── Prune unused duplicate components in src/features/

Step 4: Production Configuration Verification
  ├── Configure real crypto deposit addresses via Admin Settings
  └── Validate complete end-to-end deposit -> approval -> purchase -> maturity -> payout cycle
```

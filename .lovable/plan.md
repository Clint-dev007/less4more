# less4more — Build Plan

A Nigerian investment platform with a mobile-first user app and a web admin dashboard, backed by Lovable Cloud (Postgres + Auth + realtime).

## Scope (V1)

**User App (mobile-first, light theme, neon-3D OPay-inspired)**
- Auth: email + password (phone+OTP requires paid SMS — see notes below)
- Home: wallet balance, animated portfolio donut, quick invest cards, referral banner, recent transactions
- Invest: filter by category, plan cards, invest modal with live ROI calculator
- Portfolio: active investments, progress bars, withdrawal status list
- Leaderboard: top investors + referral stats
- Notifications: bell badge, mark read / mark all read
- Deposit (manual): view admin bank, enter reference, notify admin
- Withdraw: save bank, request amount + payout day, see status
- Referrals: unique code (e.g. EMK001), 10% bonus on referee's first investment

**Admin Dashboard (dark theme `#0F172A` + `#38BDF8`)**
- Overview stats + recent activity
- Users: list, balance/invested/returns/referrals/bank, suspend/activate
- Plans: full CRUD, pause/resume
- Deposits: approve (credits wallet) / reject
- Withdrawals: approve / reject with bank info visible
- Settings: set the single admin bank account

## Design

- User app: bg `#F0F4F2`, primary `#0A6E4A`, accent `#F5A623`, system-ui font, rounded cards, soft neon glows, subtle 3D depth (layered shadows, gradient highlights), animated donut + count-ups
- Admin: dark `#0F172A`, accent `#38BDF8`, neon edges on cards
- All colors as semantic tokens in `src/styles.css` (oklch)
- Naira formatted with `toLocaleString("en-NG")`

## Routes

```
/                       landing → redirect to /app or /auth
/auth                   sign in / sign up
/app                    user home (mobile shell w/ bottom nav)
/app/invest
/app/portfolio
/app/leaderboard
/app/notifications
/app/deposit
/app/withdraw
/app/referrals
/admin                  admin overview (role-gated)
/admin/users
/admin/plans
/admin/deposits
/admin/withdrawals
/admin/settings
```

User routes under `_authenticated/app.*`. Admin routes under `_authenticated/admin.*` with extra `has_role('admin')` check.

## Database (Lovable Cloud)

Tables (all with RLS + grants):
- `profiles` — id (=auth.uid), name, phone, balance, invested, returns, ref_code, referred_by, status, bank_name, account_no, account_name, joined_at
- `user_roles` — (user_id, role enum: admin|user) + `has_role()` security definer
- `plans` — id, name, icon, category, roi, duration_days, min_amount, description, active
- `investments` — id, user_id, plan_id, amount, start_at, end_at, expected_return, status
- `deposits` — id, user_id, amount, ref, status (pending/approved/rejected), created_at
- `withdrawals` — id, user_id, amount, payout_day, bank_name, account_no, account_name, status, created_at
- `notifications` — id, user_id, type, title, body, read, created_at
- `admin_settings` — singleton: bank_name, account_no, account_name
- `referrals` — id, referrer_id, referee_id, bonus_paid, created_at

RLS: users see/modify only their rows; admins (via `has_role`) see/modify all. Plans readable by all authenticated. Approving a deposit/withdrawal and crediting referral bonuses run inside SECURITY DEFINER RPCs to keep balance math server-side and atomic.

## Realtime

Subscribe to `deposits`, `withdrawals`, `notifications`, `investments` for the current user on the user app; subscribe to pending queues on the admin dashboard.

## Notes / Decisions to confirm

1. **Auth**: spec says phone + OTP, but SMS OTP requires a paid Twilio/MessageBird provider on Supabase. I'll ship **email + password** (with phone stored on profile) — easy to swap to OTP later when you add an SMS provider. OK?
2. **Flutterwave**: out of scope for V1 (manual deposit flow only, as you described). I'll leave a clean seam for later.
3. **Admin bootstrap**: first admin assigned via a one-time SQL grant (I'll provide a button in dev that promotes the current user the first time only, gated by "no admin exists yet").
4. **Referral bonus**: 10% of referee's *first investment amount*, credited once to referrer wallet.

## Tech

React + TanStack Start (already scaffolded), Tailwind v4 tokens, shadcn components customized with neon variants, framer-motion for the donut/count-ups, Lovable Cloud for DB/Auth/Realtime, server functions for privileged ops (approve, reject, invest).

## Delivery order

1. Enable Lovable Cloud + run migration (schema, RLS, RPCs, seed a few plans)
2. Design system tokens + neon component variants
3. Auth + role gate + admin bootstrap
4. User app shell + Home + Invest + Portfolio
5. Deposit + Withdraw + Referrals + Notifications + Leaderboard
6. Admin dashboard (overview, users, plans, deposits, withdrawals, settings)
7. Realtime wiring + polish pass

# Runner context for the console

What the Runner control room (`src/RunnerControl.js`, `src/runnerOps.js`,
`electron/ops.js`) needs to know about Runner as of 16 Oct 2026. Update this
file the same day anything in Runner changes what the control room reads.

The full spec for what the control room should do, written for a
non-technical operator: "Runner Control Room: What It Must Do"
(https://claude.ai/code/artifact/736f173c-d109-4d48-9328-a2ae90b44f1c).

## Where Runner is

- Code: `~/Documents/Jcommerce/runner` (was `dorm-dash-web` until 15 Oct;
  the venture's folder must point at the new path), GitHub `JadanSpencer/Runner`.
  Read-only from here. Build record: `PWA_HANDOFF.md`; payments: `PAYMENTS_SETUP.md`.
- Firebase project `dormdash-71035` (permanent ID; the app is now called
  Runner everywhere else). Firestore database `(default)`.
- Site: `https://uwi-runner.online` since 16 Oct 2026 (Cloudflare registrar
  and DNS; the A record `199.36.158.100` must stay DNS only, grey cloud). The
  old `https://dormdash-71035.web.app` keeps working. The server reads the
  address from `APP_URL` in `functions/.env.dormdash-71035` (the web build from
  `EXPO_PUBLIC_APP_URL`); read it from there, don't hard-code an address.
- On the web the sign-in (auth) domain is whichever Runner address the page is
  on (`services/firebase.ts` `RUNNER_HOSTS`). Every Runner address must be an
  Authorized domain in Firebase Auth, an allowed domain on the reCAPTCHA
  Enterprise key, and a redirect URI (`/__/auth/handler`) on the OAuth web
  client. A missing one makes Google sign-in hang on the loading screen.
- Launch order: the website (PWA) first, Android (`com.jcommerce.runner`) and
  iPhone later.

## Source of truth for lists

`functions/src/shared.ts` holds order statuses, `ACTIVE_STATUSES`,
`IN_DELIVERY_STATUSES`, `CancelReason`, `PaymentStatus`, and every time limit
(`PAY_WINDOW_MS` 10 min, `PENDING_TIMEOUT_MS` 30 min, `STORE_CONFIRM_MS`
10 min, idle runner 2 h + 30 min, offer waves 3 runners / 45 s / open at
wave 3, `SOLD_OUT_MAX_MS` 14 h). Read these from the Runner folder through
`electron/venture.js` instead of copying them. Show unknown values as amber.

## Data the control room reads

| Collection | Fields that matter |
| --- | --- |
| `orders` | `status`, `cancelReason`, `fulfilment` ('pickup' or absent), `paymentMethod` ('tokens' = coins, 'card'), `paymentStatus` (unpaid, reserved, awaiting_payment, paid, released, refunded_tokens, refunded_card), `verifiedAt` (server), `acceptedAt`, `paidAt`, `payDeadline`, `storeAskedAt`, `storeAnswerBy`, `readyAt`, `deliveredAt`, `deliveryMins`, `dasherPayoutJmd`, `platformFeeJmd`, `receipt.code`, `refundAttemptFailed`, `refundAttemptReason` ('network_error' = outcome unknown), `groupId` |
| `payments` | `status` (pending, verified, paid, credited, review, failed), `reviewReason` (amount_short_*, currency_*, status_*), `failReason` ('gateway_not_set_up'), `purpose` ('order' or 'tokens'), `amountJmd`, `createdAt` |
| `walletTx` | `type` (order_reserve, order_charge, order_payment, order_release, order_refund, order_refund_card, topup_card, late_payment_credit, admin_adjust), `amountJmd`, `orderId`, `note`, `createdAt` |
| `floatTx`, `storeFloats/{storeId}`, `dashers/{uid}.floatJmd` | Store and runner floats; negative store float = owed to the store |
| `stores` | `isOpen`, `hours`, `model`, `colorNo`, `estimatedTime`, `offersPickup`, `pickupPointId` |
| `users` | `role` (student, dasher, store, admin), `dasherStatus` (pending, verified, rejected), `isActive`, `storeId` (store logins), `pushToken` (presence only) |
| `dashers` | `isOnline`, `activeOrderId(s)`, `lastSeenAt`, `offlineReason` |
| `publicStats/app` | `onlineDashers` |
| `launchCodes/{code}` | `createdAt`, `usedAt` (also `usedBy`, `usedByName`: not read). 100 at most; each gives 3 free deliveries once |
| `wallets/{uid}` | `freeDeliveries` (launch packs and referral rewards still held), `referralCount`, `launchPackAt` |
| `orders` (new) | `deliveryDiscountJmd` (a free delivery covered this much of the fee), `freeDeliveryHeld` |
| `walletTx` (new types) | `launch_pack`, `referral_reward` (+`freeDeliveries`), `free_delivery_used`, `free_delivery_returned` |

Server-only, never read by the console: `referralCodes`, `referrals`,
`launchCodeTries`. Private, never read: `orders/{id}/messages` (order chat
between a student and their runner) and `users.whatsapp`.

Fields that do NOT exist in Runner and are no longer checked (removed 14 Oct):
`payments.flagged`, `payments.needsReview`, `payments.refundFallback`.

## What changed in Runner on 14 Oct 2026

- ntfy store alerts removed: stores get pushes on their tablet login only.
  `storeAlerts/*` and the `storeAlertsAdmin` function are gone.
- WiPay removed. Card payments (Fygaro) are still not set up: every card
  attempt fails as `gateway_not_set_up`; coins are the only working payment.
- A signed Fygaro webhook that reports a failed status is held as `review`.
- A refund Fygaro did not answer logs "Card refund outcome unknown" (ERROR).
- App Check is enforced on callable functions (`APP_CHECK_ENFORCE=true`);
  Firestore and Auth are monitor-only until verified traffic stays at 98% or more.
- The 5-minute scheduler (`cancelStalePendingOrders`) runs each step
  separately, with a 300 s timeout.
- Account deletion clears `receipt.customerName` on past orders.

## What changed in Runner on 15–16 Oct 2026

- Referrals: a student's link (`{APP_URL}/?ref=CODE`); a friend counts when
  their first order is delivered (since 16 Oct; at sign-up before), and every
  5 counted friends earn 1 free delivery. Chat notifications are limited to
  one per sender per order every 10 s (`chatPushes/`, server-only). Launch codes: up to 100 one-time codes,
  3 free deliveries each, made in admin and printed as QR cards
  (`{APP_URL}/?launch=CODE`, claimed automatically after sign-in).
- New functions: `myReferral`, `claimLaunchCode`, `adminCreateLaunchCodes`,
  `onOrderMessage` (order chat notifications).
- Order chat between a student and their runner while an order is open.
- Store pages: the store's two metals blended; "Your last order here" reorder.
- 16 Oct incident: the Visa on the billing account was declined (Jamaican bank
  blocking an international online charge), Google **closed the billing
  account**, and every function returned 500/503 for a few hours while
  `billingInfo.billingEnabled` still said `true`. Fixed by paying the balance.
  The control room now checks the billing account's own `open` flag and asks
  two functions whether they answer.
- The unpaid balance itself can't be read through Google's API (no "past due"
  flag until the account closes), so `BILLING_DUE` in `src/runnerOps.js`
  holds a known unpaid bill as a red item at the top until the owner presses
  "Sorted"; the daily routine includes checking the billing page. The
  16 Oct balance (US$4.10, Visa •••• 8378 declined) was still unpaid at the
  end of that day.
- Old function images (Artifact Registry `gcf-artifacts`, us-central1 and
  us-east1) are now deleted after 1 day instead of 30, so repeated deploys
  don't build up storage cost.

## What changed in Runner on 19 Oct 2026

- **1 Runner coin = J$1** (was J$100). Balances were always stored in J$
  (`wallets.balanceJmd`), so no stored amount changed; only coin counts shown.
  Card packs are 500 / 1,000 / 2,000 / 5,000 coins.
- **Top-up cards** (`functions/src/topups.ts`): printed one-time codes worth
  J$100 / 250 / 500 / 750 / 1,000, sold for cash by named sellers.
  `topupBatches/{id}` (valueJmd, count, holder, redeemedCount, redeemedJmd,
  voidedCount) and `topupCards/{code}` (admin-readable); redeeming writes
  walletTx type `topup_redeemed`. Unredeemed value is capped at J$150,000
  (`TOPUP_OUTSTANDING_MAX_JMD`). Admin page: `/topup-cards`. Cash owed by a
  seller = that batch's `redeemedJmd`.

## Runner admin pages (for "open this page" buttons)

`/dashboard` (tab "Board": metrics, "Card payments to check" with Paid / Not
paid), `/launch-codes` (make codes, Print QR cards), `/stores`, `/manage-store/{id}`, `/users` (Deactivate, Adjust Runner
coins, Adjust float), `/verify-runners` (To verify / Verified / Rejected).
Store tablet: `/counter` (Orders), `/store-kitchen`, `/store-menu`, `/store-today`.

There is no admin Orders page: nobody can find or cancel an order from Runner
admin yet. Don't tell the operator to cancel there.

## How the control room reads all this (as built 14 Oct 2026)

- `electron/ops.js` reads at three speeds: every check (kept at least 1 min):
  open orders, today's orders, payments open/today, today's `walletTx` and
  `floatTx`, the website, the scheduler; every 10 min: stores, `storeFloats`,
  `dashers`, runner and store-login and admin `users`, server errors and push
  failures (Cloud Logging), last Hosting release, Cloud Functions list,
  monitoring alert policies, billing (project link **and** the billing
  account's `open` flag), Firestore backups, `shared.ts` lists, `APP_URL`,
  newest local commit, launch codes, wallets holding free deliveries, the
  custom domain (Hosting status, certificate, and a DNS lookup that its A
  record points straight at Firebase), and whether every Runner address is
  allowed in Auth's authorized domains and on the reCAPTCHA key; every hour: last 7 days of orders, sign-ups,
  App Check share (Cloud Monitoring), budgets; every 6 h: all `menuItems`.
  Every check also asks two callable functions (`claimLaunchCode`,
  `myReferral`) without signing in: 4xx means the server is up, 5xx or no
  answer means it is down. A first full check is about 90 reads; each check
  after that is a handful.
- Personal data read: runner `name` and `phone` (runner list, so the owner
  can call them) and admin `email` (admin list). Store logins' `pushToken` is
  reduced to yes/no in the main process. Student fields are never read
  (`studentId` only, never shown, to count first orders).
- Settings file: only the `APP_URL` line of `functions/.env.dormdash-71035`
  is read (a public address); every other line is ignored.
- Not connected (needs access the console doesn't have): GitHub checks and
  Dependabot updates (no GitHub sign-in), month-to-date spend (needs a
  billing export), budgets (Google's Budget API is switched off on the
  project; the screen links to switching it on).
- Kept on the Mac only (localStorage `jc_runner_local`): ticks, routines,
  "I'm handling this", "Sorted", expected admins, deletion requests, the
  alert log. Payouts are recorded in the console's own Finance.

## Speed on real phones (added 2026-10-20)
- Runner's website sends one anonymous speed report per visit to `perfReports` (Runner: `services/perf.web.ts` → `/api/perf` → `functions/src/perf.ts`). Reports are deleted after about 30 days by a Firestore TTL policy.
- `electron/ops.js` → `speed()`: last 7 days, newest 3,000, read every 6 hours (`SPEED_MS`), so it stays inside the free daily reads.
- `src/runnerOps.js` → `speed` in the result:
  - 75th-percentile figures per group (all, first or returning visit, Android, iPhone, computers, weak phones, slow connection, home-screen app, in-app browser), by page and by app version.
  - Alerts `run.speedReady` (first screen over 8 s) and `run.speedTaps` (taps over 500 ms) once there are `LIMITS.speedMin` (20) or more reports.
- `src/RunnerControl.js`: the "Speed on real phones" fold under "Is it running", coloured green, amber or red against Google's thresholds (LCP 2.5 s / 4 s, INP 200 ms / 500 ms, CLS 0.1 / 0.25; first screen 5 s / 8 s).
- Fields per report: release, page, role, firstVisit, installed, intro, os, browser, memoryGb, cores, net, saveData, lowPower, ttfb, fcp, lcp, inp, cls, ready, load, at, day. No personal data.

## Problem reports (added 2026-10-21)
- Students can report a delivered order (never arrived, items missing, wrong order, other) within 48 h. Runner stores it as `orders/{id}.problem` = { kind, note, at } (functions/src/problems.ts).
- `electron/ops.js` medium checks read orders with `problem.at` in the last 14 days (`problems`).
- `src/runnerOps.js` raises `orders.problems` (act). It resolves per order with `problem.<code>`, and excludes those orders from a runner's owed pay in `settle.runners` (`held`) until resolved.

## Launch on top-up cards, and app stores (added 2026-10-21)
- **"Before launch":**
  - The money group is now "Money: top-up cards (no card payments yet)": test one card from start to finish, make and print the batches, activate each at handover, brief the sellers, the cash routine, and card payments staying hidden.
  - "Test it like a student" adds: ordering with too few coins, adding a card on the pay screen, and reporting a problem.
- **App stores:** `STORE_STEPS` in `src/runnerOps.js` (Android: Google Play, 17 steps; iPhone: App Store, 7 steps) is drawn by `StoreSteps` in `src/RunnerControl.js` under Checklists, ticked in `local.ticks`.
  - The closed-test group has a start date (`local.closedTestStart`) and a counter (`CLOSED_TEST_DAYS` 14, `CLOSED_TEST_TESTERS` 12).
  - These are Google's rules for personal accounts as of Oct 2026. Organisation accounts (D-U-N-S) are exempt. A second, simpler app would not skip the test.

## Confirmed orders, cash and admin referrals (29 Oct 2026, Runner branch `confirmed-orders-cash-referrals`)

| Collection | Fields the control room reads |
| --- | --- |
| `orders` | `confirmedAt` (paid and final), `storeConfirmedAt`, `refundHeld` (a refund waiting for the owner), `paymentMethod` 'cash', `paymentStatus` 'cash_due' |
| `wallets` | `confirmedSpendJmd`, `cashEligibleAt`, `cashRevokedAt`, `cashRevokeReason`, `cashRefusals` |
| `cashIssues` | `orderId`, `studentId`, `storeName`, `amountJmd`, `mode`, `reporterRole`, `note`, `createdAt` |
| `adminReferralStats/{adminUid}` | `code`, `signups`, `orderingUsers`, `confirmedOrders`, `spendJmd`, `earnedJmd`, `paidJmd`, `clawbackJmd`, `reversedJmd` |
| `adminPayouts` | `adminUid`, `amountJmd`, `grossJmd`, `clawbackJmd`, `count`, `createdAt` |
| `dashers` | `cashOwedJmd` (cash a runner collected for Runner) |

Writes: only through Runner's `ownerAction` endpoint (`electron/ops.js` ownerAction): revokeCash, restoreCash, payAdminCommissions, reverseOrder. The Runner control room's "Cash & referrals" tab uses them. Customer names are read for the cash list only.

j-commerce.online is a venture (added once) with a Tech tab: Vercel domain settings with a Vercel token (encrypted on this Mac), and request checks from this Mac every 5 minutes while the tab is open.

## 2026-10-29
- Admin referral commission is 2.5% of confirmed orders (was 5%) + J$100 first-order bonus.
- Control room → Is it running → "Every server function": each Cloud Function's state and its errors over 24 h (Cloud Functions v2 list + Logging, read every 10 minutes). A function not ACTIVE raises "Act now".
- Control room → Money → "Money due": what Runner owes (stores' negative floats, runners' delivery shares since last recorded payout, admin commission earned and unpaid), runners holding cash (`dashers.cashOwedJmd`), cash from redeemed top-up cards per seller (`topupBatches`, all time), and unpaid cash orders.
- XP: +2 per service stamped on the daily rounds (`service_rounds`) and +5 per control-room routine ticked (new collection `control_ticks`, one doc per routine per day), counted from 2026-10-29.
- Admin runners (Runner functions/src/adminRunners.ts): `coinStock/{uid}` (balanceJmd, allocatedJmd, returnedJmd, soldJmd, cashInJmd, cashOwedJmd, lastSaleAt) read in the trust part; Money → Money due shows cash owed for coins sold and a table per admin runner, flagged when allocated ≠ sold + returned + in stock. They also appear in Admin referrals as "Name (admin runner)".
- Admin commission (from 29 Oct 2026, later the same day): 2.5% of each confirmed order's delivery or pickup fee, not the food; no first-order bonus. `adminCommissions` docs gain `basis: 'fee'` and `feeJmd`.
- WhatsApp assistant (30 Oct 2026, Runner functions/src/whatsapp.ts): `whatsappStats/{YYYY-MM-DD}` (messages, inputTokens, outputTokens, cacheReadTokens). Is it running shows this month's messages and estimated AI cost. If the bot's model changes, update the prices in runnerOps.js.

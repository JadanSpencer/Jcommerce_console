# Runner context for the console

What the Runner control room (`src/RunnerControl.js`, `src/runnerOps.js`,
`electron/ops.js`) needs to know about Runner as of 14 Oct 2026. Update this
file the same day anything in Runner changes what the control room reads.

The full spec for what the control room should do, written for a
non-technical operator: "Runner Control Room: What It Must Do"
(https://claude.ai/code/artifact/736f173c-d109-4d48-9328-a2ae90b44f1c).

## Where Runner is

- Code: `~/Documents/Jcommerce/dorm-dash-web`, GitHub `JadanSpencer/Runner`.
  Read-only from here. Build record: `PWA_HANDOFF.md`; payments: `PAYMENTS_SETUP.md`.
- Firebase project `dormdash-71035` (permanent ID; the app is now called
  Runner everywhere else). Firestore database `(default)`.
- Site: `https://dormdash-71035.web.app` until a domain is bought. The server
  reads the address from `APP_URL` in `functions/.env.dormdash-71035`; read it
  from there, don't hard-code `${project}.web.app`.
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

## Runner admin pages (for "open this page" buttons)

`/dashboard` (tab "Board": metrics, "Card payments to check" with Paid / Not
paid), `/stores`, `/manage-store/{id}`, `/users` (Deactivate, Adjust Runner
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
  monitoring alert policies, billing, Firestore backups, `shared.ts` lists,
  `APP_URL`, newest local commit; every hour: last 7 days of orders, sign-ups,
  App Check share (Cloud Monitoring), budgets; every 6 h: all `menuItems`.
  A first full check is about 90 reads; each check after that is a handful.
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

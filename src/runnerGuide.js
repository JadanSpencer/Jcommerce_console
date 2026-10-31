// src/runnerGuide.js
// The Runner guide: everything a person with no software background needs to
// run the platform, in the order they will need it. Text only, so it can be
// checked against Runner without touching the screen code.
//
// Links inside text: [Label](/path) opens Runner admin, [Label](fb:/path)
// Firebase, [Label](gc:/path) Google Cloud, [Label](tab:cash) a tab here,
// [Label](https://...) any other site. Update this file the same day Runner
// changes a screen, a button or a rule (see RUNNER_CONTEXT.md).

export const BASICS = [
  { id: 'what', title: 'What Runner is', body: [
    'Runner is a food and errand delivery service for UWI Mona. Students order on uwi-runner.online, or through WhatsApp once the assistant is live. Stores make the food, runners carry it, and Runner takes a small share of each delivery fee.',
    'Four kinds of people use it: students, runners, stores on a tablet, and admins. You are the admin. This console watches everything and tells you when a person is needed.',
    'Runner moves money by itself and keeps a record of every change. Your job is to keep stores open, keep runners online, verify what only a person can verify, and settle cash.',
  ] },
  { id: 'order', title: 'The life of an order', steps: [
    'A student places an order. Their coins are held, not spent. They can still cancel for free.',
    'The store says yes on its tablet. It has 10 minutes. If it doesn\'t answer, the order is cancelled and the coins go back.',
    'Runners get the order: 3 at a time, 3 more every 45 seconds, then everyone after about 2 minutes. If nobody takes it in 30 minutes, it is cancelled and the coins go back.',
    'The first runner to accept confirms the order. Coins are charged now. From here it is paid and final. For pickup, the store\'s yes confirms it.',
    'The runner collects the food, heads to the student, and marks it delivered.',
    'The student has 48 hours to report a problem. A report turns the console red and holds that runner\'s pay for the order.',
  ], after: 'Batch kitchens are different: students choose a pickup time, the kitchen gets one list per time, and runners get the order 25 minutes before that time.' },
  { id: 'in', title: 'How money comes in', steps: [
    'Top-up cards: a seller sells a printed card for cash and the student scans it. The seller owes you the value of every redeemed card.',
    'Admin runners: a trusted runner sells coins for cash from a stock you gave them. They owe you the cash.',
    'By hand: someone pays you cash and you add coins with "Adjust Runner coins".',
    'Cash on delivery: customers who have spent J$5,000 in coins can pay cash, up to J$3,000 an order. The runner collects it and owes it to Runner.',
    'Bank transfer: WhatsApp customers only, once the assistant is live. A person checks the bank before it counts.',
    'Card payments: switched off until Fygaro is finished.',
  ], after: '1 Runner coin is J$1. Coins are prepaid money that Runner owes the student until they spend it.' },
  { id: 'out', title: 'How money goes out', steps: [
    'Stores: the food cost of each order. It comes out of the store\'s float if it has one. A negative float is what you owe them.',
    'Runners: their share of the delivery fee, which you pay by hand each week. Delivery fees run from J$300 to J$700. On a J$300 fee the runner gets J$250 and Runner keeps J$50.',
    'Admins and admin runners: 2.5% of the delivery or pickup fee on orders from people who signed up with their code.',
    'Pickup orders cost the student a J$100 fee. Ask Runner orders add a J$100 shopping fee on top of the walk.',
  ], after: 'None of this leaves the app by itself. You pay people, then record it here so the sums stay right.' },
  { id: 'rules', title: 'Six rules that keep you safe', steps: [
    'Never change money, balances or floats directly in the Firebase console. Use Runner admin or the buttons here.',
    'Never approve a bank transfer from the picture alone. See the money in the bank first.',
    'Confirmed orders are not refunded. The only exceptions are a store calling the order off, or a reversal you approve.',
    'Never activate a top-up card batch until the seller has counted the cards in front of you.',
    'Never put a new version live between 11 am and 2 pm, during exams, or the day before an event.',
    'If a screen says "Couldn\'t check", that means unknown, not fine. Press Refresh, and tell the developer if it stays.',
  ] },
];

// Every place an admin goes, what is on it
export const PLACES = [
  ['Board', '/dashboard', 'Numbers, card payments to check, bank transfers to verify, and tiles for everything below.'],
  ['Stores', '/stores', 'Add, edit, open, close or delete a store. Adjust a store\'s float. "Menu items" opens the page below.'],
  ['A store\'s Menu items page', null, 'Reached from Stores → Menu items. Menu, photos, batch kitchen and today\'s menu, pickup, water runs and tablet logins.'],
  ['Users', '/users', 'Find anyone by name or email. Adjust Runner coins, adjust float, deactivate, make admin runner, give coins, cash handed in.'],
  ['Runner verification', '/verify-runners', 'New runners waiting for approval, with their UWI ID and phone number.'],
  ['Store applications', '/sellers', 'Businesses asking to join, and the "Students asked for" list from Ask Runner.'],
  ['Bank transfers', '/transfers', 'WhatsApp transfers to approve or reject. It also appears as a card on the Board when one is waiting.'],
  ['Top-up cards', '/topup-cards', 'Make, print, activate and void batches. "Check a card" looks up any code.'],
  ['Launch codes', '/launch-codes', 'Up to 100 one-time codes worth 3 free deliveries each, with printable QR cards.'],
];
export const OTHER_SCREENS = [
  ['Store tablet: Orders', 'New orders with a chime. "We can make it", "Can\'t make it", "Ready for the runner" and "Can\'t make it after all".'],
  ['Store tablet: Kitchen', 'Mark items sold out, set "Ready in" waits, and count stock.'],
  ['Store tablet: Menu', 'The store edits its own items and prices.'],
  ['Store tablet: Today', 'The day\'s orders, best sellers, and its statement with Runner.'],
  ['Store tablet: Batch', 'Only for batch kitchens. The cooking list for each pickup time, labels and a pause switch.'],
  ['Runner app', 'Go online, accept orders, move each order along, "Cash paid, delivered" or "Not paid". Admin runners also get a Coin desk under Profile.'],
  ['Student Profile', 'Add coins, referral link, How Runner works, and Account controls (deactivate or delete).'],
];

export const GROUPS = ['Orders', 'Coins and cash', 'Paying people', 'Stores', 'Runners and customers', 'WhatsApp', 'Website and updates'];

// q: the question. steps: what to do. say: words to use. never: the mistake to avoid.
export const HOWTO = [
  // ── Orders ────────────────────────────────────────────────────────────────
  { group: 'Orders', id: 'find', q: 'Find an order and see what happened to it', keys: 'look up search code receipt status where',
    steps: ['Get the 6-character order code from the customer. It is on their receipt, such as A7K2QD.', 'Type it into [Find an order](tab:now) on the Now tab.', 'You will see where the order is, how it was paid, the times of each step and what you can do next.'] },
  { group: 'Orders', id: 'where', q: 'A customer asks "Where is my order?"', keys: 'late slow waiting delayed',
    steps: ['Look it up with [Find an order](tab:now).', 'Waiting for the store: call the store. Its number is on the [People](tab:people) tab under Stores.', 'Waiting for a runner: message the runners\' WhatsApp group.', 'With a runner: call the runner. Their number shows on the order and under Runners.'],
    say: 'Let me check that for you now. Your order is with [the store / the runner]. I\'ll message you as soon as it moves.' },
  { group: 'Orders', id: 'cancel-new', q: 'Cancel an order nobody has confirmed yet', keys: 'stop pending unconfirmed customer changed mind',
    steps: ['First choice: ask the customer to cancel it on their Orders tab. It is free before confirmation.', 'If you do nothing, Runner cancels it by itself: after 10 minutes if the store doesn\'t answer, 30 minutes if no runner takes it.', 'Only if it must stop now, follow "An order must be cancelled" under [When something breaks](tab:handbook).'],
    never: 'Never change anything on the order except status and cancelReason.' },
  { group: 'Orders', id: 'reverse', q: 'Undo a confirmed order that can\'t be completed', keys: 'reversal reverse refund confirmed food lost runner disappeared',
    steps: ['Look it up with [Find an order](tab:now). The reversal box appears if the order can be reversed.', 'Type the reason and press Approve reversal.', 'The customer gets their money back as coins, and the store and runner are told. Their spend and any commission are taken back.'],
    never: 'A delivered order can\'t be reversed. See "A student says a delivered order was wrong".' },
  { group: 'Orders', id: 'problem', q: 'A student says a delivered order was wrong or never came', keys: 'problem report missing items wrong not received complaint',
    steps: ['The report shows in red on the Now tab, and that runner\'s pay for the order is held.', 'Look up the order, then speak to the student and the runner.', 'If the student is right, open [Users](/users), find them, press Adjust Runner coins and add the amount. Put the order code in the note.', 'If the runner was at fault, pay them that much less. Press "Sorted, hide it" only after that, because sorting releases the hold.', 'If a runner keeps getting reports, deactivate them.'] },
  { group: 'Orders', id: 'refund', q: 'A customer wants a refund', keys: 'money back no refunds policy changed mind',
    steps: ['Before confirmation they can cancel for free, and nothing was charged.', 'After confirmation there are no refunds unless the store calls it off or you approve a reversal because the order can\'t be completed.', 'Refunds are paid as Runner coins, not cash.'],
    say: 'Once an order is confirmed it\'s paid and final, as the app shows at checkout. If something went wrong with it, tell me what happened and I\'ll look into it.' },
  { group: 'Orders', id: 'nobody', q: 'Orders are waiting and nobody is taking them', keys: 'no runners piling queue',
    steps: ['Message the runners\' WhatsApp group and name the store.', 'If no runners can come, ask open stores to switch to closed until someone is free.', 'Orders left for 30 minutes cancel by themselves and the coins go back.'] },
  { group: 'Orders', id: 'cash-refused', q: 'A customer didn\'t pay cash on delivery', keys: 'cash refused unpaid not paid',
    steps: ['The runner taps "Not paid". The order is cancelled and logged under [Cash & referrals](tab:cash).', 'Tell the runner to keep the food safe, and contact the customer.', 'If they don\'t pay, press Take cash away beside their name. WhatsApp cash already stops for them after an unpaid order.'] },

  // ── Coins and cash ────────────────────────────────────────────────────────
  { group: 'Coins and cash', id: 'give-coins', q: 'Someone gave me cash: add coins for them', keys: 'top up add balance manual',
    steps: ['Take the cash and give them a receipt number.', 'Open [Users](/users) and search their name or email.', 'Press Adjust Runner coins, type the coins (J$2,000 cash = 2000 coins) and a note such as "Cash J$2,000, receipt 014".', 'At day\'s end, match your cash against Money → Cash top-ups added by hand.'] },
  { group: 'Coins and cash', id: 'take-coins', q: 'Take coins back after a mistake', keys: 'remove wrong amount correction minus',
    steps: ['Open [Users](/users) and find the person.', 'Press Adjust Runner coins and type a minus amount, such as -500.', 'Write why in the note.'] },
  { group: 'Coins and cash', id: 'card-fail', q: 'A student says their top-up card doesn\'t work', keys: 'scan invalid code redeemed held',
    steps: ['Ask for the code on the card.', 'Open [Top-up cards](/topup-cards), go to "Check a card", type the code and press Check.', 'It says whether the card is held, active, used or void.', 'Held: the batch was never activated, so ask the seller. Used: it shows who used it and when. Void: it was cancelled, so the seller must replace it.'] },
  { group: 'Coins and cash', id: 'make-cards', q: 'Make, print and hand out top-up cards', keys: 'batch seller print activate',
    steps: ['Open [Top-up cards](/topup-cards) on a computer.', 'Under "Make a batch", choose the value, how many (10 to a sheet) and the seller\'s name.', 'Print the batch once and save it as a PDF. Print again only if you must: duplicates share a code.', 'Count the cards with the seller, then press "Activate (handed to seller)".', 'Tell the seller to keep the cards in an envelope and never photograph the codes.'],
    never: 'Don\'t activate before handover. Until then a lost card is worthless, which is the point.' },
  { group: 'Coins and cash', id: 'void', q: 'A seller lost cards or stopped selling', keys: 'void cancel batch lost stolen',
    steps: ['Open [Top-up cards](/topup-cards) and find their batch.', 'Press "Void unredeemed". Cards already used stay used; the rest stop working.', 'Collect the cash for every card redeemed so far. Money → Money due shows the total.'] },
  { group: 'Coins and cash', id: 'settle-seller', q: 'Collect cash from a top-up card seller', keys: 'seller owes settle weekly',
    steps: ['Open [Money](tab:money) and look at the Card seller table.', 'It shows all redeemed value since the start, so take off what they have already given you.', 'Keep your own note of what each seller has handed in. Runner doesn\'t track that part for card sellers.'] },
  { group: 'Coins and cash', id: 'admin-runner', q: 'Set up an admin runner to sell coins', keys: 'coin desk stock trusted sell allocate',
    steps: ['They must be a verified runner.', 'Open [Users](/users), find them and press Make admin runner.', 'Press Give coins and enter how many, up to 50,000 in stock.', 'They sell from Profile → Coin desk: find the student, enter the coins, confirm.', 'Each coin sold means they owe you J$1 cash.'] },
  { group: 'Coins and cash', id: 'coin-cash', q: 'An admin runner handed me cash', keys: 'cash handed in stock owed take back',
    steps: ['Count it.', 'Open [Users](/users), find them and press Cash handed in, then enter the J$ and a note.', 'To take unsold coins back, press Give coins and use a minus amount.', 'On the [Money](tab:money) tab, each row must add up: given = sold + taken back + in stock.'] },
  { group: 'Coins and cash', id: 'cash-trust', q: 'Stop someone paying cash, or let them back', keys: 'revoke restore eligible unlock trust',
    steps: ['Open [Cash & referrals](tab:cash) and find the customer.', 'To stop them: type why, then press Take cash away.', 'To let them back: press Give cash back.', 'Customers unlock cash by themselves after J$5,000 of confirmed coin spend. There is no button to unlock it early.'] },
  { group: 'Coins and cash', id: 'held-refund', q: 'A refund is held for me', keys: 'refund held waiting decision',
    steps: ['A confirmed order was cancelled in a way Runner doesn\'t refund by itself. It shows under [Cash & referrals](tab:cash).', 'Decide if the customer should be paid back.', 'If yes, use Adjust Runner coins in [Users](/users) with the order code in the note.', 'Press "Sorted, hide it" on the alert.'] },
  { group: 'Coins and cash', id: 'free', q: 'Launch codes and referrals', keys: 'free delivery friend invite link bonus coins',
    steps: ['Launch codes: [make them here](/launch-codes), up to 100 ever. Each gives one student 3 free deliveries.', 'Print the QR cards on a computer. Test-scan one before handing them out.', 'Referrals look after themselves. A student shares their link from Profile. Every 5 friends who sign up earn them 200 coins. A phone number counts once.'] },

  // ── Paying people ─────────────────────────────────────────────────────────
  { group: 'Paying people', id: 'pay-runner', q: 'Pay a runner', keys: 'payout weekly delivery share wages',
    steps: ['Open [Money](tab:money) → Settling up → Runners.', 'Pay them the amount shown, outside Runner.', 'Press Record payout. The list then starts again from that day.', 'Orders with an open problem report are held and left out.'],
    never: 'Only the last 7 days are read, so settle at least once a week.' },
  { group: 'Paying people', id: 'pay-store', q: 'Pay a store', keys: 'settle food cost owed float negative',
    steps: ['Open [Money](tab:money) → Settling up → Stores.', 'Pay them what "Runner owes" shows.', 'Press Record payment.', 'Then reset the float: [Stores](/stores) → Adjust float, with a note.'] },
  { group: 'Paying people', id: 'pay-admin', q: 'Pay admin referral commission', keys: 'commission admin code earned',
    steps: ['Open [Cash & referrals](tab:cash) → Admin referrals.', 'Pay them the amount on the button, outside Runner.', 'Press Mark paid. Anything held back is taken off automatically.'] },
  { group: 'Paying people', id: 'float', q: 'Give a store or runner a float', keys: 'advance float cash buy food low',
    steps: ['Give them the cash.', 'Store: [Stores](/stores) → Adjust float. Runner: [Users](/users) → Adjust float.', 'Enter the J$ and a note. Use a minus amount to reduce it.', 'A float should cover about 5 orders. The console warns when one drops below that.'] },

  // ── Stores ────────────────────────────────────────────────────────────────
  { group: 'Stores', id: 'add-store', q: 'Add a new store', keys: 'create onboard new business shop',
    steps: ['Open [Stores](/stores) and add a store, or approve it from [Store applications](/sellers) and press Open the store.', 'Fill in the name, photo, phone, hours and estimated time. Write hours like "Mon-Fri 8am-9pm, Sat 8am-5pm".', 'Choose its Food spot on campus. Without one, every delivery there is charged the J$400 fallback fee.', 'Choose How it works, then Create store.', 'Press Menu items on the store. Add its menu with prices and photos.', 'Under "Pickup, water runs and store logins", press Add a login. Write the password on the store\'s card now, as it is never shown again.', 'Sign in on the tablet and allow notifications.', 'Place one test order.'] },
  { group: 'Stores', id: 'login', q: 'A store forgot its password', keys: 'tablet login reset sign in',
    steps: ['Open [Stores](/stores) and press Menu items on the store.', 'Under "Pickup, water runs and store logins", press New password.', 'Write it down at once, then sign the tablet back in.'] },
  { group: 'Stores', id: 'open', q: 'Open or close a store', keys: 'closed hours switch shut holiday',
    steps: ['The store can switch this on its tablet.', 'You can too: open [Stores](/stores) and press its status button.', 'Students can\'t order from a closed store, whatever its hours say.'] },
  { group: 'Stores', id: 'menu', q: 'Add or change a menu item and its photo', keys: 'price item photo upload image dish options',
    steps: ['Open [Stores](/stores) and press Menu items on the store. Press Add item, or Edit on an item.', 'Fill in the name and price, then choose a photo. iPhone photos and large photos are fine.', 'If a photo fails, press Try again. It keeps the photo. If removing the background fails, the photo is saved with its background.', 'Turn off "Available now" to hide an item from students.', 'To sell one item at several stores, use "Sell at other stores too".'] },
  { group: 'Stores', id: 'sold-out', q: 'An item ran out', keys: 'stock unavailable finished plates',
    steps: ['The store marks it on the tablet\'s Kitchen tab.', 'Sold out clears itself after 14 hours.', 'Students see "Only N left" at 5 or fewer if the store is counting stock.'] },
  { group: 'Stores', id: 'batch-setup', q: 'Set up a batch kitchen such as Social Welfare', keys: 'daily menu pickup times slots batch cook shop',
    steps: ['Open [Stores](/stores) and press Menu items on the store.', 'Under "Batch kitchen and today\'s menu", switch on Daily menu.', 'Enter pickup times in 24-hour time, such as 12:00, 12:45, 13:30.', 'Switch on "No yes/no tap on the tablet" if the kitchen wants plate counts alone to confirm delivery orders.', 'Press Save settings, then add the usual dishes with the menu editor.', 'Set the tablet on the Batch tab and pair the label printer.'],
    never: 'Never ask them to show you their own orders, till or customers. Runner staff stay out of their kitchen.' },
  { group: 'Stores', id: 'daily', q: 'Put today\'s menu up for a batch kitchen', keys: 'morning dishes plates whatsapp menu',
    steps: ['Read today\'s menu from the store\'s WhatsApp message.', 'Open [Stores](/stores), press Menu items on the store, then find "Batch kitchen and today\'s menu".', 'Tick each dish and type the plates. Leave plates blank if they aren\'t counted.', 'New dish? Add it with the menu editor first.', 'Do it before 9 am. The console turns amber at 9 and red at 10:30 if nothing is up.'] },
  { group: 'Stores', id: 'labels', q: 'Print batch labels', keys: 'label printer bluetooth',
    steps: ['On the tablet, open the Batch tab.', 'Once ordering for a time closes, press Print labels on that time\'s card.', 'Labels show the code, first name, time, drop-off and items. They never show a phone number.'] },
  { group: 'Stores', id: 'water', q: 'Turn on pickup or water runs for a store', keys: 'collect counter 5-gallon',
    steps: ['Open [Stores](/stores) and press Menu items on the store.', 'Under "Pickup, water runs and store logins", switch on "Students can collect here" or "5-gallon water runs".', 'Pickup needs a tablet login, or pickup orders are refused.', 'Water runs need the water items on the store\'s menu.'] },
  { group: 'Stores', id: 'apply', q: 'A business applied to join', keys: 'seller application approve decline suggestion',
    steps: ['Open [Store applications](/sellers).', 'Call or WhatsApp them from the buttons on their application.', 'Press Approve, then Open the store, and finish its setup. Or press Decline and note why.', 'The "Students asked for" list shows places students want.'] },

  // ── Runners and customers ─────────────────────────────────────────────────
  { group: 'Runners and customers', id: 'verify', q: 'Approve a new runner', keys: 'verify uwi id reject recruit join',
    steps: ['Open [Runner verification](/verify-runners).', 'Check the 9-digit UWI ID and the Jamaican phone number look real. Call or WhatsApp if unsure.', 'Press Verify, or Reject with a reason. The runner sees the reason.', 'Add them to the runners\' WhatsApp group and go through the rules.'] },
  { group: 'Runners and customers', id: 'deactivate', q: 'Stop a runner or customer using Runner', keys: 'ban remove suspend block misuse',
    steps: ['Open [Users](/users) and find them.', 'Press Deactivate account. They are signed out everywhere within an hour.', 'Press Reactivate account to undo it.'] },
  { group: 'Runners and customers', id: 'delete-account', q: 'Someone wants their account deleted', keys: 'privacy delete data remove gdpr',
    steps: ['Note the request under People → Students. Runner promises to act within 30 days.', 'Ask them to open Profile → Account controls → Delete account.', 'If they can\'t sign in, send the request to the developer. Runner admin has no delete button.', 'Tick it done when it is finished.'] },
  { group: 'Runners and customers', id: 'admin', q: 'Add or remove an admin', keys: 'access permission role partner',
    steps: ['Admin can see and change everything, so keep it to you and at most one trusted person.', 'It can only be changed by hand: [Firebase → Firestore → users](fb:/firestore/databases/-default-/data/~2Fusers), their document, field role.', 'Afterwards go to People → Admin accounts and press "These are all expected".', 'A removed admin should also be disabled in [Firebase → Authentication](fb:/authentication/users).'] },

  // ── WhatsApp ──────────────────────────────────────────────────────────────
  { group: 'WhatsApp', id: 'transfer', q: 'Check a bank transfer', keys: 'bank proof receipt picture pdf verify approve reject',
    steps: ['Open your bank app and find the money. Never go by the picture.', 'Open [Bank transfers](/transfers). A PDF receipt opens with its link.', 'Money there: press "It\'s in the bank", enter what really arrived and the bank\'s reference.', 'Not there: press Reject. The customer is told and offered cash.', 'Do this within 30 minutes, or the customer is offered cash instead.'] },
  { group: 'WhatsApp', id: 'person', q: 'A WhatsApp customer asked for a person', keys: 'human help support',
    steps: ['Admins get a notification with their full number.', 'Reply from Runner\'s WhatsApp Business account.'] },
  { group: 'WhatsApp', id: 'golive', q: 'Put the WhatsApp assistant live', keys: 'meta number setup launch keys secrets',
    steps: ['This is a developer-level job. Tick through Handbook → Before-launch list → WhatsApp assistant and batch kitchens.', 'The full guide is docs/WHATSAPP_ORDERING.md in the Runner folder.', 'The one step that must not be skipped: Runner\'s number needs its own webhook, or the D&D bot answers Runner\'s customers.', 'Have about 30 real test conversations before telling customers.', 'Then add EXPO_PUBLIC_WHATSAPP_NUMBER=1876XXXXXXX (Runner\'s number) to the .env file in the Runner folder, run npx expo export --platform web --clear, then npm run deploy:web. "Order on WhatsApp" then shows in the app. Remove the line and run both again to hide it.'] },
  { group: 'WhatsApp', id: 'bot-off', q: 'Switch the WhatsApp assistant off', keys: 'stop bot disable emergency',
    steps: ['Set WHATSAPP_BOT_ENABLED to false in functions/src/shared.ts.', 'Run firebase deploy --only functions in the Runner folder.', 'Orders already placed carry on as normal orders.'] },

  // ── Website and updates ───────────────────────────────────────────────────
  { group: 'Website and updates', id: 'deploy', q: 'Put a new version live', keys: 'deploy update release publish',
    steps: ['Pick a quiet hour: not 11 am to 2 pm.', 'Open Terminal and type: cd ~/Documents/Jcommerce/runner', 'Run npm run check. Stop if it fails.', 'Run npm run deploy:data for the database rules, indexes and photo rules.', 'Run npm run deploy:all for the website and server.', 'Check this screen is All good, and place one real test order.', '[Is it running](tab:running) → "Waiting to go live" shows whether anything is left.'] },
  { group: 'Website and updates', id: 'rollback', q: 'A new version broke the website', keys: 'undo rollback revert bad deploy',
    steps: ['Open [Firebase Hosting](fb:/hosting/sites) and choose the site.', 'Under Release history, find the previous release and choose Rollback.', 'That only undoes the website. Server and rules problems need the developer.', 'Write down the time it started.'] },
  { group: 'Website and updates', id: 'relogin', q: 'The console says it can\'t see Runner', keys: 'login firebase sign in expired couldn\'t check',
    steps: ['Open Terminal and type firebase login --reauth, then press Enter.', 'Sign in with the Google account that owns Runner.', 'Come back here and press Refresh.'] },
  { group: 'Website and updates', id: 'bill', q: 'Keep the Google bill from stopping Runner', keys: 'billing card declined payment cost',
    steps: ['A declined card can close the billing account, which stops the server even though the website still loads. It happened on 16 Oct 2026.', 'Check [billing](gc:/billing/linkedaccount) every day until there is a backup card.', 'Ask your bank to allow international online charges from Google Cloud.'] },
];

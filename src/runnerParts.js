// src/runnerParts.js
// Everything Runner runs on: accounts, keys, versions. Kept by the developer from
// what was checked on CHECKED; never a key's value, only its name, where it lives
// and how it is limited. 'ask' rows are questions for the owner, with where to look.
// When the owner answers, the developer updates the row and CHECKED.
export const CHECKED = '2 Nov 2026';

const gc = p => `https://console.cloud.google.com${p}?project=dormdash-71035`;
const fb = p => `https://console.firebase.google.com/project/dormdash-71035${p}`;

export const PARTS = [
  { title: 'Accounts', rows: [
    { id: 'gcp', name: 'Google Cloud and Firebase project', value: 'dormdash-71035, shown as "Runner". The id never changes. Owned by the Google account sp3nc3rjadan29@gmail.com (the only owner, checked 2 Nov 2026); sign in with that one for Firebase and Google Cloud.', status: 'ok', link: fb('/overview') },
    { id: 'billing', name: 'Google billing account', value: '018CA0-F12138-6A8B2A: open and paying for Runner, card ending 8378. Its only admin is sp3nc3rjadan29@gmail.com: pay and change the card while signed in as that account (pay.google.com for the card). Past due on 1 Nov 2026 and still unpaid on 2 Nov. 01EDEA-BE8411-E6B70B is the old, closed one.', status: 'look', link: 'https://console.cloud.google.com/billing/018CA0-F12138-6A8B2A/payment' },
    { id: 'expo', name: 'Expo (builds the phone app)', value: 'Project @jcommerce-and-tech/dormdash, owned by the jcommerce-and-tech account. Free plan: 15 Android and 15 iPhone builds a month, reset on the 1st.', status: 'ok', link: 'https://expo.dev/accounts/jcommerce-and-tech/projects/dormdash' },
    { id: 'github', name: 'Code on GitHub', value: 'JadanSpencer/Runner and JadanSpencer/Jcommerce_console.', status: 'ok', link: 'https://github.com/JadanSpencer/Runner' },
    { id: 'company', name: 'Jcommerce & Tech: Companies Office', value: 'Registered (owner, 2 Nov 2026). D-U-N-S number not requested yet: a task in the checklist.', status: 'look' },
    { id: 'play', name: 'Google Play developer account', value: 'Personal account (no D-U-N-S number yet; the business is registered). Identity verification keeps failing; the owner is emailing support. Closed testing not started: a personal account needs 12 testers for 14 days before going public. The store build waits until online payments work in the app.', status: 'look', link: 'https://play.google.com/console' },
    { id: 'apple', name: 'Apple developer account', value: 'None yet. Needed (US$99 a year) before an iPhone app.', status: 'ok' },
    { id: 'anthropic', name: 'Anthropic (the AI behind the WhatsApp bot)', value: 'jcommerceandtech@gmail.com, Jcommerce\'s Individual Org: US$8.44 credit, auto-reload on (2 Nov 2026). Runner\'s key set on 31 Oct is not from this org, so it is being replaced with "runner-whatsapp"; D&D\'s key expired on 10 Oct and is being replaced with "dnd-bot". New keys: expiry Never. Model: claude-opus-5-5.', status: 'look', link: 'https://console.anthropic.com/settings/billing' },
    { id: 'meta', name: 'Meta business and WhatsApp', value: 'Shared with the D&D bot. Runner\'s own number waits on a new SIM. App ID, WhatsApp Business Account and payment method: a task in the checklist.', status: 'look', link: 'https://developers.facebook.com/apps' },
    { id: 'cloudflare', name: 'Domain uwi-runner.online', value: 'Registered with Cloudflare on 16 Oct 2026, paid until 16 Oct 2027, locked against transfer. Cloudflare runs its DNS (DNS only, grey cloud; keep it that way). Auto-renew: a task in the checklist.', status: 'look', link: 'https://dash.cloudflare.com' },
    { id: 'photoroom', name: 'Photoroom (cleans up menu photos)', value: 'Key set in Runner on 7 Oct 2026. Plan and monthly limit: a task in the checklist.', status: 'look', link: 'https://www.photoroom.com/api' },
    { id: 'fygaro', name: 'Fygaro (card payments, still hidden)', value: 'The Fygaro key set in Runner on 3 Oct 2026 is a test key (owner, 2 Nov). Card payments stay off until a live key replaces it.', status: 'ok' },
    { id: 'wipay', name: 'WiPay (old payment provider)', value: 'A WiPay key (2 versions, 24 Sep 2026) is still stored, and Runner\'s code no longer uses it. The owner is emailing WiPay\'s admin; then the developer can disable the stored key (it can be turned back on).', status: 'look' },
  ] },
  { title: 'Server keys (Secret Manager): names and dates only', rows: [
    { id: 's-anthropic', name: 'ANTHROPIC_API_KEY', value: 'Version 1, set 31 Oct 2026.', status: 'ok' },
    { id: 's-wa', name: 'WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_APP_SECRET, WHATSAPP_VERIFY_TOKEN', value: 'Version 1 each, set 31 Oct 2026, before Runner had its own number. The token and number id must be set again for Runner\'s number.', status: 'look' },
    { id: 's-photoroom', name: 'PHOTOROOM_API_KEY', value: 'Version 1, set 7 Oct 2026.', status: 'ok' },
    { id: 's-fygaro', name: 'FYGARO_API_SECRET', value: 'Version 1, set 3 Oct 2026.', status: 'ok' },
    { id: 's-wipay', name: 'WIPAY_API_KEY', value: 'Versions 1 and 2, 24 Sep 2026. Not used by the code.', status: 'look' },
  ], note: 'Open with Google Cloud → Security → Secret Manager. Never paste a value into chat or a file.', link: gc('/security/secret-manager') },
  { title: 'Google API keys: how each is limited', rows: [
    { id: 'k-maps-android', name: 'DormDashMapsAndroidApiKey (14 Jul 2026)', value: 'Android Maps only. Allows com.dormdash.app (2 old fingerprints) and, since 2 Nov 2026, com.jcommerce.runner with Expo\'s signing SHA-1 FE:59:01…7B:3A.', status: 'ok' },
    { id: 'k-maps-ios', name: 'DormDashMapsIOSApiKey (20 Jul 2026)', value: 'iPhone Maps only, for com.dormdash.app and (since 2 Nov 2026) com.jcommerce.runner.', status: 'ok' },
    { id: 'k-signing', name: 'Expo\'s Android signing key (com.jcommerce.runner)', value: 'SHA-1 FE:59:01:87:90:F3:D5:8E:9D:49:F7:5D:60:F2:CA:89:0E:CF:7B:3A; SHA-256 FD:37:40:0F…62:89:73:45. Fingerprints are public, not secrets. Both are on the Firebase Android app. The older SHA-1 C3:1C:84:8A… is the com.dormdash.app key.', status: 'ok' },
    { id: 'k-android-new', name: 'Android key, auto created by Firebase (14 Oct 2026)', value: 'Firebase services only, but limited to no app. Probably the com.jcommerce.runner key.', status: 'look' },
    { id: 'k-android-old', name: 'Android key, auto created by Firebase (10 Jun 2026)', value: 'Firebase services, for com.dormdash.app (the old app id).', status: 'ok' },
    { id: 'k-browser', name: 'Browser key, auto created by Firebase (7 Jun 2026)', value: 'Firebase services only, but limited to no website.', status: 'look' },
    { id: 'k-webmaps', name: 'The key the website uses for maps (EXPO_PUBLIC_GOOGLE_MAPS_API_KEY)', value: 'Not known yet: a task in the checklist.', status: 'look' },
    { id: 'v-builds', name: 'Phone builds made', value: 'Android: preview APKs only, 10 to 12 Oct 2026; those can\'t pay or accept orders now that the server requires App Check. On 2 Nov the app learned to send App Check from Android (Play Integrity, React Native Firebase 23.8.8). The next APK works once the Play Integrity settings are done (checklist). No Play Store or iPhone build yet; an iPhone build would still fail until App Attest is added.', status: 'look' },
    { id: 'k-integrity', name: 'App Check for the Android app (Play Integrity)', value: 'Set up 2 Nov 2026: Play Integrity API on; Expo\'s SHA-256 registered; App Check accepts APKs from outside the Play Store (PLAY_RECOGNIZED not required) but requires device integrity; LICENSED not required; tokens last 1 hour. 10,000 checks a day free. Not yet tried from a real APK.', status: 'ok', link: 'https://console.firebase.google.com/project/dormdash-71035/appcheck/apps' },
    { id: 'v-env', name: 'Expo build settings', value: 'Production is missing EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID (preview has it), so the production app sends no Firebase Analytics. Neither has EXPO_PUBLIC_WHATSAPP_NUMBER, which is expected until the number exists.', status: 'look', link: 'https://expo.dev/accounts/jcommerce-and-tech/projects/dormdash/environment-variables' },
    { id: 'v-stack', name: 'App code', value: 'Expo SDK 54.0.37, React Native 0.81.5, React 19.1.0, Firebase 11.10.0. Android only: React Native Firebase 23.8.8 (app and app-check), pinned on purpose.', status: 'ok' },
    { id: 'v-server', name: 'Server', value: '56 functions on Node 22, firebase-functions 6.6.0, firebase-admin 12.7.0, Anthropic SDK 1.3.0. Last deployed 1 Nov 2026.', status: 'ok', link: fb('/functions') },
    { id: 'v-site', name: 'Website', value: 'Last released 1 Nov 2026, at uwi-runner.online and dormdash-71035.web.app.', status: 'ok', link: fb('/hosting/sites') },
    { id: 'v-mac', name: 'Tools on this Mac', value: 'Node 24.21.0, npm 11.19.0, firebase-tools 15.30.2, eas-cli 24.13.0. eas-cli 27.2.0 is out; don\'t upgrade it just before the rebuild.', status: 'ok' },
    { id: 'v-console', name: 'This console', value: 'Version 1.0.0, Electron 44, React 18.', status: 'ok' },
  ] },
];

export const partsQuestions = () => PARTS.flatMap(g => g.rows).filter(r => r.ask);

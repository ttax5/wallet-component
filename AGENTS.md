# AGENTS.md

## What this repo is

PAXAPOS merchant wallet: **Svelte 4 + Vite SPA** (not SvelteKit), TypeScript, Tailwind/Flowbite, Firebase Auth/Firestore, and the **Stellar testnet**. UI copy is Spanish. Single package, no monorepo.

## Commands

- Install: `npm ci` (CI uses npm; keep `package-lock.json` in sync when deps change). `pnpm` also works locally, but both lockfiles exist.
- Dev: `npm run dev` → http://localhost:5173
- Validate: `npm run check` (`svelte-check`; currently the only working automated check)
- Build: `npm run build` → `dist/` static output
- There is **no test suite** and no `test` script.
- There is no `lint` or `format` npm script despite the README. ESLint is configured but currently cannot run: `eslint.config.mjs` imports `globals`, which is missing from `package.json`. Format with `npx prettier --write <file>` (config: tabs, single quotes, trailing commas).

The README is stale: it describes SvelteKit, `VITE_STELLAR_*` variables, and `lint`/`format` scripts that do not exist. Trust `package.json`, `src/`, and `.env.example`.

## Environment

- Copy `.env.example` → `.env`. It expects `VITE_FIREBASE_*` values and, optionally, the `VITE_DEMO_ACCOUNT_*` / `VITE_FAUCET_*` testnet keys. `VITE_GOOGLE_CLIENT_ID` is no longer used by the app.
- Dummy fallbacks let the app build and boot without `.env`, but Google login and Firestore require a real Firebase project with Firestore enabled.
- Testnet only: `src/stellar_account.ts` pins the Horizon testnet URL; `src/services/stellar.ts` uses `Networks.TESTNET` and faucet keys loaded from `.env`. Do not point it at mainnet casually.
- CI deploys to Firebase project `paxapos-stellar-wallet` (`.github/workflows/`); the local `.firebaserc` references a different project.

## Architecture

- Entry: `index.html` → `src/main.ts` → `src/App.svelte`. `App.svelte` mounts manually and switches views via `activeTab` (`ViewType` in `src/types/index.ts`); there is no router.
- UI lives in `src/components/*.svelte`; the QR renderer is `src/lib/WalletQR.svelte` (qrious). `QRScanner.svelte` loads jsQR from a CDN at runtime.
- State lives in Svelte stores under `src/stores/` (`session`, `wallet`, `notifications`). Session and private keys persist in `localStorage` (`paxapos_session`, plus legacy `addr`/`priv`).
- `src/services/stellar.ts` handles balances, payments, trustlines, faucet funding, and Horizon `EventSource` payment streaming.
- Auth/data: `src/services/auth.ts` (Firebase `signInWithPopup` for Google, developer keypair login), `src/services/firestore.ts` (`users/{uid}` and `users/{uid}/transactions`), `src/services/firebase.ts` init.

## Gotchas

- Private keys are stored client-side in `localStorage` and in Firestore at `users/{uid}.stellarAccount`. Never log, expose, or relocate them; rules only allow the owning authenticated user.
- The demo keypairs and faucet keys are loaded from `.env` (`VITE_DEMO_ACCOUNT_*`, `VITE_FAUCET_*`) and are never committed. They are testnet accounts, not production secrets. Note that Vite inlines every `VITE_*` value into the client bundle, so any key exposed that way is public in the deployed app; treat these accounts as disposable and never put mainnet keys in `.env`.
- Payment QR format is `paxapos:pay?address=&amount=&asset=&issuer=&memo=`. Keep generation in `BillingForm.svelte` and parsing in `QRScanner.svelte` in sync.
- `firestore.rules` restrict each `/users/{userId}` tree to `request.auth.uid == userId`; new collections must live under that tree or rules must be updated.

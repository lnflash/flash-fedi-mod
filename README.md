# Flash · FediMod

A [FediMod](https://fedi.org) that connects your **Flash** account from inside the Fedi app
and **bridges your Fedi ecash to Flash over Lightning**.

This is a ground-up rearchitecture of the original `flash-fedi-mod`. See
[`PHASE0-FLASH-CONTRACT.md`](PHASE0-FLASH-CONTRACT.md) for the verified Flash API contract
this is built against, and [`REVIEW-AND-DESIGN.md`](REVIEW-AND-DESIGN.md) for why.

## What it does

| Tab | Flow | Flash operations |
|-----|------|------------------|
| **Move** | Top up Flash from your Fedi balance, or withdraw Flash → Fedi, over Lightning | `lnUsdInvoiceCreate` + host `sendPayment`; host `makeInvoice` + `lnInvoicePaymentSend` |
| **Send** | Send USD to any Flash user by username | `accountDefaultWallet` → `intraLedgerUsdPaymentSend` |
| **Receive** | Create a Lightning invoice to your Flash USD wallet (real QR) | `lnUsdInvoiceCreate` + `lnInvoicePaymentStatus` |
| **Cash out** | Withdraw your USD balance to a registered bank account | `requestCashout` (quote) → `initiateCashout` (execute) |

## Architecture (the short version)

- **Pure client-side.** No backend, no app secrets. The only credential held is the
  **user's own auth token**, obtained at runtime via Flash's OTP login (real geetest captcha).
  Token lives in `sessionStorage` (tab-scoped), never `localStorage`, never the bundle.
- **Talks directly to Flash's real GraphQL API** — every operation is verified against the
  live schema (`schema/flash-schema.graphql`). No invented REST endpoints.
- **The Fedi host provides the Lightning rails** via its injected WebLN provider
  (`src/host/webln.ts`). If there's no provider, the app says so — it never fakes a balance.
- **Units are explicit** (sats vs USD cents) and fiat conversion uses Flash's
  `realtimePrice` — no hardcoded BTC price.

```
src/
  flash/      typed client + operations generated-by-hand from the real schema
  host/       Fedi/WebLN provider abstraction
  auth/       geetest captcha + OTP
  money/      sats/cents/fiat conversions (unit-tested)
  state/      FlashContext (session + actions)
  features/   AuthScreen, WalletHeader, Bridge/Send/Receive/Cashout tabs
```

## Why there's no card/bank "top up"

The Flash GraphQL API exposes **no** card/bank/Fygaro cash-in mutation (only cash-**out**).
The original app called endpoints that don't exist. Here, the **Fedi → Flash Lightning
bridge is the top-up**. See the Phase 0 doc, and [`ROADMAP.md`](ROADMAP.md) for the planned
Bank/Credit-Card top-up rollout once Flash exposes a cash-in mutation.

## Feature flags

Every major feature is gated by a flag (all default **on**) so a deploy can ship with any
flow disabled without code changes. Set them in `.env` (see `.env.example`) — values accept
`true/false`, `on/off`, `1/0`, `yes/no`:

| Flag | Gates |
|------|-------|
| `VITE_FEATURE_BRIDGE` | Move tab |
| `VITE_FEATURE_BRIDGE_WITHDRAW` | Flash → Fedi withdraw direction (sub-flag of Move) |
| `VITE_FEATURE_SEND` | Send tab |
| `VITE_FEATURE_RECEIVE` | Receive tab |
| `VITE_FEATURE_CASHOUT` | Cash out tab |
| `VITE_FEATURE_OTP_WHATSAPP` | WhatsApp OTP delivery (sub-flag of login) |

Flags are resolved once at startup in [`src/flags.ts`](src/flags.ts).

## Develop

```bash
npm install
npm run smoke      # hits the LIVE Flash API with unauthenticated queries — proves the client works
npm test           # unit + component tests (every feature + each flag's disabled state)
npm run dev        # http://localhost:3000
npm run build      # typecheck + production build to dist/
```

`cp .env.example .env` to override the API URL or geetest product. `.env` holds **no secrets**.

## Before production (must verify on a device)

1. **Geetest captcha** (`src/auth/captcha.ts`): the field mapping follows the Galoy/Blink
   convention; confirm against the live widget. Add `https://static.geetest.com` to the CSP
   in `index.html` (`script-src`/`connect-src`).
2. **Fedi host injection** (`src/host/webln.ts`): confirm the exact provider surface and
   lifecycle Fedi injects against current Fedi Mods docs.
3. **TOTP**: accounts with 2FA need the `userLoginUpgrade` flow wired into `AuthScreen`.
4. **Publishing**: register the mod's HTTPS URL in the Fedi mods registry (format per Fedi docs).

## License

MIT

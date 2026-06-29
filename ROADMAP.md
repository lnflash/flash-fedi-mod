# Flash · FediMod — Roadmap

Status of the four shipped features and what's planned next. The current build is
documented in [`README.md`](README.md); the verified API contract behind it is in
[`PHASE0-FLASH-CONTRACT.md`](PHASE0-FLASH-CONTRACT.md).

## Shipped (v0.2 / `v020`)

| Feature | Flag | State |
|---------|------|-------|
| Move (Lightning bridge: Fedi ⇄ Flash) | `VITE_FEATURE_BRIDGE` | ✅ |
| ↳ Flash → Fedi withdraw direction | `VITE_FEATURE_BRIDGE_WITHDRAW` | ✅ |
| Send (intraledger USD by username) | `VITE_FEATURE_SEND` | ✅ |
| Receive (Lightning invoice + QR) | `VITE_FEATURE_RECEIVE` | ✅ |
| Cash out (USD → registered bank) | `VITE_FEATURE_CASHOUT` | ✅ |
| WhatsApp OTP delivery channel | `VITE_FEATURE_OTP_WHATSAPP` | ✅ |

Every flag defaults to **on**; see [`src/flags.ts`](src/flags.ts) and `.env.example`.
Each feature, and the disabled state of each flag, is covered by the test suite
(`npm test`).

## Needs a device before production

Tracked in the README "Before production" checklist: geetest captcha field mapping,
the exact Fedi WebLN injection surface, and the TOTP (`userLoginUpgrade`) login path.

---

## Future

### Bank / Credit-Card top-up (cash-in)

**Why it isn't here yet.** Phase 0 introspection of the live Flash GraphQL API found
**no** cash-in mutation — nothing for card, bank deposit, or Fygaro. `BankAccount*` and
`requestCashout`/`initiateCashout` exist for cash-**out** only. The original FediMod
called card/bank top-up endpoints that do not exist, so they could never work. Until
Flash exposes a cash-in mutation, the **Fedi → Flash Lightning bridge is the top-up**
(the Move tab).

**Planned rollout once the API supports it.** The work is sequenced so each step is
shippable and reversible behind a flag:

1. **Confirm the API surface.** Re-introspect for a cash-in mutation (e.g. a Fygaro
   card-payment-link create + a settlement webhook/status query, or a direct
   `deposit*`/`cashIn*`). Capture it in `PHASE0-FLASH-CONTRACT.md` and regenerate types
   (`schema/flash-schema.graphql` → `codegen.ts`). **Do not build against an assumed
   shape** — that was the original repo's core mistake.
2. **New gated feature.** Add a `Top up` tab (or a card option inside Move) behind a new
   `VITE_FEATURE_CARD_TOPUP` flag, defaulting **off** until verified end-to-end on a
   device. Wire it into `src/flags.ts`, `App.tsx`, and `.env.example` exactly like the
   existing flags.
3. **Fygaro card flow.** If cash-in is a hosted card-payment link: open it via the Fedi
   host browser, then poll the settlement status mutation and credit the Flash USD
   wallet on confirmation. Surface fees and the FX rate before the user commits, the same
   way Cash out shows its offer. (A card → bitcoin "credit card to BTC" path would follow
   the same shape.)
4. **Thin webhook service, only if required.** A hosted card/webhook flow may need a
   small stateless service to receive Fygaro's settlement callback (the pure-client model
   can't receive webhooks). Keep it secret-free and stateless; it relays settlement
   status only. Document it in `REVIEW-AND-DESIGN.md` if it lands.
5. **Tests + kill switch.** Property/flow tests for the credit path and the disabled-flag
   state, plus the ability to flip `VITE_FEATURE_CARD_TOPUP=off` instantly if a settlement
   issue appears in the wild.

**Blocked on:** Flash exposing a cash-in mutation. **Not blocked on:** anything in this
repo — the flag scaffold and the gated-rollout pattern are already in place.

### Other candidates

- **BTC-wallet bridge** — Move currently uses the USD wallet; add a BTC-wallet path
  (`lnInvoiceCreate` is already wired in `operations.ts`) behind its own sub-flag.
- **Add-bank-account from the mod** — registration is ERPNext-side today
  (`me.bankAccounts` is read-only via the API); revisit if Flash exposes a mutation.
- **Locale-aware amounts** — `formatMinor` already falls back gracefully; extend to
  full `Intl` locale formatting (e.g. `en-JM`) when non-USD display lands.

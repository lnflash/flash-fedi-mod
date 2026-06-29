# Why this rewrite

## What was wrong with the original `flash-fedi-mod`

- **Wouldn't install** — pinned `@fedibtc/ui@1.2.3`, since removed from npm.
- **Fictional API** — every money operation called REST endpoints (`/flash/send-to-username`,
  `/flash/balance`, …) that don't exist. Flash is GraphQL-only.
- **Mocked captcha** — login sent `mock_challenge_code`; could never work.
- **Secret in the bundle** — read a bearer token from `REACT_APP_*` (shipped to every browser);
  stored tokens in `localStorage`; logged auth headers.
- **Broken flows** — Fygaro success path commented out (card top-up never confirmed);
  phone-login session never restored on reload; fake non-scannable "QR"; silent mock balances;
  inconsistent sats-vs-fiat balance interpretation; hardcoded $45k BTC price.

## The reframe

The original treated this as a standalone Flash web wallet. It's actually a **FediMod**: a web
app embedded in Fedi, where **the host provides the Lightning rails**. Separating the three
concerns — identity, Flash account ops, and ecash↔Flash movement — makes the architecture fall
out cleanly and deletes most of the original's bugs.

## Decisions

| Decision | Rationale |
|----------|-----------|
| **Pure client, no backend** | Phase 0 confirmed every flow is doable with the user's own token + GraphQL + injected WebLN. A backend would only be needed for a Fygaro/webhook cash-in — which the API doesn't support anyway. |
| **User token only, in `sessionStorage`** | No shared secret can be shipped in a frontend. The OTP token is the user's own credential; tab-scoped storage limits exposure vs `localStorage`. |
| **Direct GraphQL, types from the real schema** | Kills the "invented endpoint" class of bug. Schema captured in Phase 0; `codegen.ts` is the regenerate-from-schema upgrade path. |
| **Explicit units + `realtimePrice`** | BTC=sats, USD=cents modelled separately; no hardcoded price. |
| **Bridge-first** | The Fedi→Flash Lightning bridge is the only way to add funds (no card/bank cash-in in the API), and it's the most FediMod-native feature. |
| **Honest failure** | No mocked balances/payments. No host → "open in Fedi", not a fake 100k sats. |
| **Vite + React 18 + TS** | CRA is deprecated and broke on React 19; Vite builds in <0.5s. |

## Phase outcomes

- **Phase 1 (bridge + auth + wallets):** built. `Move` tab, OTP login w/ real captcha, wallet header.
- **Phase 2 (send / receive / cashout):** built. Intraledger send, LN receive w/ real QR + polling, two-step bank cashout.
- **Phase 3 (fiat top-up):** **N/A by API** — Flash exposes no cash-in mutation. Documented; the
  Lightning bridge is the substitute. This is a finding, not a gap in the build.

## Verified against the live API

`npm run smoke` runs unauthenticated operations against `api.flashapp.me` and passes
(`realtimePrice`, `supportedBanks` → real JM banks, `usernameAvailable`, `globals.network=mainnet`,
`me` → "Not authorized"), proving the GraphQL documents match the real schema.

## Still requires a device to finish (documented in README)

Geetest captcha field-mapping, the exact Fedi WebLN injection surface, and the TOTP
(`userLoginUpgrade`) path — none testable headless, all isolated to single modules.

# Phase 0 — Flash API Contract (verified against the live schema)

Source: live GraphQL introspection of `https://api.flashapp.me/graphql` on 2026-06-28.
Introspection is **enabled**. Full SDL saved at [`schema/flash-schema.graphql`](schema/flash-schema.graphql)
(1867 lines). **No Galoy/Blink public schema was used — only Flash's own schema.**

## Confirmed: this is Flash's schema, not vanilla Galoy

Flash-specific types/operations that do not exist in upstream Galoy confirm we are on the
real Flash API: `Bank`, `BankAccount`, `BankAccountInput`, `supportedBanks`,
`requestCashout`, `initiateCashout`, `CashoutOffer` (with `receiveJmd` / JMD exchange rate).

## Auth (real captcha — geetest)

1. `captchaCreateChallenge: CaptchaCreateChallengePayload!`
   → `result { id, challengeCode, newCaptcha, failbackMode }`
2. Run the geetest widget client-side with those values → yields `validationCode` + `secCode`.
3. `captchaRequestAuthCode(input: { phone, challengeCode, validationCode, secCode, channel })`
   → `SuccessPayload { success, errors }`  (channel = `SMS` | `WHATSAPP`)
4. `userLogin(input: { phone, code }): AuthTokenPayload { authToken, totpRequired, errors }`
5. If `totpRequired` → `userLoginUpgrade(...)`. TOTP is real and must be handled.

The returned `authToken` is the **user's own credential**. It is the ONLY token the client
holds. There is no shared service key anywhere in the design.

## Identity / wallets / price

- `me: User { id, username, phone, totpEnabled, defaultAccount { ... }, bankAccounts { ... } }`
- `defaultAccount` → `ConsumerAccount { defaultWalletId, wallets { id walletCurrency balance }, realtimePrice }`
- Wallets: **BTC wallet balance is in satoshis**, **USD wallet balance is in USD cents**
  (note: the schema types BTC `balance` as `FractionalCentAmount`, a known Galoy quirk —
  it is still sats; we model units explicitly so this never bites us).
- `realtimePrice(currency): RealtimePrice { btcSatPrice { base, offset }, usdCentPrice }`
  → use for all conversions. **No hardcoded BTC price.**

## Bridge: Fedi ecash ⇄ Flash (the hero flow)

**Top up Flash from Fedi** (receive into Flash, pay from Fedi):
- `lnUsdInvoiceCreate(input: { walletId, amount /*cents*/, memo, expiresIn }): LnInvoicePayload`
  or `lnInvoiceCreate(input: { walletId /*BTC*/, amount /*sats*/ })`
- → `invoice.paymentRequest` → pay with Fedi's injected WebLN `sendPayment(paymentRequest)`.
- Poll `lnInvoicePaymentStatus(input: { paymentRequest }) → status (PENDING|PAID|EXPIRED)`.

**Withdraw Flash → Fedi** (Fedi makes invoice, Flash pays it):
- Fedi WebLN `makeInvoice({ amount })` → paymentRequest
- `lnInvoicePaymentSend(input: { walletId, paymentRequest }): PaymentSendPayload { status }`
  or `lnNoAmountUsdInvoicePaymentSend(input: { walletId, paymentRequest, amount })`.
- `PaymentSendResult` = `SUCCESS | PENDING | ALREADY_PAID | FAILURE`.

## Send to a Flash user (intraledger)

- Resolve recipient: `accountDefaultWallet(username, walletCurrency): PublicWallet { id }`
  (`usernameAvailable(username)` to pre-check).
- `intraLedgerUsdPaymentSend(input: { walletId, recipientWalletId, amount /*cents*/, memo })`
  or `intraLedgerPaymentSend(input: { ... amount /*sats*/ })` → `PaymentSendPayload { status }`.

## Cash out to bank (settle)

- `me.bankAccounts: [BankAccount!]!` — registered accounts, each with an ERPNext `id`.
- `supportedBanks: [Bank!]!` — list of banks (name only).
- `requestCashout(input: { walletId /*USD*/, bankAccountId, amount /*cents*/ }): RequestCashoutResponse { offer }`
  → `CashoutOffer { offerId, send, receiveUsd, receiveJmd, flashFee, exchangeRate, expiresAt }`
- `initiateCashout(input: { offerId, walletId }): InitiatedCashoutResponse { id }`
- Two-step quote→execute. We show the offer (fee + rate + expiry) before executing.

## ⛔ Not in the Flash API: fiat top-up (card / bank-in / Fygaro)

Searched the entire schema — there is **no** `fygaro*`, `topup*`, `cashIn*`, `deposit*`,
or card-payment-link mutation. `BankAccount*` exists only for **cash-OUT**.

**Consequence:** the original repo's "Top Up via bank / Fygaro card" flows call endpoints
that do not exist. They cannot be built against the current Flash API.

**Resolution (the bridge-first decision pays off):** the **Fedi → Flash Lightning bridge IS
the top-up.** Phase 3 ("fiat top-up") is therefore *Not Applicable* until Flash exposes a
cash-in mutation. We document it and ship the Lightning top-up instead. (Adding a new bank
account for cash-out also appears to be ERPNext-side — `me.bankAccounts` is read-only here —
so we surface existing accounts and flag registration as a Flash-side dependency.)

## Backend?

Not needed. All flows above are user-token + GraphQL + injected WebLN, 100% client-side.
A thin stateless service would only be required for a future Fygaro/webhook cash-in flow —
which the API does not currently support anyway. So: **pure client for now.**

## Host (Fedi) dependency

Fedi injects a WebLN provider into the mod webview. We target the WebLN contract
(`enable`, `getInfo`, `makeInvoice`, `sendPayment`). To verify before production: the exact
injected surface/lifecycle against current Fedi Mods docs (see `src/host/webln.ts`).

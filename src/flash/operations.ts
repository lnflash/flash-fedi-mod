/**
 * Typed Flash operations. Every query/mutation string below is written against the
 * real Flash schema (schema/flash-schema.graphql) verified in Phase 0.
 */
import { gqlRequest, FlashGraphQLError } from "./client";
import type {
  AuthTokenPayload,
  Bank,
  CaptchaChallenge,
  CashoutOffer,
  GqlError,
  InvoicePaymentStatus,
  LnInvoice,
  Me,
  PaymentSendResult,
  PhoneCodeChannel,
  PublicWallet,
  WalletCurrency,
  WalletId,
} from "./types";

/** Mutation payloads share `{ errors: [...] }`; throw if non-empty. */
function assertNoErrors(errors: GqlError[] | undefined): void {
  if (errors && errors.length > 0) throw new FlashGraphQLError(errors);
}

// ---------- Unauthenticated: prices, banks, lookups ----------

export async function getRealtimePrice(currency = "USD"): Promise<Me["defaultAccount"]["realtimePrice"]> {
  const data = await gqlRequest<{ realtimePrice: Me["defaultAccount"]["realtimePrice"] }>(
    `query RealtimePrice($currency: DisplayCurrency) {
      realtimePrice(currency: $currency) {
        denominatorCurrency
        timestamp
        btcSatPrice { base offset }
        usdCentPrice { base offset }
      }
    }`,
    { currency },
    { anonymous: true },
  );
  return data.realtimePrice;
}

export async function getSupportedBanks(): Promise<Bank[]> {
  const data = await gqlRequest<{ supportedBanks: Bank[] }>(
    `query SupportedBanks { supportedBanks { name } }`,
    {},
    { anonymous: true },
  );
  return data.supportedBanks;
}

export async function isUsernameTaken(username: string): Promise<boolean> {
  const data = await gqlRequest<{ usernameAvailable: boolean | null }>(
    `query UsernameAvailable($username: Username!) { usernameAvailable(username: $username) }`,
    { username },
    { anonymous: true },
  );
  return data.usernameAvailable === false;
}

export async function getRecipientWallet(username: string, walletCurrency: WalletCurrency): Promise<PublicWallet> {
  const data = await gqlRequest<{ accountDefaultWallet: PublicWallet }>(
    `query AccountDefaultWallet($username: Username!, $walletCurrency: WalletCurrency) {
      accountDefaultWallet(username: $username, walletCurrency: $walletCurrency) { id walletCurrency }
    }`,
    { username, walletCurrency },
    { anonymous: true },
  );
  return data.accountDefaultWallet;
}

// ---------- Auth ----------

export async function createCaptchaChallenge(): Promise<CaptchaChallenge> {
  const data = await gqlRequest<{ captchaCreateChallenge: { errors: GqlError[]; result: CaptchaChallenge | null } }>(
    `mutation CaptchaCreateChallenge {
      captchaCreateChallenge { errors { message code } result { id challengeCode newCaptcha failbackMode } }
    }`,
    {},
    { anonymous: true },
  );
  assertNoErrors(data.captchaCreateChallenge.errors);
  if (!data.captchaCreateChallenge.result) throw new FlashGraphQLError([{ message: "No captcha challenge returned" }]);
  return data.captchaCreateChallenge.result;
}

export interface RequestAuthCodeArgs {
  phone: string;
  challengeCode: string;
  validationCode: string;
  secCode: string;
  channel: PhoneCodeChannel;
}

export async function requestAuthCode(args: RequestAuthCodeArgs): Promise<void> {
  const data = await gqlRequest<{ captchaRequestAuthCode: { errors: GqlError[]; success: boolean | null } }>(
    `mutation CaptchaRequestAuthCode($input: CaptchaRequestAuthCodeInput!) {
      captchaRequestAuthCode(input: $input) { errors { message code } success }
    }`,
    {
      input: {
        phone: args.phone,
        challengeCode: args.challengeCode,
        validationCode: args.validationCode,
        secCode: args.secCode,
        channel: args.channel,
      },
    },
    { anonymous: true },
  );
  assertNoErrors(data.captchaRequestAuthCode.errors);
}

export async function userLogin(phone: string, code: string): Promise<AuthTokenPayload> {
  const data = await gqlRequest<{ userLogin: AuthTokenPayload }>(
    `mutation UserLogin($input: UserLoginInput!) {
      userLogin(input: $input) { authToken totpRequired errors { message code } }
    }`,
    { input: { phone, code } },
    { anonymous: true },
  );
  assertNoErrors(data.userLogin.errors);
  return data.userLogin;
}

export async function logout(): Promise<void> {
  await gqlRequest<{ userLogout: { success: boolean | null; errors: GqlError[] } }>(
    `mutation UserLogout { userLogout { success errors { message } } }`,
  ).catch(() => undefined);
}

// ---------- Identity / wallets ----------

export async function getMe(): Promise<Me> {
  const data = await gqlRequest<{ me: Me | null }>(
    `query Me {
      me {
        id username phone totpEnabled
        defaultAccount {
          id
          defaultWalletId
          wallets { id walletCurrency balance pendingIncomingBalance }
          realtimePrice { denominatorCurrency timestamp btcSatPrice { base offset } usdCentPrice { base offset } }
        }
        bankAccounts { id bankName accountName accountNumber accountType bankBranch currency isDefault }
      }
    }`,
  );
  if (!data.me) throw new FlashGraphQLError([{ message: "Not signed in" }]);
  return data.me;
}

// ---------- Bridge: receive into Flash (top up from Fedi) ----------

export async function createUsdInvoice(walletId: WalletId, cents: number, memo?: string): Promise<LnInvoice> {
  const data = await gqlRequest<{ lnUsdInvoiceCreate: { errors: GqlError[]; invoice: LnInvoice | null } }>(
    `mutation LnUsdInvoiceCreate($input: LnUsdInvoiceCreateInput!) {
      lnUsdInvoiceCreate(input: $input) { errors { message code } invoice { paymentHash paymentRequest satoshis } }
    }`,
    { input: { walletId, amount: cents, memo } },
  );
  assertNoErrors(data.lnUsdInvoiceCreate.errors);
  if (!data.lnUsdInvoiceCreate.invoice) throw new FlashGraphQLError([{ message: "No invoice returned" }]);
  return data.lnUsdInvoiceCreate.invoice;
}

export async function createBtcInvoice(walletId: WalletId, sats: number, memo?: string): Promise<LnInvoice> {
  const data = await gqlRequest<{ lnInvoiceCreate: { errors: GqlError[]; invoice: LnInvoice | null } }>(
    `mutation LnInvoiceCreate($input: LnInvoiceCreateInput!) {
      lnInvoiceCreate(input: $input) { errors { message code } invoice { paymentHash paymentRequest satoshis } }
    }`,
    { input: { walletId, amount: sats, memo } },
  );
  assertNoErrors(data.lnInvoiceCreate.errors);
  if (!data.lnInvoiceCreate.invoice) throw new FlashGraphQLError([{ message: "No invoice returned" }]);
  return data.lnInvoiceCreate.invoice;
}

export async function getInvoiceStatus(paymentRequest: string): Promise<InvoicePaymentStatus | null> {
  const data = await gqlRequest<{ lnInvoicePaymentStatus: { errors: GqlError[]; status: InvoicePaymentStatus | null } }>(
    `query LnInvoicePaymentStatus($input: LnInvoicePaymentStatusInput!) {
      lnInvoicePaymentStatus(input: $input) { errors { message } status }
    }`,
    { input: { paymentRequest } },
  );
  return data.lnInvoicePaymentStatus.status;
}

// ---------- Bridge: pay an invoice from Flash (withdraw to Fedi) ----------

export async function payInvoiceFromUsd(walletId: WalletId, paymentRequest: string, memo?: string): Promise<PaymentSendResult> {
  const data = await gqlRequest<{ lnInvoicePaymentSend: { errors: GqlError[]; status: PaymentSendResult | null } }>(
    `mutation LnInvoicePaymentSend($input: LnInvoicePaymentInput!) {
      lnInvoicePaymentSend(input: $input) { errors { message code } status }
    }`,
    { input: { walletId, paymentRequest, memo } },
  );
  assertNoErrors(data.lnInvoicePaymentSend.errors);
  return data.lnInvoicePaymentSend.status ?? "PENDING";
}

/** Pay a zero-amount invoice from the USD wallet, specifying the amount in cents. */
export async function payNoAmountInvoiceFromUsd(
  walletId: WalletId,
  paymentRequest: string,
  cents: number,
  memo?: string,
): Promise<PaymentSendResult> {
  const data = await gqlRequest<{ lnNoAmountUsdInvoicePaymentSend: { errors: GqlError[]; status: PaymentSendResult | null } }>(
    `mutation LnNoAmountUsdInvoicePaymentSend($input: LnNoAmountUsdInvoicePaymentInput!) {
      lnNoAmountUsdInvoicePaymentSend(input: $input) { errors { message code } status }
    }`,
    { input: { walletId, paymentRequest, amount: cents, memo } },
  );
  assertNoErrors(data.lnNoAmountUsdInvoicePaymentSend.errors);
  return data.lnNoAmountUsdInvoicePaymentSend.status ?? "PENDING";
}

// ---------- Send to a Flash user (intraledger) ----------

export async function sendUsdToWallet(
  fromWalletId: WalletId,
  recipientWalletId: WalletId,
  cents: number,
  memo?: string,
): Promise<PaymentSendResult> {
  const data = await gqlRequest<{ intraLedgerUsdPaymentSend: { errors: GqlError[]; status: PaymentSendResult | null } }>(
    `mutation IntraLedgerUsdPaymentSend($input: IntraLedgerUsdPaymentSendInput!) {
      intraLedgerUsdPaymentSend(input: $input) { errors { message code } status }
    }`,
    { input: { walletId: fromWalletId, recipientWalletId, amount: cents, memo } },
  );
  assertNoErrors(data.intraLedgerUsdPaymentSend.errors);
  return data.intraLedgerUsdPaymentSend.status ?? "PENDING";
}

// ---------- Cash out to bank ----------

export async function requestCashout(walletId: WalletId, bankAccountId: string, cents: number): Promise<CashoutOffer> {
  const data = await gqlRequest<{ requestCashout: { errors: GqlError[]; offer: CashoutOffer | null } }>(
    `mutation RequestCashout($input: RequestCashoutInput!) {
      requestCashout(input: $input) {
        errors { message code }
        offer { offerId walletId send receiveUsd receiveJmd flashFee exchangeRate expiresAt }
      }
    }`,
    { input: { walletId, bankAccountId, amount: cents } },
  );
  assertNoErrors(data.requestCashout.errors);
  if (!data.requestCashout.offer) throw new FlashGraphQLError([{ message: "No cashout offer returned" }]);
  return data.requestCashout.offer;
}

export async function initiateCashout(offerId: string, walletId: WalletId): Promise<string | null> {
  const data = await gqlRequest<{ initiateCashout: { errors: GqlError[]; id: string | null } }>(
    `mutation InitiateCashout($input: InitiateCashoutInput!) {
      initiateCashout(input: $input) { errors { message code } id }
    }`,
    { input: { offerId, walletId } },
  );
  assertNoErrors(data.initiateCashout.errors);
  return data.initiateCashout.id;
}

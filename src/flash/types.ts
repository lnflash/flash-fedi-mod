/**
 * Hand-written TypeScript mirror of the parts of the *real* Flash GraphQL schema
 * (schema/flash-schema.graphql) that this app uses. Kept deliberately small.
 *
 * Upgrade path: replace this file with `graphql-codegen` output generated from the
 * saved SDL (see codegen.ts) so the types are regenerated from the schema instead of
 * maintained by hand. The contract is identical either way.
 */

// --- Scalars (branded so units/ids don't get mixed up) ---
export type WalletId = string & { readonly __brand: "WalletId" };
export type AuthToken = string & { readonly __brand: "AuthToken" };
/** Satoshis. */
export type SatAmount = number & { readonly __brand: "SatAmount" };
/** USD cents. */
export type CentAmount = number & { readonly __brand: "CentAmount" };

export type WalletCurrency = "BTC" | "USD";
export type PhoneCodeChannel = "SMS" | "WHATSAPP";
export type PaymentSendResult = "SUCCESS" | "PENDING" | "ALREADY_PAID" | "FAILURE";
export type InvoicePaymentStatus = "PENDING" | "PAID" | "EXPIRED";

export interface GqlError {
  code?: string | null;
  message: string;
  path?: (string | null)[] | null;
}

export interface Wallet {
  id: WalletId;
  walletCurrency: WalletCurrency;
  /** BTC wallet → sats; USD wallet → cents. Interpret via walletCurrency. */
  balance: number | null;
  pendingIncomingBalance: number;
}

export interface BankAccount {
  id: string | null;
  bankName: string;
  accountName: string | null;
  accountNumber: string;
  accountType: string;
  bankBranch: string;
  currency: string;
  isDefault: boolean;
}

export interface RealtimePrice {
  /** Price of one sat in the display currency's minor unit, with a base/offset pair. */
  btcSatPrice: { base: number; offset: number };
  usdCentPrice: { base: number; offset: number };
  denominatorCurrency: string;
  timestamp: number;
}

export interface Me {
  id: string;
  username: string | null;
  phone: string | null;
  totpEnabled: boolean;
  defaultAccount: {
    id: string;
    defaultWalletId: WalletId;
    wallets: Wallet[];
    realtimePrice: RealtimePrice;
  };
  bankAccounts: BankAccount[];
}

export interface AuthTokenPayload {
  authToken: AuthToken | null;
  totpRequired: boolean | null;
  errors: GqlError[];
}

export interface CaptchaChallenge {
  id: string;
  challengeCode: string;
  newCaptcha: boolean;
  failbackMode: boolean;
}

export interface LnInvoice {
  paymentHash: string;
  paymentRequest: string;
  satoshis: number | null;
}

export interface CashoutOffer {
  offerId: string;
  walletId: WalletId;
  send: number; // USD cents
  receiveUsd: number | null; // USD cents
  receiveJmd: number | null; // JMD cents
  flashFee: number; // USD cents
  exchangeRate: number | null; // JMD cents per ...
  expiresAt: number;
}

export interface PublicWallet {
  id: WalletId;
  walletCurrency: WalletCurrency;
}

export interface Bank {
  name: string;
}

/**
 * Abstraction over the host environment's injected Lightning provider.
 *
 * Fedi injects a WebLN provider into the mod webview. We target the stable WebLN
 * contract so the same code works in Fedi and in any WebLN browser extension during
 * development. We DO NOT mock balances or payments — if there is no provider we say so.
 *
 * To verify before production: the exact provider surface/lifecycle Fedi injects
 * (WebLN vs a Fedi-specific SDK) against the current Fedi Mods documentation.
 */

export interface WebLNNode {
  alias?: string;
  pubkey?: string;
}
export interface WebLNGetInfoResponse {
  node: WebLNNode;
}
export interface WebLNSendPaymentResponse {
  preimage: string;
}
export interface WebLNMakeInvoiceResponse {
  paymentRequest: string;
}
export interface WebLNProvider {
  enable(): Promise<void>;
  getInfo(): Promise<WebLNGetInfoResponse>;
  sendPayment(paymentRequest: string): Promise<WebLNSendPaymentResponse>;
  makeInvoice(args: { amount: number | string; defaultMemo?: string }): Promise<WebLNMakeInvoiceResponse>;
}

declare global {
  interface Window {
    webln?: WebLNProvider;
  }
}

export class HostUnavailableError extends Error {
  constructor() {
    super("No Lightning provider found. Open this mod inside the Fedi app (or a WebLN browser).");
    this.name = "HostUnavailableError";
  }
}

export function hasHostProvider(): boolean {
  return typeof window !== "undefined" && typeof window.webln !== "undefined";
}

let enabled = false;

export async function enableHost(): Promise<WebLNProvider> {
  if (!hasHostProvider() || !window.webln) throw new HostUnavailableError();
  if (!enabled) {
    await window.webln.enable();
    enabled = true;
  }
  return window.webln;
}

export async function getHostInfo(): Promise<WebLNGetInfoResponse> {
  const provider = await enableHost();
  return provider.getInfo();
}

/** Pay a BOLT11 invoice from the Fedi wallet (used to fund Flash). */
export async function payWithHost(paymentRequest: string): Promise<WebLNSendPaymentResponse> {
  const provider = await enableHost();
  return provider.sendPayment(paymentRequest);
}

/** Make a Fedi invoice (used to withdraw Flash → Fedi). amount is in sats. */
export async function makeHostInvoice(sats: number, memo?: string): Promise<WebLNMakeInvoiceResponse> {
  const provider = await enableHost();
  return provider.makeInvoice({ amount: sats, defaultMemo: memo });
}

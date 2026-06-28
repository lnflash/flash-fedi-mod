/**
 * Money helpers. Units are explicit everywhere to avoid the sats/cents/fiat confusion
 * that plagued the original app. Conversions use Flash's realtimePrice — never a
 * hardcoded BTC price.
 */
import type { RealtimePrice } from "../flash/types";

/** Price of one sat expressed in the display currency's minor unit (e.g. USD cents). */
export function satPriceInMinorUnit(price: RealtimePrice): number {
  return price.btcSatPrice.base / 10 ** price.btcSatPrice.offset;
}

/** Convert sats → display-currency minor units (e.g. cents), rounded. */
export function satsToMinorUnit(sats: number, price: RealtimePrice): number {
  return Math.round(sats * satPriceInMinorUnit(price));
}

/** Convert display-currency minor units (e.g. cents) → sats, rounded. */
export function minorUnitToSats(minor: number, price: RealtimePrice): number {
  const p = satPriceInMinorUnit(price);
  return p > 0 ? Math.round(minor / p) : 0;
}

export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function formatMinor(minor: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`;
  }
}

export function formatSats(sats: number): string {
  return `${new Intl.NumberFormat("en-US").format(sats)} sats`;
}

/** Parse a user-typed dollar string like "12.50" into integer cents. Returns null if invalid. */
export function dollarsToCents(input: string): number | null {
  const cleaned = input.trim().replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(parseFloat(cleaned) * 100);
}

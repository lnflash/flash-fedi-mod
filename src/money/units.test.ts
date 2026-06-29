import { describe, expect, it } from "vitest";
import {
  dollarsToCents,
  formatMinor,
  formatSats,
  formatUsd,
  minorUnitToSats,
  satPriceInMinorUnit,
  satsToMinorUnit,
} from "./units";
import type { RealtimePrice } from "../flash/types";

// Example: 1 sat = 0.0006 cents (i.e. ~$60k/BTC). base/offset encode that.
const price: RealtimePrice = {
  btcSatPrice: { base: 60_000, offset: 8 }, // 60000 / 1e8 = 0.0006 cents per sat
  usdCentPrice: { base: 1, offset: 0 },
  denominatorCurrency: "USD",
  timestamp: 0,
};

describe("dollarsToCents", () => {
  it("parses valid amounts", () => {
    expect(dollarsToCents("12.50")).toBe(1250);
    expect(dollarsToCents("1,000")).toBe(100000);
    expect(dollarsToCents("0.01")).toBe(1);
  });
  it("rejects invalid", () => {
    expect(dollarsToCents("abc")).toBeNull();
    expect(dollarsToCents("1.234")).toBeNull();
    expect(dollarsToCents("")).toBeNull();
  });
});

describe("dollarsToCents edge cases", () => {
  it("trims whitespace and handles a bare integer", () => {
    expect(dollarsToCents("  42 ")).toBe(4200);
    expect(dollarsToCents("0")).toBe(0);
  });
  it("rejects negatives and signs", () => {
    expect(dollarsToCents("-1")).toBeNull();
    expect(dollarsToCents("+1")).toBeNull();
  });
});

describe("satPriceInMinorUnit", () => {
  it("applies base/offset (≈$60k/BTC → 0.0006 cents/sat)", () => {
    expect(satPriceInMinorUnit(price)).toBeCloseTo(0.0006, 10);
  });
});

describe("sat/cent conversion roundtrip", () => {
  it("converts cents -> sats -> cents within rounding", () => {
    const cents = 1000; // $10
    const sats = minorUnitToSats(cents, price);
    expect(sats).toBeGreaterThan(0);
    const back = satsToMinorUnit(sats, price);
    expect(Math.abs(back - cents)).toBeLessThanOrEqual(1);
  });
  it("returns 0 sats when the price is non-positive (no divide-by-zero)", () => {
    const zero: RealtimePrice = { ...price, btcSatPrice: { base: 0, offset: 8 } };
    expect(minorUnitToSats(1000, zero)).toBe(0);
  });
});

describe("formatting", () => {
  it("formats USD cents", () => {
    expect(formatUsd(1250)).toBe("$12.50");
    expect(formatUsd(0)).toBe("$0.00");
  });
  it("formats sats with grouping", () => {
    expect(formatSats(1234567)).toBe("1,234,567 sats");
  });
  it("formats a known currency and falls back for a malformed code", () => {
    expect(formatMinor(1000, "USD")).toBe("$10.00");
    // A malformed (non ISO-4217) code makes Intl throw → plain fallback.
    expect(formatMinor(1000, "US")).toBe("10.00 US");
  });
});

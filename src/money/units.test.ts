import { describe, expect, it } from "vitest";
import { dollarsToCents, minorUnitToSats, satsToMinorUnit } from "./units";
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

describe("sat/cent conversion roundtrip", () => {
  it("converts cents -> sats -> cents within rounding", () => {
    const cents = 1000; // $10
    const sats = minorUnitToSats(cents, price);
    expect(sats).toBeGreaterThan(0);
    const back = satsToMinorUnit(sats, price);
    expect(Math.abs(back - cents)).toBeLessThanOrEqual(1);
  });
});

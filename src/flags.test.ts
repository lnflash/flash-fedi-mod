// @vitest-environment node
import { describe, expect, it } from "vitest";
import { DEFAULT_FLAGS, parseFlag, resolveFlags } from "./flags";

describe("parseFlag", () => {
  it("passes booleans through", () => {
    expect(parseFlag(true, false)).toBe(true);
    expect(parseFlag(false, true)).toBe(false);
  });
  it("uses the fallback for undefined/empty/unknown", () => {
    expect(parseFlag(undefined, true)).toBe(true);
    expect(parseFlag(undefined, false)).toBe(false);
    expect(parseFlag("", true)).toBe(true);
    expect(parseFlag("maybe", false)).toBe(false);
  });
  it("recognises truthy strings", () => {
    for (const v of ["1", "true", "on", "yes", "TRUE", " On "]) {
      expect(parseFlag(v, false)).toBe(true);
    }
  });
  it("recognises falsy strings", () => {
    for (const v of ["0", "false", "off", "no", "FALSE", " Off "]) {
      expect(parseFlag(v, true)).toBe(false);
    }
  });
});

describe("resolveFlags", () => {
  it("defaults everything to enabled with an empty env", () => {
    expect(resolveFlags({})).toEqual(DEFAULT_FLAGS);
  });
  it("disables a major feature via env", () => {
    expect(resolveFlags({ VITE_FEATURE_CASHOUT: "false" }).cashout).toBe(false);
    expect(resolveFlags({ VITE_FEATURE_CASHOUT: "false" }).bridge).toBe(true);
  });
  it("disables sub-flags independently of their major feature", () => {
    const f = resolveFlags({ VITE_FEATURE_BRIDGE_WITHDRAW: "off", VITE_FEATURE_OTP_WHATSAPP: "0" });
    expect(f.bridge).toBe(true);
    expect(f.bridgeWithdraw).toBe(false);
    expect(f.otpWhatsApp).toBe(false);
  });
});

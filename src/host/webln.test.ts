// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  HostUnavailableError,
  enableHost,
  hasHostProvider,
  makeHostInvoice,
  payWithHost,
} from "./webln";

function fakeProvider() {
  return {
    enable: vi.fn().mockResolvedValue(undefined),
    getInfo: vi.fn().mockResolvedValue({ node: { alias: "fedi" } }),
    sendPayment: vi.fn().mockResolvedValue({ preimage: "pre" }),
    makeInvoice: vi.fn().mockResolvedValue({ paymentRequest: "lnbc1" }),
  };
}

afterEach(() => {
  delete (window as { webln?: unknown }).webln;
});

describe("host provider detection", () => {
  it("reports absence and presence of a provider", () => {
    expect(hasHostProvider()).toBe(false);
    window.webln = fakeProvider();
    expect(hasHostProvider()).toBe(true);
  });

  it("enableHost throws HostUnavailableError when there is no provider", async () => {
    await expect(enableHost()).rejects.toBeInstanceOf(HostUnavailableError);
  });
});

describe("host operations", () => {
  it("payWithHost forwards the BOLT11 to the provider", async () => {
    const p = fakeProvider();
    window.webln = p;
    await expect(payWithHost("lnbc-x")).resolves.toEqual({ preimage: "pre" });
    expect(p.sendPayment).toHaveBeenCalledWith("lnbc-x");
  });

  it("makeHostInvoice asks the provider for an invoice in sats", async () => {
    const p = fakeProvider();
    window.webln = p;
    await makeHostInvoice(2100, "memo");
    expect(p.makeInvoice).toHaveBeenCalledWith({ amount: 2100, defaultMemo: "memo" });
  });
});

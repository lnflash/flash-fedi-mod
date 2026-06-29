// @vitest-environment node
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("./client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./client")>()),
  gqlRequest: vi.fn(),
}));

import { FlashGraphQLError, gqlRequest } from "./client";
import * as ops from "./operations";
import type { WalletId } from "./types";

const mockGql = gqlRequest as unknown as Mock;
const W = "wallet-1" as WalletId;

beforeEach(() => mockGql.mockReset());

describe("unauthenticated lookups", () => {
  it("isUsernameTaken inverts usernameAvailable", async () => {
    mockGql.mockResolvedValueOnce({ usernameAvailable: false });
    await expect(ops.isUsernameTaken("taken")).resolves.toBe(true);
    mockGql.mockResolvedValueOnce({ usernameAvailable: true });
    await expect(ops.isUsernameTaken("free")).resolves.toBe(false);
  });

  it("getRecipientWallet sends username + currency", async () => {
    mockGql.mockResolvedValueOnce({ accountDefaultWallet: { id: "r1", walletCurrency: "USD" } });
    const w = await ops.getRecipientWallet("bob", "USD");
    expect(w.id).toBe("r1");
    expect(mockGql.mock.calls[0][1]).toEqual({ username: "bob", walletCurrency: "USD" });
  });
});

describe("auth payload error handling", () => {
  it("userLogin throws when the payload carries errors", async () => {
    mockGql.mockResolvedValueOnce({ userLogin: { authToken: null, totpRequired: false, errors: [{ message: "nope" }] } });
    await expect(ops.userLogin("+100", "000000")).rejects.toBeInstanceOf(FlashGraphQLError);
  });
  it("createCaptchaChallenge throws when result is null", async () => {
    mockGql.mockResolvedValueOnce({ captchaCreateChallenge: { errors: [], result: null } });
    await expect(ops.createCaptchaChallenge()).rejects.toBeInstanceOf(FlashGraphQLError);
  });
});

describe("invoices", () => {
  it("createUsdInvoice returns the invoice and forwards cents", async () => {
    mockGql.mockResolvedValueOnce({
      lnUsdInvoiceCreate: { errors: [], invoice: { paymentHash: "h", paymentRequest: "lnbc1", satoshis: 10 } },
    });
    const inv = await ops.createUsdInvoice(W, 500, "memo");
    expect(inv.paymentRequest).toBe("lnbc1");
    expect(mockGql.mock.calls[0][1]).toEqual({ input: { walletId: W, amount: 500, memo: "memo" } });
  });
  it("createUsdInvoice throws when no invoice is returned", async () => {
    mockGql.mockResolvedValueOnce({ lnUsdInvoiceCreate: { errors: [], invoice: null } });
    await expect(ops.createUsdInvoice(W, 500)).rejects.toBeInstanceOf(FlashGraphQLError);
  });
});

describe("payments", () => {
  it("sendUsdToWallet returns the status", async () => {
    mockGql.mockResolvedValueOnce({ intraLedgerUsdPaymentSend: { errors: [], status: "SUCCESS" } });
    await expect(ops.sendUsdToWallet(W, "r" as WalletId, 100)).resolves.toBe("SUCCESS");
  });
  it("sendUsdToWallet defaults a null status to PENDING", async () => {
    mockGql.mockResolvedValueOnce({ intraLedgerUsdPaymentSend: { errors: [], status: null } });
    await expect(ops.sendUsdToWallet(W, "r" as WalletId, 100)).resolves.toBe("PENDING");
  });
  it("sendUsdToWallet throws on payload errors", async () => {
    mockGql.mockResolvedValueOnce({ intraLedgerUsdPaymentSend: { errors: [{ message: "boom" }], status: null } });
    await expect(ops.sendUsdToWallet(W, "r" as WalletId, 100)).rejects.toBeInstanceOf(FlashGraphQLError);
  });
  it("payInvoiceFromUsd defaults a null status to PENDING", async () => {
    mockGql.mockResolvedValueOnce({ lnInvoicePaymentSend: { errors: [], status: null } });
    await expect(ops.payInvoiceFromUsd(W, "lnbc1")).resolves.toBe("PENDING");
  });
});

describe("cashout (two-step)", () => {
  it("requestCashout returns the offer", async () => {
    const offer = { offerId: "o1", walletId: W, send: 1000, receiveUsd: null, receiveJmd: 150000, flashFee: 50, exchangeRate: 15000, expiresAt: 1 };
    mockGql.mockResolvedValueOnce({ requestCashout: { errors: [], offer } });
    await expect(ops.requestCashout(W, "bank1", 1000)).resolves.toEqual(offer);
  });
  it("requestCashout throws when no offer is returned", async () => {
    mockGql.mockResolvedValueOnce({ requestCashout: { errors: [], offer: null } });
    await expect(ops.requestCashout(W, "bank1", 1000)).rejects.toBeInstanceOf(FlashGraphQLError);
  });
  it("initiateCashout returns the id", async () => {
    mockGql.mockResolvedValueOnce({ initiateCashout: { errors: [], id: "cash-1" } });
    await expect(ops.initiateCashout("o1", W)).resolves.toBe("cash-1");
  });
});

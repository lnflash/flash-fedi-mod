// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

const flash = vi.hoisted(() => ({ state: null as unknown }));
const flagsHolder = vi.hoisted(() => ({
  flags: { bridge: true, send: true, receive: true, cashout: true, bridgeWithdraw: true, otpWhatsApp: true },
}));
vi.mock("../state/FlashContext", () => ({ useFlash: () => flash.state }));
vi.mock("../flags", () => ({ flags: flagsHolder.flags }));
vi.mock("../host/webln", () => ({
  hasHostProvider: vi.fn(),
  payWithHost: vi.fn(),
  makeHostInvoice: vi.fn(),
}));
vi.mock("../flash/operations", () => ({
  createUsdInvoice: vi.fn(),
  getInvoiceStatus: vi.fn(),
  payInvoiceFromUsd: vi.fn(),
}));

import BridgeTab from "./BridgeTab";
import { hasHostProvider, payWithHost } from "../host/webln";
import { createUsdInvoice, getInvoiceStatus } from "../flash/operations";

const hostReady = hasHostProvider as unknown as Mock;
const payHost = payWithHost as unknown as Mock;
const createInvoice = createUsdInvoice as unknown as Mock;
const invoiceStatus = getInvoiceStatus as unknown as Mock;
const refresh = vi.fn();

const price = {
  btcSatPrice: { base: 60_000, offset: 8 },
  usdCentPrice: { base: 1, offset: 0 },
  denominatorCurrency: "USD",
  timestamp: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  flagsHolder.flags.bridgeWithdraw = true;
  flash.state = {
    me: { defaultAccount: { realtimePrice: price } },
    usdWallet: { id: "w1", walletCurrency: "USD", balance: 100000, pendingIncomingBalance: 0 },
    refresh,
  };
});

describe("BridgeTab", () => {
  it("warns and disables when no Fedi host is present", () => {
    hostReady.mockReturnValue(false);
    render(<BridgeTab />);
    expect(screen.getByText(/No Fedi wallet detected/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Top up Flash" })).toBeDisabled();
  });

  it("confirms a settled top-up", async () => {
    hostReady.mockReturnValue(true);
    createInvoice.mockResolvedValue({ paymentHash: "h", paymentRequest: "lnbc1", satoshis: null });
    payHost.mockResolvedValue({ preimage: "p" });
    invoiceStatus.mockResolvedValue("PAID");
    render(<BridgeTab />);
    fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "5.00" } });
    fireEvent.click(screen.getByRole("button", { name: "Top up Flash" }));

    await waitFor(() => expect(screen.getByText("Topped up $5.00 from your Fedi balance.")).toBeInTheDocument());
  });

  it("does NOT claim success when the invoice never confirms (regression)", async () => {
    vi.useFakeTimers();
    hostReady.mockReturnValue(true);
    createInvoice.mockResolvedValue({ paymentHash: "h", paymentRequest: "lnbc1", satoshis: null });
    payHost.mockResolvedValue({ preimage: "p" });
    invoiceStatus.mockResolvedValue("PENDING"); // never settles
    render(<BridgeTab />);
    fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "5.00" } });
    fireEvent.click(screen.getByRole("button", { name: "Top up Flash" }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(16_000); // drive all 10 polls × 1.5s
    });
    vi.useRealTimers();

    expect(screen.getByText(/still confirming/)).toBeInTheDocument();
    expect(screen.queryByText(/Topped up/)).not.toBeInTheDocument();
  });

  it("hides the withdraw direction when bridgeWithdraw is off", () => {
    flagsHolder.flags.bridgeWithdraw = false;
    hostReady.mockReturnValue(true);
    render(<BridgeTab />);
    expect(screen.queryByText("Withdraw")).not.toBeInTheDocument();
    expect(screen.queryByText("Flash → Fedi")).not.toBeInTheDocument();
  });
});

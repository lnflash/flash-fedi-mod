// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const flash = vi.hoisted(() => ({ state: null as unknown }));
vi.mock("../state/FlashContext", () => ({ useFlash: () => flash.state }));
vi.mock("../flash/operations", () => ({
  createUsdInvoice: vi.fn(),
  getInvoiceStatus: vi.fn(),
}));
vi.mock("qrcode", () => {
  const toDataURL = vi.fn().mockResolvedValue("data:image/png;base64,AAA");
  // Expose on both default and namespace so the default import resolves either way.
  return { __esModule: true, default: { toDataURL }, toDataURL };
});

import ReceiveTab from "./ReceiveTab";
import { createUsdInvoice, getInvoiceStatus } from "../flash/operations";

const createInvoice = createUsdInvoice as unknown as Mock;
const invoiceStatus = getInvoiceStatus as unknown as Mock;
const refresh = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  flash.state = { usdWallet: { id: "w1", walletCurrency: "USD", balance: 0, pendingIncomingBalance: 0 }, refresh };
  invoiceStatus.mockResolvedValue("PENDING");
});

describe("ReceiveTab", () => {
  it("generates an invoice with a QR and forwards the cents", async () => {
    createInvoice.mockResolvedValue({ paymentHash: "h", paymentRequest: "lnbc1abc", satoshis: null });
    render(<ReceiveTab />);
    fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "5.00" } });
    fireEvent.click(screen.getByRole("button", { name: /generate invoice/i }));

    expect(await screen.findByText("lnbc1abc")).toBeInTheDocument();
    expect(await screen.findByAltText("Invoice QR")).toBeInTheDocument();
    expect(createInvoice).toHaveBeenCalledWith("w1", 500, undefined);
  });

  it("polls and shows a paid confirmation when the invoice settles", async () => {
    createInvoice.mockResolvedValue({ paymentHash: "h", paymentRequest: "lnbc1paid", satoshis: null });
    invoiceStatus.mockResolvedValue("PAID");
    render(<ReceiveTab />);
    fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "3.00" } });
    fireEvent.click(screen.getByRole("button", { name: /generate invoice/i }));
    await screen.findByText("lnbc1paid");

    await waitFor(() => expect(screen.getByText(/Paid!/)).toBeInTheDocument(), { timeout: 4000 });
    expect(refresh).toHaveBeenCalled();
  }, 6000);
});

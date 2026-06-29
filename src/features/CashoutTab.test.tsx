// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const flash = vi.hoisted(() => ({ state: null as unknown }));
vi.mock("../state/FlashContext", () => ({ useFlash: () => flash.state }));
vi.mock("../flash/operations", () => ({
  requestCashout: vi.fn(),
  initiateCashout: vi.fn(),
}));

import CashoutTab from "./CashoutTab";
import { initiateCashout, requestCashout } from "../flash/operations";

const reqCashout = requestCashout as unknown as Mock;
const initCashout = initiateCashout as unknown as Mock;
const refresh = vi.fn();

const bank = {
  id: "bank-1",
  bankName: "NCB",
  accountName: "J Doe",
  accountNumber: "12345678",
  accountType: "savings",
  bankBranch: "Kingston",
  currency: "JMD",
  isDefault: true,
};

function stateWith(bankAccounts: unknown[]) {
  return {
    me: { bankAccounts },
    usdWallet: { id: "w1", walletCurrency: "USD", balance: 100000, pendingIncomingBalance: 0 },
    refresh,
  };
}

beforeEach(() => vi.clearAllMocks());

describe("CashoutTab", () => {
  it("explains when no bank account is registered", () => {
    flash.state = stateWith([]);
    render(<CashoutTab />);
    expect(screen.getByText(/No bank account is registered/)).toBeInTheDocument();
  });

  it("runs the quote → confirm flow", async () => {
    flash.state = stateWith([bank]);
    reqCashout.mockResolvedValue({
      offerId: "o1",
      walletId: "w1",
      send: 1000,
      receiveUsd: null,
      receiveJmd: 150000,
      flashFee: 50,
      exchangeRate: 15000,
      expiresAt: 1893456000,
    });
    initCashout.mockResolvedValue("cash-1");
    render(<CashoutTab />);

    fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "10.00" } });
    fireEvent.click(screen.getByRole("button", { name: /get quote/i }));

    await waitFor(() => expect(screen.getByText("You send")).toBeInTheDocument());
    expect(reqCashout).toHaveBeenCalledWith("w1", "bank-1", 1000);

    fireEvent.click(screen.getByRole("button", { name: /confirm cashout/i }));
    await waitFor(() => expect(screen.getByText(/Cashout initiated/)).toBeInTheDocument());
    expect(initCashout).toHaveBeenCalledWith("o1", "w1");
  });
});

// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const flash = vi.hoisted(() => ({ state: null as unknown }));
vi.mock("../state/FlashContext", () => ({ useFlash: () => flash.state }));
vi.mock("../flash/operations", () => ({
  getRecipientWallet: vi.fn(),
  sendUsdToWallet: vi.fn(),
}));

import SendTab from "./SendTab";
import { getRecipientWallet, sendUsdToWallet } from "../flash/operations";

const getRecipient = getRecipientWallet as unknown as Mock;
const sendUsd = sendUsdToWallet as unknown as Mock;
const refresh = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  flash.state = { usdWallet: { id: "w1", walletCurrency: "USD", balance: 5000, pendingIncomingBalance: 0 }, refresh };
});

function amountInput() {
  return screen.getByPlaceholderText("0.00");
}

describe("SendTab", () => {
  it("flags insufficient balance and disables Send", () => {
    render(<SendTab />);
    fireEvent.change(screen.getByPlaceholderText("username"), { target: { value: "bob" } });
    fireEvent.change(amountInput(), { target: { value: "100.00" } }); // > $50 balance
    expect(screen.getByText("Insufficient balance")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
  });

  it("sends USD to a resolved recipient and reports success", async () => {
    getRecipient.mockResolvedValue({ id: "r1", walletCurrency: "USD" });
    sendUsd.mockResolvedValue("SUCCESS");
    render(<SendTab />);
    fireEvent.change(screen.getByPlaceholderText("username"), { target: { value: "bob" } });
    fireEvent.change(amountInput(), { target: { value: "10.00" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(screen.getByText("Sent $10.00 to @bob.")).toBeInTheDocument());
    expect(sendUsd).toHaveBeenCalledWith("w1", "r1", 1000, undefined);
    expect(refresh).toHaveBeenCalled();
  });

  it("maps a not-found recipient to a friendly message", async () => {
    getRecipient.mockRejectedValue(new Error("Account does not exist"));
    render(<SendTab />);
    fireEvent.change(screen.getByPlaceholderText("username"), { target: { value: "ghost" } });
    fireEvent.change(amountInput(), { target: { value: "1.00" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(screen.getByText("User @ghost not found.")).toBeInTheDocument());
    expect(sendUsd).not.toHaveBeenCalled();
  });
});

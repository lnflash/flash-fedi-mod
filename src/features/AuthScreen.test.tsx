// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const flash = vi.hoisted(() => ({ requestCode: vi.fn(), verifyCode: vi.fn() }));
const flagsHolder = vi.hoisted(() => ({
  flags: { bridge: true, send: true, receive: true, cashout: true, bridgeWithdraw: true, otpWhatsApp: true },
}));
vi.mock("../state/FlashContext", () => ({ useFlash: () => flash }));
vi.mock("../flags", () => ({ flags: flagsHolder.flags }));

import AuthScreen from "./AuthScreen";

const requestCode = flash.requestCode as unknown as Mock;
const verifyCode = flash.verifyCode as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  flagsHolder.flags.otpWhatsApp = true;
});

describe("AuthScreen", () => {
  it("rejects an obviously invalid phone number without calling the API", () => {
    render(<AuthScreen />);
    fireEvent.change(screen.getByPlaceholderText("876 555 1234"), { target: { value: "123" } });
    fireEvent.click(screen.getByRole("button", { name: /send verification code/i }));
    expect(screen.getByText("Enter a valid phone number.")).toBeInTheDocument();
    expect(requestCode).not.toHaveBeenCalled();
  });

  it("requests a code and advances to the code step", async () => {
    requestCode.mockResolvedValue(undefined);
    render(<AuthScreen />);
    fireEvent.change(screen.getByPlaceholderText("876 555 1234"), { target: { value: "8765551234" } });
    fireEvent.click(screen.getByRole("button", { name: /send verification code/i }));
    await waitFor(() => expect(screen.getByPlaceholderText("123456")).toBeInTheDocument());
    expect(requestCode).toHaveBeenCalledWith("+18765551234", "SMS");
  });

  it("surfaces the TOTP requirement after verifying", async () => {
    verifyCode.mockResolvedValue({ totpRequired: true });
    render(<AuthScreen />);
    fireEvent.change(screen.getByPlaceholderText("876 555 1234"), { target: { value: "8765551234" } });
    // Move to the code step by faking a successful requestCode first.
    requestCode.mockResolvedValue(undefined);
    fireEvent.click(screen.getByRole("button", { name: /send verification code/i }));
    const codeInput = await screen.findByPlaceholderText("123456");
    fireEvent.change(codeInput, { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /verify/i }));
    await waitFor(() => expect(screen.getByText(/2FA enabled/)).toBeInTheDocument());
  });

  it("offers WhatsApp delivery only when the flag is on", () => {
    const { unmount } = render(<AuthScreen />);
    expect(screen.getByText("WhatsApp")).toBeInTheDocument();
    unmount();

    flagsHolder.flags.otpWhatsApp = false;
    render(<AuthScreen />);
    expect(screen.queryByText("WhatsApp")).not.toBeInTheDocument();
    expect(screen.getByText("SMS")).toBeInTheDocument();
  });
});

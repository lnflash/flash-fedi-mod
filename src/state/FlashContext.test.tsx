// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("../flash/client", () => ({ getToken: vi.fn(), isAuthenticated: vi.fn(), setToken: vi.fn() }));
vi.mock("../auth/captcha", () => ({ solveCaptcha: vi.fn() }));
vi.mock("../flash/operations", () => ({
  getMe: vi.fn(),
  requestAuthCode: vi.fn(),
  userLogin: vi.fn(),
  logout: vi.fn(),
}));

import { FlashProvider, useFlash } from "./FlashContext";
import { getToken, isAuthenticated, setToken } from "../flash/client";
import { getMe, requestAuthCode, userLogin } from "../flash/operations";
import { solveCaptcha } from "../auth/captcha";

const wrapper = ({ children }: { children: ReactNode }) => <FlashProvider>{children}</FlashProvider>;

const ME = {
  id: "u1",
  username: "alice",
  phone: "+1",
  totpEnabled: false,
  defaultAccount: {
    id: "acc1",
    defaultWalletId: "u",
    wallets: [
      { id: "u", walletCurrency: "USD", balance: 100, pendingIncomingBalance: 0 },
      { id: "b", walletCurrency: "BTC", balance: 200, pendingIncomingBalance: 0 },
    ],
    realtimePrice: { btcSatPrice: { base: 1, offset: 0 }, usdCentPrice: { base: 1, offset: 0 }, denominatorCurrency: "USD", timestamp: 0 },
  },
  bankAccounts: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  (isAuthenticated as Mock).mockReturnValue(false);
});

describe("FlashContext", () => {
  it("starts anonymous when there is no stored token", () => {
    const { result } = renderHook(() => useFlash(), { wrapper });
    expect(result.current.status).toBe("anonymous");
  });

  it("requestCode solves the captcha then requests the auth code", async () => {
    (solveCaptcha as Mock).mockResolvedValue({ challengeCode: "c", validationCode: "v", secCode: "s" });
    (requestAuthCode as Mock).mockResolvedValue(undefined);
    const { result } = renderHook(() => useFlash(), { wrapper });

    await act(async () => {
      await result.current.requestCode("+18765551234", "SMS");
    });

    expect(solveCaptcha).toHaveBeenCalled();
    expect(requestAuthCode).toHaveBeenCalledWith(
      expect.objectContaining({ phone: "+18765551234", channel: "SMS", challengeCode: "c" }),
    );
  });

  it("verifyCode logs in, stores the token, and derives wallets", async () => {
    (userLogin as Mock).mockResolvedValue({ authToken: "tok", totpRequired: false, errors: [] });
    (getToken as Mock).mockReturnValue("tok");
    (getMe as Mock).mockResolvedValue(ME);
    const { result } = renderHook(() => useFlash(), { wrapper });

    await act(async () => {
      const r = await result.current.verifyCode("+1", "123456");
      expect(r.totpRequired).toBe(false);
    });

    expect(setToken).toHaveBeenCalledWith("tok");
    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    expect(result.current.usdWallet?.id).toBe("u");
    expect(result.current.btcWallet?.id).toBe("b");
  });

  it("verifyCode short-circuits when TOTP is required (stays anonymous)", async () => {
    (userLogin as Mock).mockResolvedValue({ authToken: null, totpRequired: true, errors: [] });
    const { result } = renderHook(() => useFlash(), { wrapper });

    await act(async () => {
      const r = await result.current.verifyCode("+1", "123456");
      expect(r.totpRequired).toBe(true);
    });

    expect(setToken).not.toHaveBeenCalled();
    expect(result.current.status).toBe("anonymous");
  });
});

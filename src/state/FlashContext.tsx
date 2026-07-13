import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getApiKeyId, isAuthenticated, setApiKey, setToken } from "../flash/client";
import * as flash from "../flash/operations";
import { solveCaptcha } from "../auth/captcha";
import type { Me, PhoneCodeChannel, Wallet } from "../flash/types";

type Status = "loading" | "anonymous" | "authenticated";

interface FlashState {
  status: Status;
  me: Me | null;
  error: string | null;
  usdWallet: Wallet | null;
  btcWallet: Wallet | null;
  clearError(): void;
  /** Solve captcha + request the SMS/WhatsApp code. */
  requestCode(phone: string, channel: PhoneCodeChannel): Promise<void>;
  /** Verify the code; returns { totpRequired }. */
  verifyCode(phone: string, code: string): Promise<{ totpRequired: boolean }>;
  refresh(): Promise<void>;
  logout(): Promise<void>;
}

const Ctx = createContext<FlashState | null>(null);

export function useFlash(): FlashState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useFlash must be used within FlashProvider");
  return v;
}

export function FlashProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>(isAuthenticated() ? "loading" : "anonymous");
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);

  const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

  const refresh = useCallback(async () => {
    if (!isAuthenticated()) return;
    try {
      const next = await flash.getMe();
      setMe(next);
      setStatus("authenticated");
    } catch (e) {
      setApiKey(null);
      setToken(null);
      setMe(null);
      setStatus("anonymous");
      setError(errMsg(e));
    }
  }, []);

  // Restore an existing session (token in sessionStorage) on mount.
  useEffect(() => {
    if (isAuthenticated()) void refresh();
  }, [refresh]);

  const requestCode = useCallback(async (phone: string, channel: PhoneCodeChannel) => {
    setError(null);
    const solved = await solveCaptcha();
    await flash.requestAuthCode({ phone, channel, ...solved });
  }, []);

  const verifyCode = useCallback(
    async (phone: string, code: string) => {
      setError(null);
      const payload = await flash.userLogin(phone, code);
      if (payload.totpRequired) return { totpRequired: true };
      if (!payload.authToken) throw new Error("Login failed: no auth token returned.");
      setToken(payload.authToken);
      // Connect once: mint a scoped API key so future reopens skip OTP/captcha.
      // Runs while the session token is live (client sends Bearer until the key
      // is stored). Best-effort — if the endpoint lacks the feature, fall back to
      // the session token so login still works; the user just won't stay connected.
      try {
        const key = await flash.createApiKey();
        if (key.apiKey) setApiKey(key.apiKey, key.id);
      } catch {
        /* no API key — session token continues to authenticate this tab */
      }
      await refresh();
      return { totpRequired: false };
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    // Full disconnect: revoke the minted key server-side, end the session, wipe
    // both credentials. After this a reopen lands back on the login screen.
    const keyId = getApiKeyId();
    if (keyId) await flash.revokeApiKey(keyId);
    await flash.logout();
    setApiKey(null);
    setToken(null);
    setMe(null);
    setStatus("anonymous");
  }, []);

  const usdWallet = useMemo(
    () => me?.defaultAccount.wallets.find((w) => w.walletCurrency === "USD") ?? null,
    [me],
  );
  const btcWallet = useMemo(
    () => me?.defaultAccount.wallets.find((w) => w.walletCurrency === "BTC") ?? null,
    [me],
  );

  const value: FlashState = {
    status,
    me,
    error,
    usdWallet,
    btcWallet,
    clearError: () => setError(null),
    requestCode,
    verifyCode,
    refresh,
    logout,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

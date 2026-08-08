export const config = {
  flashApiUrl: import.meta.env.VITE_FLASH_API_URL ?? "https://api.flashapp.me/graphql",
  geetestProduct: import.meta.env.VITE_GEETEST_PRODUCT ?? "bind",
  /** Session token from OTP login — sessionStorage (cleared when the tab/webview closes). */
  tokenStorageKey: "flash_session_token",
  /**
   * The API key the mod mints after OTP login. Persisted in localStorage (NOT
   * sessionStorage) so the connection survives the webview closing — the whole
   * point of "connect once". It is long-lived + scoped, revoked on Logout, and
   * expires server-side. Stored with its id so we can revoke it.
   */
  apiKeyStorageKey: "flash_api_key",
  apiKeyIdStorageKey: "flash_api_key_id",
  /**
   * Least-privilege scopes the mod needs: reads for the wallet/profile/history it
   * shows, writes for send / receive / bridge / cashout. No `admin`, no `write_user`.
   * Enum values are lowercase-underscore, matching the Flash API.
   */
  apiKeyScopes: [
    "read_user",
    "read_wallet",
    "read_transactions",
    "write_wallet",
    "write_transactions",
  ] as const,
  /** Key lifetime, in seconds. 30 days (2_592_000) — matches the console default. */
  apiKeyExpiresInSeconds: 2_592_000,
  /** Shown in the user's key list. Flash restricts names to letters, numbers, spaces,
   *  hyphens, and underscores — keep it within that charset. */
  apiKeyName: "Flash FediMod",
} as const;

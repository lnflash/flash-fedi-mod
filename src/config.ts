export const config = {
  flashApiUrl: import.meta.env.VITE_FLASH_API_URL ?? "https://api.flashapp.me/graphql",
  geetestProduct: import.meta.env.VITE_GEETEST_PRODUCT ?? "bind",
  /** Persist the user token in sessionStorage (cleared when the tab/webview closes). */
  tokenStorageKey: "flash_session_token",
} as const;

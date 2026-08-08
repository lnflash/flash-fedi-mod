import { config } from "../config";
import type { AuthToken, GqlError } from "./types";

/**
 * Minimal GraphQL client for the Flash API.
 *
 * Security model:
 *  - Holds ONLY the user's own credentials. No service key, ever.
 *  - Two credential shapes, both the user's own:
 *      • session token (from OTP login) — memory, mirrored to sessionStorage
 *        (tab-scoped) so a refresh inside the Fedi webview doesn't drop the session.
 *        Used to bootstrap login and to mint the API key.
 *      • API key (minted right after login) — memory, mirrored to localStorage so
 *        the mod stays connected across reopens. Scoped + revocable + expiring.
 *  - Requests prefer the API key (`X-API-KEY`); the session token (`Bearer`) is the
 *    fallback used before a key exists.
 *  - Never logs headers, tokens, or keys.
 */

export class FlashGraphQLError extends Error {
  readonly errors: GqlError[];
  readonly code?: string;
  constructor(errors: GqlError[]) {
    super(errors[0]?.message ?? "GraphQL error");
    this.name = "FlashGraphQLError";
    this.errors = errors;
    this.code = errors[0]?.code ?? undefined;
  }
}

export class FlashNetworkError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "FlashNetworkError";
  }
}

let token: AuthToken | null = readStoredToken();

function readStoredToken(): AuthToken | null {
  try {
    return (sessionStorage.getItem(config.tokenStorageKey) as AuthToken | null) ?? null;
  } catch {
    return null;
  }
}

export function setToken(next: AuthToken | null): void {
  token = next;
  try {
    if (next) sessionStorage.setItem(config.tokenStorageKey, next);
    else sessionStorage.removeItem(config.tokenStorageKey);
  } catch {
    /* storage unavailable (private mode / sandbox) — in-memory token still works */
  }
}

export function getToken(): AuthToken | null {
  return token;
}

// --- API key (localStorage, persistent) --------------------------------------
// Minted after OTP login; authenticates via `X-API-KEY`. Unlike the session token
// it survives the webview closing, so the user connects once. Stored alongside its
// id so we can revoke it on logout.
let apiKey: string | null = readFromLocal(config.apiKeyStorageKey);
let apiKeyId: string | null = readFromLocal(config.apiKeyIdStorageKey);

function readFromLocal(key: string): string | null {
  try {
    return localStorage.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function setApiKey(next: string | null, id: string | null = null): void {
  apiKey = next;
  apiKeyId = next ? id : null;
  try {
    if (next) {
      localStorage.setItem(config.apiKeyStorageKey, next);
      if (id) localStorage.setItem(config.apiKeyIdStorageKey, id);
      else localStorage.removeItem(config.apiKeyIdStorageKey);
    } else {
      localStorage.removeItem(config.apiKeyStorageKey);
      localStorage.removeItem(config.apiKeyIdStorageKey);
    }
  } catch {
    /* storage unavailable (private mode / sandbox) — in-memory key still works */
  }
}

export function getApiKey(): string | null {
  return apiKey;
}

/** The revoke handle for the stored key, if any. */
export function getApiKeyId(): string | null {
  return apiKeyId;
}

export function isAuthenticated(): boolean {
  return apiKey != null || token != null;
}

interface RequestOpts {
  /** Force an unauthenticated request even if a token is present (e.g. login flow). */
  anonymous?: boolean;
  signal?: AbortSignal;
}

const RETRYABLE_NETWORK_RETRIES = 2;

export async function gqlRequest<TData>(
  query: string,
  variables: Record<string, unknown> = {},
  opts: RequestOpts = {},
): Promise<TData> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!opts.anonymous) {
    // Prefer the long-lived scoped API key; fall back to the OTP session token
    // (used during login itself, before a key has been minted).
    if (apiKey) headers["X-API-KEY"] = apiKey;
    else if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let lastErr: unknown;
  for (let attempt = 0; attempt <= RETRYABLE_NETWORK_RETRIES; attempt++) {
    try {
      const res = await fetch(config.flashApiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ query, variables }),
        signal: opts.signal,
      });

      if (res.status === 401) {
        // Key revoked/expired or session ended — drop both credentials and force
        // a reconnect. (Don't leave a dead key in storage skipping the login screen.)
        setApiKey(null);
        setToken(null);
        throw new FlashGraphQLError([{ message: "Session expired. Please sign in again.", code: "UNAUTHENTICATED" }]);
      }
      if (!res.ok && res.status >= 500) {
        // server error — retry
        lastErr = new FlashNetworkError(`Flash API returned ${res.status}`);
        if (attempt < RETRYABLE_NETWORK_RETRIES) {
          await delay(300 * 2 ** attempt);
          continue;
        }
        throw lastErr;
      }

      const json = (await res.json()) as { data?: TData; errors?: GqlError[] };
      if (json.errors && json.errors.length > 0) throw new FlashGraphQLError(json.errors);
      if (json.data == null) throw new FlashGraphQLError([{ message: "Empty response from Flash API" }]);
      return json.data;
    } catch (err) {
      if (err instanceof FlashGraphQLError) throw err;
      lastErr = err;
      if (attempt < RETRYABLE_NETWORK_RETRIES) {
        await delay(300 * 2 ** attempt);
        continue;
      }
    }
  }
  throw new FlashNetworkError("Could not reach the Flash API. Check your connection.", lastErr);
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

import { config } from "../config";
import type { AuthToken, GqlError } from "./types";

/**
 * Minimal GraphQL client for the Flash API.
 *
 * Security model:
 *  - Holds ONLY the user's own auth token (from OTP login). No service key, ever.
 *  - Token lives in memory; optionally mirrored to sessionStorage (tab-scoped, not
 *    localStorage) so a refresh inside the Fedi webview doesn't drop the session.
 *  - Never logs headers or tokens.
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

export function isAuthenticated(): boolean {
  return token != null;
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
  if (!opts.anonymous && token) headers["Authorization"] = `Bearer ${token}`;

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

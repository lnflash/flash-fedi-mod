// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FlashGraphQLError,
  FlashNetworkError,
  getApiKey,
  getToken,
  gqlRequest,
  setApiKey,
  setToken,
} from "./client";
import type { AuthToken } from "./types";

function ok(data: unknown) {
  return { status: 200, ok: true, json: async () => ({ data }) };
}
function gqlErr(errors: unknown[]) {
  return { status: 200, ok: true, json: async () => ({ errors }) };
}
function http(status: number) {
  return { status, ok: false, json: async () => ({}) };
}

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  setToken(null);
  setApiKey(null);
});
afterEach(() => {
  vi.unstubAllGlobals();
  setToken(null);
  setApiKey(null);
});

describe("gqlRequest", () => {
  it("returns data on success", async () => {
    fetchMock.mockResolvedValueOnce(ok({ hello: "world" }));
    await expect(gqlRequest("query { hello }")).resolves.toEqual({ hello: "world" });
  });

  it("adds an Authorization header only when a token is set and not anonymous", async () => {
    setToken("tok-123" as AuthToken);
    fetchMock.mockResolvedValue(ok({ x: 1 }));

    await gqlRequest("q");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer tok-123");

    await gqlRequest("q", {}, { anonymous: true });
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBeUndefined();
  });

  it("sends X-API-KEY (not Authorization) when an API key is set, and skips it when anonymous", async () => {
    setApiKey("fk_live_abc", "key-id");
    fetchMock.mockResolvedValue(ok({ x: 1 }));

    await gqlRequest("q");
    expect(fetchMock.mock.calls[0][1].headers["X-API-KEY"]).toBe("fk_live_abc");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();

    await gqlRequest("q", {}, { anonymous: true });
    expect(fetchMock.mock.calls[1][1].headers["X-API-KEY"]).toBeUndefined();
  });

  it("prefers the API key over the session token when both are present", async () => {
    setToken("tok-123" as AuthToken);
    setApiKey("fk_live_abc", "key-id");
    fetchMock.mockResolvedValue(ok({ x: 1 }));

    await gqlRequest("q");
    expect(fetchMock.mock.calls[0][1].headers["X-API-KEY"]).toBe("fk_live_abc");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it("clears BOTH the API key and the token on 401", async () => {
    setToken("tok" as AuthToken);
    setApiKey("fk_live_abc", "key-id");
    fetchMock.mockResolvedValueOnce(http(401));
    const err = (await gqlRequest("q").catch((e) => e)) as FlashGraphQLError;
    expect(err.code).toBe("UNAUTHENTICATED");
    expect(getApiKey()).toBeNull();
    expect(getToken()).toBeNull();
  });

  it("throws FlashGraphQLError (with code) on GraphQL errors", async () => {
    fetchMock.mockResolvedValueOnce(gqlErr([{ message: "bad", code: "BAD_INPUT" }]));
    const err = (await gqlRequest("q").catch((e) => e)) as FlashGraphQLError;
    expect(err).toBeInstanceOf(FlashGraphQLError);
    expect(err.code).toBe("BAD_INPUT");
  });

  it("throws when data is null", async () => {
    fetchMock.mockResolvedValueOnce({ status: 200, ok: true, json: async () => ({ data: null }) });
    await expect(gqlRequest("q")).rejects.toBeInstanceOf(FlashGraphQLError);
  });

  it("clears the token and throws UNAUTHENTICATED on 401", async () => {
    setToken("tok" as AuthToken);
    fetchMock.mockResolvedValueOnce(http(401));
    const err = (await gqlRequest("q").catch((e) => e)) as FlashGraphQLError;
    expect(err).toBeInstanceOf(FlashGraphQLError);
    expect(err.code).toBe("UNAUTHENTICATED");
    expect(getToken()).toBeNull();
  });

  it("retries on 5xx then succeeds", async () => {
    fetchMock.mockResolvedValueOnce(http(503)).mockResolvedValueOnce(ok({ ok: true }));
    await expect(gqlRequest("q")).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws FlashNetworkError after exhausting retries on network failure", async () => {
    fetchMock.mockRejectedValue(new TypeError("offline"));
    const err = await gqlRequest("q").catch((e) => e);
    expect(err).toBeInstanceOf(FlashNetworkError);
    expect(fetchMock).toHaveBeenCalledTimes(3); // initial + 2 retries
  });
});

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FlashGraphQLError,
  FlashNetworkError,
  getToken,
  gqlRequest,
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
});
afterEach(() => {
  vi.unstubAllGlobals();
  setToken(null);
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

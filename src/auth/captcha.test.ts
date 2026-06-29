// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("../flash/operations", () => ({ createCaptchaChallenge: vi.fn() }));

import { CaptchaError, solveCaptcha } from "./captcha";
import { createCaptchaChallenge } from "../flash/operations";

const mockChallenge = createCaptchaChallenge as unknown as Mock;

const VALIDATE = {
  geetest_challenge: "ch",
  geetest_validate: "va",
  geetest_seccode: "se",
};

type Trigger = "success" | "error" | "close";

/** Install a fake window.initGeetest that drives the requested lifecycle outcome. */
function installGeetest(trigger: Trigger, validate: typeof VALIDATE | false = VALIDATE) {
  (window as { initGeetest?: unknown }).initGeetest = (_opts: unknown, cb: (c: unknown) => void) => {
    const handlers: Record<string, (e?: unknown) => void> = {};
    const captcha = {
      onReady(fn: () => void) {
        handlers.ready = fn;
        return captcha;
      },
      onSuccess(fn: () => void) {
        handlers.success = fn;
        return captcha;
      },
      onError(fn: (e: unknown) => void) {
        handlers.error = fn;
        return captcha;
      },
      onClose(fn: () => void) {
        handlers.close = fn;
        return captcha;
      },
      verify() {
        handlers.success?.();
      },
      getValidate: () => validate,
    };
    cb(captcha);
    // Drive the chosen outcome after the caller has wired up its handlers.
    if (trigger === "success") handlers.ready?.();
    else if (trigger === "error") handlers.error?.(new Error("x"));
    else handlers.close?.();
  };
}

beforeEach(() => {
  mockChallenge.mockReset();
  mockChallenge.mockResolvedValue({ id: "gt", challengeCode: "cc", newCaptcha: true, failbackMode: false });
});
afterEach(() => {
  delete (window as { initGeetest?: unknown }).initGeetest;
});

describe("solveCaptcha", () => {
  it("resolves with the mapped geetest validation fields on success", async () => {
    installGeetest("success");
    await expect(solveCaptcha()).resolves.toEqual({
      challengeCode: "ch",
      validationCode: "va",
      secCode: "se",
    });
  });

  it("rejects when the widget reports an error", async () => {
    installGeetest("error");
    await expect(solveCaptcha()).rejects.toBeInstanceOf(CaptchaError);
  });

  it("rejects when the user closes the widget", async () => {
    installGeetest("close");
    await expect(solveCaptcha()).rejects.toBeInstanceOf(CaptchaError);
  });

  it("rejects when validation cannot be read", async () => {
    installGeetest("success", false);
    await expect(solveCaptcha()).rejects.toBeInstanceOf(CaptchaError);
  });
});

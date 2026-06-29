/**
 * Geetest captcha integration for Flash login.
 *
 * Flow (verified shapes from the Flash schema; the geetest field mapping follows the
 * Galoy/Blink convention and must be confirmed against the live captcha widget):
 *   1. captchaCreateChallenge  -> { id, challengeCode, newCaptcha, failbackMode }
 *   2. initGeetest({ gt: id, challenge: challengeCode, offline: failbackMode, product })
 *   3. on success -> getValidate() -> { geetest_challenge, geetest_validate, geetest_seccode }
 *   4. map -> captchaRequestAuthCode({ challengeCode, validationCode, secCode })
 *
 * NOTE: Production CSP must allow `https://static.geetest.com` in script-src/connect-src.
 * Until the widget is verified on a device, this is the single integration point to test.
 */
import { config } from "../config";
import { createCaptchaChallenge } from "../flash/operations";

export interface SolvedCaptcha {
  challengeCode: string;
  validationCode: string;
  secCode: string;
}

interface GeetestValidate {
  geetest_challenge: string;
  geetest_validate: string;
  geetest_seccode: string;
}
interface GeetestCaptchaObj {
  appendTo(selector: string | HTMLElement): void;
  onReady(cb: () => void): GeetestCaptchaObj;
  onSuccess(cb: () => void): GeetestCaptchaObj;
  onError(cb: (err: unknown) => void): GeetestCaptchaObj;
  onClose(cb: () => void): GeetestCaptchaObj;
  verify(): void;
  getValidate(): GeetestValidate | false;
}
type InitGeetest = (
  opts: { gt: string; challenge: string; offline: boolean; product: string; lang?: string },
  cb: (captcha: GeetestCaptchaObj) => void,
) => void;

declare global {
  interface Window {
    initGeetest?: InitGeetest;
  }
}

const GEETEST_SRC = "https://static.geetest.com/static/tools/gt.js";
let scriptPromise: Promise<void> | null = null;

function loadGeetest(): Promise<void> {
  if (window.initGeetest) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = GEETEST_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load captcha (geetest)."));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export class CaptchaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CaptchaError";
  }
}

/**
 * Create a challenge and run the geetest widget. Resolves with the values needed for
 * captchaRequestAuthCode. Rejects (with a clear message) if the widget can't load —
 * the caller surfaces that to the user rather than faking a pass.
 */
export async function solveCaptcha(): Promise<SolvedCaptcha> {
  const challenge = await createCaptchaChallenge();
  await loadGeetest();
  const initGeetest = window.initGeetest;
  if (!initGeetest) throw new CaptchaError("Captcha unavailable. Please retry.");

  return new Promise<SolvedCaptcha>((resolve, reject) => {
    initGeetest(
      {
        gt: challenge.id,
        challenge: challenge.challengeCode,
        offline: challenge.failbackMode,
        product: config.geetestProduct,
        lang: "en",
      },
      (captcha) => {
        captcha
          .onReady(() => captcha.verify())
          .onSuccess(() => {
            const v = captcha.getValidate();
            if (!v) {
              reject(new CaptchaError("Captcha not completed."));
              return;
            }
            resolve({
              challengeCode: v.geetest_challenge,
              validationCode: v.geetest_validate,
              secCode: v.geetest_seccode,
            });
          })
          .onError(() => reject(new CaptchaError("Captcha error. Please retry.")))
          .onClose(() => reject(new CaptchaError("Captcha cancelled.")));
      },
    );
  });
}

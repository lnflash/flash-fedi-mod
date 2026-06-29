/**
 * Feature flags.
 *
 * Every major feature (the tabs) and a couple of sub-features behind them are gated
 * here so a deploy can ship with any flow disabled without code changes. Flags are
 * resolved once at startup from Vite env (`VITE_FEATURE_*`), falling back to the
 * defaults below. Values are public (they end up in the bundle) — never gate a
 * security boundary with a flag, only product surface area.
 *
 * Override examples (in `.env`):
 *   VITE_FEATURE_CASHOUT=false          # hide the Cash out tab
 *   VITE_FEATURE_BRIDGE_WITHDRAW=off    # top-up only; hide Flash → Fedi withdraw
 *   VITE_FEATURE_OTP_WHATSAPP=0         # SMS-only login
 */

export interface FeatureFlags {
  /** Major: Move tab (Lightning bridge between Fedi and Flash). */
  bridge: boolean;
  /** Major: Send tab (intraledger USD to a Flash username). */
  send: boolean;
  /** Major: Receive tab (Lightning invoice into the Flash USD wallet). */
  receive: boolean;
  /** Major: Cash out tab (USD balance → registered bank account). */
  cashout: boolean;
  /** Sub-flag behind Move: the Flash → Fedi withdraw direction. */
  bridgeWithdraw: boolean;
  /** Sub-flag behind Auth: offer WhatsApp as an OTP delivery channel. */
  otpWhatsApp: boolean;
}

export const DEFAULT_FLAGS: FeatureFlags = {
  bridge: true,
  send: true,
  receive: true,
  cashout: true,
  bridgeWithdraw: true,
  otpWhatsApp: true,
};

/** The major-feature flags, in tab display order. */
export const MAJOR_FEATURES = ["bridge", "send", "receive", "cashout"] as const;
export type MajorFeature = (typeof MAJOR_FEATURES)[number];

type EnvLike = Record<string, string | boolean | undefined>;

const TRUE = new Set(["1", "true", "on", "yes"]);
const FALSE = new Set(["0", "false", "off", "no"]);

/** Parse an env value into a boolean. Unrecognised/empty → fallback. */
export function parseFlag(value: string | boolean | undefined, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value == null) return fallback;
  const s = value.trim().toLowerCase();
  if (TRUE.has(s)) return true;
  if (FALSE.has(s)) return false;
  return fallback;
}

/**
 * Resolve flags from an env map (defaults to Vite's `import.meta.env`).
 * Pure and side-effect free so tests can pass any env in.
 */
export function resolveFlags(env: EnvLike = import.meta.env as unknown as EnvLike): FeatureFlags {
  return {
    bridge: parseFlag(env.VITE_FEATURE_BRIDGE, DEFAULT_FLAGS.bridge),
    send: parseFlag(env.VITE_FEATURE_SEND, DEFAULT_FLAGS.send),
    receive: parseFlag(env.VITE_FEATURE_RECEIVE, DEFAULT_FLAGS.receive),
    cashout: parseFlag(env.VITE_FEATURE_CASHOUT, DEFAULT_FLAGS.cashout),
    bridgeWithdraw: parseFlag(env.VITE_FEATURE_BRIDGE_WITHDRAW, DEFAULT_FLAGS.bridgeWithdraw),
    otpWhatsApp: parseFlag(env.VITE_FEATURE_OTP_WHATSAPP, DEFAULT_FLAGS.otpWhatsApp),
  };
}

/** Resolved flags for the running app. */
export const flags: FeatureFlags = resolveFlags();

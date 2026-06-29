// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import type { FeatureFlags } from "./flags";

const flash = vi.hoisted(() => ({ value: { status: "authenticated" } as { status: string } }));
const flagsHolder = vi.hoisted(() => ({
  flags: { bridge: true, send: true, receive: true, cashout: true, bridgeWithdraw: true, otpWhatsApp: true },
}));

vi.mock("./state/FlashContext", () => ({
  useFlash: () => flash.value,
  FlashProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("./flags", () => ({ flags: flagsHolder.flags }));
vi.mock("./features/WalletHeader", () => ({ default: () => null }));
vi.mock("./features/BridgeTab", () => ({ default: () => null }));
vi.mock("./features/SendTab", () => ({ default: () => null }));
vi.mock("./features/ReceiveTab", () => ({ default: () => null }));
vi.mock("./features/CashoutTab", () => ({ default: () => null }));
vi.mock("./features/AuthScreen", () => ({ default: () => <div data-testid="auth-screen" /> }));

async function loadApp(flags: Partial<FeatureFlags>, status = "authenticated") {
  // Mutate the captured reference (the vi.mock factory closed over flagsHolder.flags);
  // reassigning a new object would leave the mock pointing at the old one.
  Object.assign(flagsHolder.flags, {
    bridge: true,
    send: true,
    receive: true,
    cashout: true,
    bridgeWithdraw: true,
    otpWhatsApp: true,
    ...flags,
  });
  flash.value = { status };
  vi.resetModules();
  const mod = await import("./App");
  return mod.default;
}

beforeEach(() => vi.clearAllMocks());

describe("App tab gating", () => {
  it("shows all four tabs when every major flag is on", async () => {
    const App = await loadApp({});
    render(<App />);
    for (const label of ["Move", "Send", "Receive", "Cash out"]) {
      expect(screen.getByRole("button", { name: new RegExp(label, "i") })).toBeInTheDocument();
    }
  });

  it("hides a tab whose flag is off", async () => {
    const App = await loadApp({ cashout: false });
    render(<App />);
    expect(screen.queryByRole("button", { name: /cash out/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /move/i })).toBeInTheDocument();
  });

  it("shows an empty-state when every major feature is off", async () => {
    const App = await loadApp({ bridge: false, send: false, receive: false, cashout: false });
    render(<App />);
    expect(screen.getByText(/No features are currently enabled/)).toBeInTheDocument();
  });

  it("renders the auth screen when anonymous", async () => {
    const App = await loadApp({}, "anonymous");
    render(<App />);
    expect(screen.getByTestId("auth-screen")).toBeInTheDocument();
  });
});

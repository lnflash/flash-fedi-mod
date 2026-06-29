import { useState } from "react";
import { FlashProvider, useFlash } from "./state/FlashContext";
import AuthScreen from "./features/AuthScreen";
import WalletHeader from "./features/WalletHeader";
import BridgeTab from "./features/BridgeTab";
import SendTab from "./features/SendTab";
import ReceiveTab from "./features/ReceiveTab";
import CashoutTab from "./features/CashoutTab";
import { Banner, Spinner } from "./components/ui";
import { flags, type MajorFeature } from "./flags";

const ALL_TABS = [
  { id: "bridge", label: "Move", icon: "🔀", el: <BridgeTab /> },
  { id: "send", label: "Send", icon: "⚡", el: <SendTab /> },
  { id: "receive", label: "Receive", icon: "📥", el: <ReceiveTab /> },
  { id: "cashout", label: "Cash out", icon: "🏦", el: <CashoutTab /> },
] as const;

/** Only the tabs whose major-feature flag is enabled, in display order. */
const TABS = ALL_TABS.filter((t) => flags[t.id as MajorFeature]);

function Shell() {
  const { status } = useFlash();
  const [tab, setTab] = useState<string>(TABS[0]?.id ?? "");

  if (status === "loading") {
    return (
      <div className="min-h-screen grid place-items-center text-primary">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }
  if (status === "anonymous") return <AuthScreen />;

  if (TABS.length === 0) {
    return (
      <div className="min-h-screen pb-24">
        <WalletHeader />
        <main className="mx-auto max-w-md px-4 py-5">
          <Banner kind="info">No features are currently enabled.</Banner>
        </main>
      </div>
    );
  }

  const active = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    <div className="min-h-screen pb-24">
      <WalletHeader />
      <main className="mx-auto max-w-md px-4 py-5">{active.el}</main>

      <nav className="fixed bottom-0 inset-x-0 bg-layer border-t border-border">
        <div
          className="mx-auto max-w-md grid"
          style={{ gridTemplateColumns: `repeat(${TABS.length}, minmax(0, 1fr))` }}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`py-3 flex flex-col items-center gap-0.5 text-xs ${tab === t.id ? "text-primary font-semibold" : "text-muted"}`}
            >
              <span className="text-lg">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <FlashProvider>
      <Shell />
    </FlashProvider>
  );
}

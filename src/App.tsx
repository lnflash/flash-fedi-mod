import { useState } from "react";
import { FlashProvider, useFlash } from "./state/FlashContext";
import AuthScreen from "./features/AuthScreen";
import WalletHeader from "./features/WalletHeader";
import BridgeTab from "./features/BridgeTab";
import SendTab from "./features/SendTab";
import ReceiveTab from "./features/ReceiveTab";
import CashoutTab from "./features/CashoutTab";
import { Spinner } from "./components/ui";

const TABS = [
  { id: "bridge", label: "Move", icon: "🔀", el: <BridgeTab /> },
  { id: "send", label: "Send", icon: "⚡", el: <SendTab /> },
  { id: "receive", label: "Receive", icon: "📥", el: <ReceiveTab /> },
  { id: "cashout", label: "Cash out", icon: "🏦", el: <CashoutTab /> },
] as const;

function Shell() {
  const { status } = useFlash();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("bridge");

  if (status === "loading") {
    return (
      <div className="min-h-screen grid place-items-center text-primary">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }
  if (status === "anonymous") return <AuthScreen />;

  const active = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    <div className="min-h-screen pb-24">
      <WalletHeader />
      <main className="mx-auto max-w-md px-4 py-5">{active.el}</main>

      <nav className="fixed bottom-0 inset-x-0 bg-layer border-t border-border">
        <div className="mx-auto max-w-md grid grid-cols-4">
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

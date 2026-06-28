import { useState } from "react";
import { useFlash } from "../state/FlashContext";
import { Banner, Button, Card, Field, TextInput } from "../components/ui";
import { dollarsToCents, formatUsd, minorUnitToSats } from "../money/units";
import { hasHostProvider, makeHostInvoice, payWithHost } from "../host/webln";
import { createUsdInvoice, getInvoiceStatus, payInvoiceFromUsd } from "../flash/operations";

type Direction = "in" | "out";
type Phase = "idle" | "working" | "done" | "error";

export default function BridgeTab() {
  const { me, usdWallet, refresh } = useFlash();
  const [dir, setDir] = useState<Direction>("in");
  const [amount, setAmount] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const hostReady = hasHostProvider();
  const price = me?.defaultAccount.realtimePrice;
  const cents = dollarsToCents(amount);

  async function run() {
    if (!usdWallet || !price || cents == null || cents <= 0) return;
    setPhase("working");
    setMessage(null);
    try {
      if (dir === "in") {
        // Top up Flash from Fedi: Flash issues an invoice, Fedi pays it.
        const invoice = await createUsdInvoice(usdWallet.id, cents, "Top up from Fedi");
        await payWithHost(invoice.paymentRequest);
        // Confirm with Flash that the invoice settled.
        for (let i = 0; i < 10; i++) {
          const status = await getInvoiceStatus(invoice.paymentRequest);
          if (status === "PAID") break;
          if (status === "EXPIRED") throw new Error("Invoice expired before payment settled.");
          await new Promise((r) => setTimeout(r, 1500));
        }
        setMessage(`Topped up ${formatUsd(cents)} from your Fedi balance.`);
      } else {
        // Withdraw Flash → Fedi: Fedi issues an invoice, Flash pays it.
        const sats = minorUnitToSats(cents, price);
        const invoice = await makeHostInvoice(sats, "Withdraw from Flash");
        const status = await payInvoiceFromUsd(usdWallet.id, invoice.paymentRequest, "Withdraw to Fedi");
        if (status === "FAILURE") throw new Error("Flash could not pay the Fedi invoice.");
        setMessage(`Sent ${formatUsd(cents)} to your Fedi balance${status === "PENDING" ? " (pending)" : ""}.`);
      }
      setPhase("done");
      setAmount("");
      await refresh();
    } catch (e) {
      setPhase("error");
      setMessage(e instanceof Error ? e.message : "Bridge transfer failed.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-bold">Move money</h2>
        <p className="text-sm text-muted">Bridge between your Fedi balance and Flash over Lightning</p>
      </div>

      {!hostReady && (
        <Banner kind="info">
          No Fedi wallet detected. Open this mod inside the Fedi app to move funds. (Browsing in a desktop
          browser? A WebLN extension also works for testing.)
        </Banner>
      )}

      <Card className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <DirButton active={dir === "in"} onClick={() => setDir("in")} title="Top up Flash" subtitle="Fedi → Flash" />
          <DirButton active={dir === "out"} onClick={() => setDir("out")} title="Withdraw" subtitle="Flash → Fedi" />
        </div>

        <Field label="Amount (USD)" hint={cents != null && price ? `≈ ${minorUnitToSats(cents, price).toLocaleString()} sats` : undefined}>
          <TextInput
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>

        {message && <Banner kind={phase === "error" ? "error" : "success"}>{message}</Banner>}

        <Button
          onClick={run}
          loading={phase === "working"}
          disabled={!hostReady || !usdWallet || cents == null || cents <= 0}
        >
          {dir === "in" ? "Top up Flash" : "Withdraw to Fedi"}
        </Button>
      </Card>

      <p className="text-center text-xs text-muted">
        Lightning transfers are near-instant. The Fedi → Flash direction is how you add funds — Flash has no
        card/bank top-up.
      </p>
    </div>
  );
}

function DirButton({ active, onClick, title, subtitle }: { active: boolean; onClick: () => void; title: string; subtitle: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border p-3 text-center ${active ? "border-primary bg-primary-light" : "border-border"}`}
    >
      <p className={`font-semibold ${active ? "text-primary" : "text-ink"}`}>{title}</p>
      <p className="text-xs text-muted">{subtitle}</p>
    </button>
  );
}

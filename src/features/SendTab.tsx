import { useState } from "react";
import { useFlash } from "../state/FlashContext";
import { Banner, Button, Card, Field, TextInput } from "../components/ui";
import { dollarsToCents, formatUsd } from "../money/units";
import { getRecipientWallet, sendUsdToWallet } from "../flash/operations";

export default function SendTab() {
  const { usdWallet, refresh } = useFlash();
  const [username, setUsername] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const cents = dollarsToCents(amount);
  const balance = usdWallet?.balance ?? 0;
  const insufficient = cents != null && cents > balance;

  async function send() {
    if (!usdWallet || cents == null || cents <= 0) return;
    setBusy(true);
    setResult(null);
    try {
      const recipient = await getRecipientWallet(username.toLowerCase(), "USD");
      const status = await sendUsdToWallet(usdWallet.id, recipient.id, cents, memo || undefined);
      if (status === "FAILURE") throw new Error("Payment failed.");
      setResult({ ok: true, text: `Sent ${formatUsd(cents)} to @${username}${status === "PENDING" ? " (pending)" : ""}.` });
      setUsername("");
      setAmount("");
      setMemo("");
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not send payment.";
      setResult({ ok: false, text: /not found|does not exist|no wallet/i.test(msg) ? `User @${username} not found.` : msg });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-bold">Send to a Flash user</h2>
        <p className="text-sm text-muted">Instant, fee-free transfer by username</p>
      </div>
      <Card className="space-y-4">
        <Field label="Flash username">
          <div className="flex items-center rounded-xl border border-border bg-bg px-3">
            <span className="text-muted">@</span>
            <input
              className="w-full bg-transparent px-1 py-3 outline-none"
              value={username}
              placeholder="username"
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              maxLength={20}
            />
          </div>
        </Field>
        <Field
          label="Amount (USD)"
          error={insufficient ? "Insufficient balance" : undefined}
          hint={usdWallet ? `Balance ${formatUsd(balance)}` : undefined}
        >
          <TextInput inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Memo (optional)">
          <TextInput value={memo} maxLength={200} onChange={(e) => setMemo(e.target.value)} placeholder="What's it for?" />
        </Field>

        {result && <Banner kind={result.ok ? "success" : "error"}>{result.text}</Banner>}

        <Button onClick={send} loading={busy} disabled={!usdWallet || !username || cents == null || cents <= 0 || insufficient}>
          {cents != null ? `Send ${formatUsd(cents)}` : "Send"}
        </Button>
      </Card>
    </div>
  );
}

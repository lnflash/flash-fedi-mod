import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useFlash } from "../state/FlashContext";
import { Banner, Button, Card, Field, TextInput } from "../components/ui";
import { dollarsToCents, formatUsd } from "../money/units";
import { createUsdInvoice, getInvoiceStatus } from "../flash/operations";

export default function ReceiveTab() {
  const { usdWallet, refresh } = useFlash();
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);
  const [invoice, setInvoice] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cents = dollarsToCents(amount);

  async function generate() {
    if (!usdWallet || cents == null || cents <= 0) return;
    setBusy(true);
    setError(null);
    setPaid(false);
    try {
      const inv = await createUsdInvoice(usdWallet.id, cents, memo || undefined);
      setInvoice(inv.paymentRequest);
      setQr(await QRCode.toDataURL(inv.paymentRequest.toUpperCase(), { margin: 1, width: 240 }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create invoice.");
    } finally {
      setBusy(false);
    }
  }

  // Poll for settlement while an invoice is displayed.
  useEffect(() => {
    if (!invoice || paid) return;
    let cancelled = false;
    const timer = setInterval(async () => {
      const status = await getInvoiceStatus(invoice).catch(() => null);
      if (cancelled) return;
      if (status === "PAID") {
        setPaid(true);
        clearInterval(timer);
        void refresh();
      } else if (status === "EXPIRED") {
        clearInterval(timer);
      }
    }, 2500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [invoice, paid, refresh]);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-bold">Receive</h2>
        <p className="text-sm text-muted">Create a Lightning invoice to your Flash USD wallet</p>
      </div>
      <Card className="space-y-4">
        {!invoice ? (
          <>
            <Field label="Amount (USD)">
              <TextInput inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>
            <Field label="Memo (optional)">
              <TextInput value={memo} maxLength={200} onChange={(e) => setMemo(e.target.value)} placeholder="Note" />
            </Field>
            {error && <Banner kind="error">{error}</Banner>}
            <Button onClick={generate} loading={busy} disabled={!usdWallet || cents == null || cents <= 0}>
              Generate invoice
            </Button>
          </>
        ) : (
          <div className="space-y-4 text-center">
            {paid ? (
              <Banner kind="success">Paid! {cents != null ? formatUsd(cents) : ""} received.</Banner>
            ) : (
              <p className="text-sm text-muted">Waiting for payment…</p>
            )}
            {qr && <img src={qr} alt="Invoice QR" className="mx-auto rounded-lg border border-border" />}
            <div className="rounded-lg border border-border bg-bg p-3 break-all font-mono text-xs text-left">{invoice}</div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => void navigator.clipboard.writeText(invoice)}>
                Copy
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setInvoice(null);
                  setQr(null);
                  setPaid(false);
                  setAmount("");
                }}
              >
                New invoice
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

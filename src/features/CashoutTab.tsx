import { useState } from "react";
import { useFlash } from "../state/FlashContext";
import { Banner, Button, Card, Field, TextInput } from "../components/ui";
import { dollarsToCents, formatUsd } from "../money/units";
import { initiateCashout, requestCashout } from "../flash/operations";
import type { CashoutOffer } from "../flash/types";

export default function CashoutTab() {
  const { me, usdWallet, refresh } = useFlash();
  const banks = me?.bankAccounts ?? [];
  const [bankId, setBankId] = useState(banks[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [offer, setOffer] = useState<CashoutOffer | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cents = dollarsToCents(amount);
  const balance = usdWallet?.balance ?? 0;
  const insufficient = cents != null && cents > balance;

  async function getOffer() {
    if (!usdWallet || !bankId || cents == null || cents <= 0) return;
    setBusy(true);
    setError(null);
    try {
      setOffer(await requestCashout(usdWallet.id, bankId, cents));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not get a cashout offer.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!offer || !usdWallet) return;
    setBusy(true);
    setError(null);
    try {
      await initiateCashout(offer.offerId, usdWallet.id);
      setDone(true);
      setOffer(null);
      setAmount("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cashout failed.");
    } finally {
      setBusy(false);
    }
  }

  if (banks.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-lg font-bold">Cash out to bank</h2>
        </div>
        <Banner kind="info">
          No bank account is registered on your Flash account. Bank-account registration isn&apos;t exposed by the
          Flash API — add one in the Flash app first, then it&apos;ll appear here.
        </Banner>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-bold">Cash out to bank</h2>
        <p className="text-sm text-muted">Withdraw your USD balance to a local bank account</p>
      </div>

      <Card className="space-y-4">
        <Field label="Bank account">
          <select
            value={bankId}
            onChange={(e) => setBankId(e.target.value)}
            className="w-full rounded-xl border border-border bg-bg px-3 py-3"
          >
            {banks.map((b) => (
              <option key={b.id ?? b.accountNumber} value={b.id ?? ""}>
                {b.bankName} ····{b.accountNumber.slice(-4)} ({b.currency})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Amount (USD)" error={insufficient ? "Insufficient balance" : undefined} hint={`Balance ${formatUsd(balance)}`}>
          <TextInput inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>

        {error && <Banner kind="error">{error}</Banner>}
        {done && <Banner kind="success">Cashout initiated. You&apos;ll be notified when the bank transfer completes.</Banner>}

        {offer ? (
          <div className="space-y-3">
            <div className="rounded-xl bg-bg p-4 text-sm space-y-1">
              <Row label="You send" value={formatUsd(offer.send)} />
              <Row label="Flash fee" value={formatUsd(offer.flashFee)} />
              {offer.receiveJmd != null && <Row label="You receive" value={`J$${(offer.receiveJmd / 100).toFixed(2)}`} />}
              {offer.receiveUsd != null && <Row label="You receive" value={formatUsd(offer.receiveUsd)} />}
              <Row label="Offer expires" value={new Date(offer.expiresAt * 1000).toLocaleTimeString()} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => setOffer(null)}>
                Cancel
              </Button>
              <Button onClick={confirm} loading={busy}>
                Confirm cashout
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={getOffer} loading={busy} disabled={!bankId || cents == null || cents <= 0 || insufficient}>
            Get quote
          </Button>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

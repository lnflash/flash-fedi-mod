import { useFlash } from "../state/FlashContext";
import { formatSats, formatUsd, satsToMinorUnit } from "../money/units";

export default function WalletHeader() {
  const { me, usdWallet, btcWallet, logout } = useFlash();
  if (!me) return null;
  const price = me.defaultAccount.realtimePrice;

  const usdCents = usdWallet?.balance ?? 0;
  const btcSats = btcWallet?.balance ?? 0;
  const btcAsCents = satsToMinorUnit(btcSats, price);
  const totalCents = usdCents + btcAsCents;

  return (
    <header className="bg-layer border-b border-border sticky top-0 z-20">
      <div className="mx-auto max-w-md px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-primary text-white grid place-items-center">⚡</div>
          <div>
            <p className="text-sm font-semibold leading-tight">Flash</p>
            <p className="text-xs text-muted leading-tight">@{me.username ?? "you"}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted leading-tight">Total balance</p>
          <p className="text-lg font-bold text-primary leading-tight">{formatUsd(totalCents)}</p>
          <p className="text-[11px] text-muted leading-tight">
            {formatUsd(usdCents)} · {formatSats(btcSats)}
          </p>
        </div>
        <button onClick={() => void logout()} className="text-xs text-muted underline ml-2">
          Logout
        </button>
      </div>
    </header>
  );
}

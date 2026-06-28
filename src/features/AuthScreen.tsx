import { useState } from "react";
import { useFlash } from "../state/FlashContext";
import { Banner, Button, Card, Field, TextInput } from "../components/ui";
import type { PhoneCodeChannel } from "../flash/types";

const COUNTRIES = [
  { code: "JM", dial: "+1", name: "Jamaica" },
  { code: "US", dial: "+1", name: "United States" },
  { code: "SV", dial: "+503", name: "El Salvador" },
  { code: "GB", dial: "+44", name: "United Kingdom" },
];

export default function AuthScreen() {
  const { requestCode, verifyCode } = useFlash();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [dial, setDial] = useState("+1");
  const [local, setLocal] = useState("");
  const [channel, setChannel] = useState<PhoneCodeChannel>("SMS");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totp, setTotp] = useState(false);

  const phone = `${dial}${local.replace(/[^\d]/g, "")}`;

  async function onRequest() {
    setError(null);
    if (local.replace(/\D/g, "").length < 7) {
      setError("Enter a valid phone number.");
      return;
    }
    setBusy(true);
    try {
      await requestCode(phone, channel);
      setStep("code");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send code.");
    } finally {
      setBusy(false);
    }
  }

  async function onVerify() {
    setError(null);
    setBusy(true);
    try {
      const { totpRequired } = await verifyCode(phone, code);
      if (totpRequired) setTotp(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md space-y-5">
        <div className="text-center space-y-1">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary text-white text-2xl grid place-items-center">⚡</div>
          <h1 className="text-xl font-bold">Connect to Flash</h1>
          <p className="text-sm text-muted">
            {step === "phone" ? "Sign in with your Flash phone number" : `Enter the code sent to ${phone}`}
          </p>
        </div>

        {error && <Banner kind="error" onDismiss={() => setError(null)}>{error}</Banner>}
        {totp && <Banner kind="info">This account has 2FA enabled. TOTP upgrade is required to finish signing in.</Banner>}

        {step === "phone" ? (
          <div className="space-y-4">
            <Field label="Phone number">
              <div className="flex gap-2">
                <select
                  value={dial}
                  onChange={(e) => setDial(e.target.value)}
                  className="rounded-xl border border-border bg-bg px-2 py-3"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.dial}>
                      {c.dial} {c.code}
                    </option>
                  ))}
                </select>
                <TextInput
                  type="tel"
                  inputMode="tel"
                  placeholder="876 555 1234"
                  value={local}
                  onChange={(e) => setLocal(e.target.value)}
                />
              </div>
            </Field>
            <Field label="Delivery">
              <div className="flex gap-2">
                {(["SMS", "WHATSAPP"] as PhoneCodeChannel[]).map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setChannel(ch)}
                    className={`flex-1 rounded-xl border py-2 text-sm font-medium ${
                      channel === ch ? "border-primary bg-primary-light text-primary" : "border-border text-muted"
                    }`}
                  >
                    {ch === "SMS" ? "SMS" : "WhatsApp"}
                  </button>
                ))}
              </div>
            </Field>
            <Button onClick={onRequest} loading={busy}>
              Send verification code
            </Button>
            <p className="text-center text-xs text-muted">A captcha will appear to protect against abuse.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="6-digit code">
              <TextInput
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="text-center text-2xl tracking-[0.5em]"
              />
            </Field>
            <Button onClick={onVerify} loading={busy} disabled={code.length !== 6}>
              Verify &amp; sign in
            </Button>
            <button onClick={() => setStep("phone")} className="block w-full text-center text-sm text-muted underline">
              Change number
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}

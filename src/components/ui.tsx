import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`bg-layer rounded-2xl shadow-sm border border-border p-5 ${className}`}>{children}</div>;
}

export function Button({
  children,
  variant = "primary",
  loading = false,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary"; loading?: boolean }) {
  const base =
    "w-full rounded-xl px-4 py-3 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2";
  const styles =
    variant === "primary"
      ? "bg-primary text-white hover:bg-primary-dark"
      : "bg-primary-light text-primary hover:bg-border";
  return (
    <button className={`${base} ${styles} ${className}`} disabled={loading || rest.disabled} {...rest}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return <span className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} />;
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-muted">{label}</span>
      {children}
      {error ? <span className="block text-xs text-error">{error}</span> : hint ? <span className="block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function TextInput({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-xl border border-border bg-bg px-3 py-3 text-ink outline-none focus:border-primary ${className}`}
      {...rest}
    />
  );
}

export function Banner({ kind, children, onDismiss }: { kind: "error" | "info" | "success"; children: ReactNode; onDismiss?: () => void }) {
  const styles =
    kind === "error"
      ? "bg-red-50 text-error border-error/30"
      : kind === "success"
        ? "bg-primary-light text-primary border-primary/30"
        : "bg-amber-50 text-warning border-warning/30";
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${styles}`}>
      <div className="flex items-start justify-between gap-3">
        <div>{children}</div>
        {onDismiss && (
          <button onClick={onDismiss} className="shrink-0 underline opacity-70">
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}

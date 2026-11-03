/**
 * Form primitives for tool pages. Server-safe (no hooks); usable from client components.
 */
import clsx from "clsx";

export const inputCls = "num w-full rounded-lg border border-line-strong bg-sunken px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-50";

export function Field({ label, hint, children, className }: { label: string; hint?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <label className={clsx("block", className)}>
      <span className="text-xs text-muted">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block text-[11px] text-faint">{hint}</span>}
    </label>
  );
}

export function Button({ children, variant = "primary", className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  return (
    <button
      {...rest}
      className={clsx(
        "rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-accent text-black",
        variant === "ghost" && "border border-line-strong text-fg hover:border-accent",
        variant === "danger" && "border border-down/40 text-down hover:bg-down-soft",
        className
      )}
    >
      {children}
    </button>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-lg border border-line-strong p-0.5">
      {options.map((o) => (
        <button
          type="button"
          role="radio"
          aria-checked={value === o.value}
          key={o.value}
          onClick={() => onChange(o.value)}
          className={clsx("rounded-md px-3 py-1.5 text-sm", value === o.value ? "bg-accent-soft text-accent" : "text-muted hover:text-fg")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return <div role="alert" className="rounded-lg border border-down/30 bg-down-soft px-4 py-3 text-sm text-down">{children}</div>;
}

export const AI_DISCLAIMER = "AI can be wrong, misread charts, or miss context. This is not financial advice.";

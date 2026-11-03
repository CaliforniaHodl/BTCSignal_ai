/** Small form primitives for calculators. Server-safe. */
import clsx from "clsx";

export const inputCls =
  "num w-full min-w-0 rounded-lg border border-line-strong bg-sunken px-3 py-2 outline-none focus:border-accent";

export function Field({ label, htmlFor, hint, children, className }: { label: string; htmlFor: string; hint?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("min-w-0", className)}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs uppercase tracking-wider text-faint">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-faint">{hint}</p>}
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-lg border border-line p-0.5 text-sm">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={o.id === value}
          onClick={() => onChange(o.id)}
          className={clsx("rounded-md px-3 py-1 transition", o.id === value ? "bg-accent text-black" : "text-muted hover:text-fg")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";

const MAX = 5 * 1024 * 1024;
const TYPES = ["image/png", "image/jpeg", "image/webp"];

/** Chart screenshot picker with drag-and-drop, paste, and preview. The server re-validates magic bytes. */
export function ChartUpload({ file, onFile, disabled }: { file: File | null; onFile: (f: File | null) => void; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const f = [...(e.clipboardData?.files ?? [])][0];
      if (f && !disabled) pick(f);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  function pick(f: File | undefined) {
    setErr(null);
    if (!f) return;
    if (!TYPES.includes(f.type)) return setErr("Use a PNG, JPEG or WebP screenshot.");
    if (f.size > MAX) return setErr(`That image is ${(f.size / 1048576).toFixed(1)} MB; the limit is 5 MB.`);
    onFile(f);
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); if (!disabled) pick(e.dataTransfer.files[0]); }}
        className={clsx("grid min-h-40 place-items-center rounded-xl border border-dashed p-4 text-center transition-colors", drag ? "border-accent bg-accent-soft" : "border-line-strong bg-sunken")}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- local blob preview
          <img src={url} alt="Chart to analyse" className="max-h-72 w-auto rounded-lg" />
        ) : (
          <div className="text-sm text-muted">
            Drop a chart screenshot, paste it, or
            <button type="button" disabled={disabled} onClick={() => input.current?.click()} className="ml-1 text-accent underline">choose a file</button>
            <div className="mt-1 text-xs text-faint">PNG, JPEG or WebP · up to 5 MB</div>
          </div>
        )}
      </div>
      <input ref={input} type="file" accept={TYPES.join(",")} hidden onChange={(e) => pick(e.target.files?.[0])} />
      <div className="mt-2 flex items-center gap-3 text-xs">
        {file && (
          <>
            <span className="truncate text-faint">{file.name} · {(file.size / 1024).toFixed(0)} KB</span>
            <button type="button" disabled={disabled} onClick={() => { onFile(null); if (input.current) input.current.value = ""; }} className="text-muted underline">Remove</button>
          </>
        )}
        {err && <span className="text-down">{err}</span>}
      </div>
    </div>
  );
}

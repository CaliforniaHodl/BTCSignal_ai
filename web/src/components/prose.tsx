import clsx from "clsx";
import "./prose.css";

/** Renders trusted HTML produced by `renderMarkdown` from our own content files. */
export function ProseHtml({ html, className }: { html: string; className?: string }) {
  return <div className={clsx("btc-prose", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Long-form JSX (legal pages, FAQ answers) with the same typography. */
export function Prose({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx("btc-prose", className)}>{children}</div>;
}

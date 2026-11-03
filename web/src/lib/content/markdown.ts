/**
 * Markdown → HTML for our own content files (content/posts, content/learn).
 * Input is repo-controlled, not user input, so no sanitiser is needed; raw HTML
 * in the source is still escaped defensively because none of our files need it.
 */
import { Marked } from "marked";

const md = new Marked({
  gfm: true,
  async: false,
  renderer: {
    // Our files never need raw HTML; render it as text rather than trusting it.
    html({ text }) {
      return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    },
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      const external = /^https?:\/\//.test(href);
      const local = external ? href : normaliseLocalHref(href);
      const t = title ? ` title="${escapeAttr(title)}"` : "";
      return external
        ? `<a href="${escapeAttr(local)}"${t} rel="noopener noreferrer nofollow" target="_blank">${text}</a>`
        : `<a href="${escapeAttr(local)}"${t}>${text}</a>`;
    },
  },
});

/** Legacy Hugo links end in "/"; the new app serves the slash-less form. */
export function normaliseLocalHref(href: string): string {
  if (!href.startsWith("/") || href === "/") return href;
  const [path, rest = ""] = href.split(/(?=[?#])/);
  return path.replace(/\/+$/, "") + rest;
}

const escapeAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

export function renderMarkdown(source: string): string {
  return md.parse(source) as string;
}

/** Rough reading time at 220 wpm, ignoring code fences. */
export function readingMinutes(source: string): number {
  const words = source.replace(/```[\s\S]*?```/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

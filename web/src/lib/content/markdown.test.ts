import { describe, expect, it } from "vitest";
import { normaliseLocalHref, readingMinutes, renderMarkdown } from "./markdown";

describe("markdown", () => {
  it("strips legacy trailing slashes from local links only", () => {
    expect(normaliseLocalHref("/learn/rsi-divergence/")).toBe("/learn/rsi-divergence");
    expect(normaliseLocalHref("/posts/#top")).toBe("/posts#top");
    expect(normaliseLocalHref("/")).toBe("/");
    expect(normaliseLocalHref("#x")).toBe("#x");
  });
  it("renders GFM tables, escapes raw HTML, and hardens external links", () => {
    const html = renderMarkdown("| a | b |\n|---|---|\n| 1 | 2 |\n\n<script>x</script>\n\n[t](https://x.com/a) [l](/learn/glossary/)");
    expect(html).toContain("<table>");
    expect(html).not.toContain("<script>");
    expect(html).toContain('rel="noopener noreferrer nofollow"');
    expect(html).toContain('href="/learn/glossary"');
  });
  it("estimates reading time", () => {
    expect(readingMinutes("word ".repeat(660))).toBe(3);
    expect(readingMinutes("")).toBe(1);
  });
});

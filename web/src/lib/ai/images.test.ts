import { describe, expect, it } from "vitest";
import { MAX_IMAGE_BYTES, sniffImageType, validateImage } from "./images";

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const webp = new Uint8Array([..."RIFF"].map((c) => c.charCodeAt(0)).concat([0, 0, 0, 0], [..."WEBP"].map((c) => c.charCodeAt(0))));
const gif = new Uint8Array([..."GIF89a"].map((c) => c.charCodeAt(0)));

describe("sniffImageType", () => {
  it("detects png/jpeg/webp by magic bytes", () => {
    expect(sniffImageType(png)).toBe("image/png");
    expect(sniffImageType(jpg)).toBe("image/jpeg");
    expect(sniffImageType(webp)).toBe("image/webp");
  });
  it("rejects other formats and truncated headers", () => {
    expect(sniffImageType(gif)).toBeNull();
    expect(sniffImageType(png.subarray(0, 4))).toBeNull();
    expect(sniffImageType(new TextEncoder().encode("<svg xmlns="))).toBeNull();
  });
});

describe("validateImage", () => {
  it("accepts a valid image and returns base64", () => {
    const r = validateImage(png);
    expect(r.ok && r.type).toBe("image/png");
    expect(r.ok && Buffer.from(r.base64, "base64").length).toBe(png.length);
  });
  it("rejects empty, oversize and wrong-type files", () => {
    expect(validateImage(new Uint8Array()).ok).toBe(false);
    const big = new Uint8Array(MAX_IMAGE_BYTES + 1);
    big.set(png);
    expect(validateImage(big).ok).toBe(false);
    expect(validateImage(gif).ok).toBe(false);
  });
});

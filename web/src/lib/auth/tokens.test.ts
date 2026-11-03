import { describe, expect, it } from "vitest";
import { hashToken, newRecoveryCode, newToken, normaliseRecoveryCode } from "./tokens";

describe("tokens", () => {
  it("recovery codes round-trip through sloppy user input", () => {
    for (let i = 0; i < 200; i++) {
      const c = newRecoveryCode();
      expect(c).toMatch(/^BTCS-[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){3}$/);
      expect(normaliseRecoveryCode(c.toLowerCase().replace(/-/g, " "))).toBe(c);
    }
  });
  it("maps ambiguous O/I/L and rejects junk", () => {
    expect(normaliseRecoveryCode("BTCS-OOOO-IIII-LLLL-0000")).toBe("BTCS-0000-1111-1111-0000");
    expect(normaliseRecoveryCode("BTCS-123")).toBeNull();
    expect(normaliseRecoveryCode("BTCS-UUUU-0000-0000-0000")).toBeNull(); // U isn't in the alphabet
  });
  it("tokens are unique and hashes are stable", () => {
    const a = newToken(), b = newToken();
    expect(a).not.toBe(b);
    expect(hashToken(a)).toBe(hashToken(a));
    expect(hashToken(a)).not.toBe(a);
  });
});

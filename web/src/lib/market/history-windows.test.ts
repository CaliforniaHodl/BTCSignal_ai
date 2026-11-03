import { describe, expect, it } from "vitest";
import { dayWindows, mergeDaily } from "./history-windows";

const DAY = 86400;

describe("dayWindows", () => {
  it("covers the range in ≤300-day chunks with no gaps", () => {
    const w = dayWindows(0, 700 * DAY);
    expect(w).toEqual([[0, 299 * DAY], [300 * DAY, 599 * DAY], [600 * DAY, 700 * DAY]]);
  });
  it("single window for short ranges", () => {
    expect(dayWindows(DAY + 5, 3 * DAY)).toEqual([[DAY, 3 * DAY]]);
  });
});

describe("mergeDaily", () => {
  it("dedupes and sorts", () => {
    expect(mergeDaily([[[2, 20], [1, 10]], [[2, 21], [3, 0], [4, 40]]])).toEqual([[1, 10], [2, 21], [4, 40]]);
  });
});

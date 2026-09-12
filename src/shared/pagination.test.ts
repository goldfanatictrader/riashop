import { describe, expect, it } from "vitest";
import { mergePageById, parseOffsetCursor } from "./pagination";

describe("pagination helpers", () => {
  it("menerima cursor offset bulat non-negatif", () => {
    expect(parseOffsetCursor(undefined)).toBe(0);
    expect(parseOffsetCursor("")).toBe(0);
    expect(parseOffsetCursor("50")).toBe(50);
    expect(parseOffsetCursor("-1")).toBeNull();
    expect(parseOffsetCursor("1.5")).toBeNull();
    expect(parseOffsetCursor("50x")).toBeNull();
  });

  it("menambah halaman tanpa menggandakan id", () => {
    expect(mergePageById([{ id: "a", value: 1 }], [{ id: "a", value: 2 }, { id: "b", value: 3 }, { id: "b", value: 4 }]))
      .toEqual([{ id: "a", value: 1 }, { id: "b", value: 3 }]);
  });
});

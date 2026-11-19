import { describe, expect, test } from "vitest";

import { parseCommuteForm } from "./setting";

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

const valid = { kind: "morning", departureTime: "08:00", arsId: "01001", routeName: "146", leadMinutes: "10" };

describe("parseCommuteForm (AC2, AC4)", () => {
  test("accepts a complete form", () => {
    expect(parseCommuteForm(form(valid))).toEqual({
      ok: true,
      value: { kind: "morning", departureTime: "08:00", arsId: "01001", routeName: "146", leadMinutes: 10 },
    });
  });

  test("lead minutes default to 10 when left empty", () => {
    const r = parseCommuteForm(form({ ...valid, leadMinutes: "" }));
    expect(r.ok && r.value.leadMinutes).toBe(10);
  });

  test.each([
    [{ departureTime: "8:00" }, "출발 시각"],
    [{ arsId: "1001" }, "5자리"],
    [{ routeName: " " }, "노선 번호"],
    [{ leadMinutes: "0" }, "알림 시점"],
  ])("rejects %o", (patch, message) => {
    const r = parseCommuteForm(form({ ...valid, ...patch }));
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toContain(message);
  });
});

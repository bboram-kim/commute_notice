import { describe, expect, test, vi } from "vitest";

import type { CommuteSetting } from "@/features/commute";

import { dueDeparture, runDispatch, type DispatchDeps } from "./dispatch";

const at = (s: string) => new Date(`${s}+09:00`);

const morning: CommuteSetting = {
  kind: "morning",
  departureTime: "08:00",
  arsId: "01001",
  routeName: "146",
  stationName: "종로2가사거리",
  location: { lon: 126.98, lat: 37.57 },
  leadMinutes: 10,
};
const evening: CommuteSetting = { ...morning, kind: "evening", departureTime: "18:30", leadMinutes: 15 };

describe("dueDeparture (AC7, AC8, AC14)", () => {
  test("due in the minute that is lead minutes before departure, any second", () => {
    // 2026-11-19 is a Thursday.
    expect(dueDeparture(morning, at("2026-11-19T07:50:00"))?.serviceDate).toBe("2026-11-19");
    expect(dueDeparture(morning, at("2026-11-19T07:50:59"))?.departure).toEqual(at("2026-11-19T08:00:00"));
    expect(dueDeparture(morning, at("2026-11-19T07:49:59"))).toBeNull();
    expect(dueDeparture(morning, at("2026-11-19T07:51:00"))).toBeNull();
  });

  test("uses each commute's own lead time", () => {
    expect(dueDeparture(evening, at("2026-11-19T18:15:00"))).not.toBeNull();
    expect(dueDeparture(evening, at("2026-11-19T18:20:00"))).toBeNull();
  });

  test("skips Saturday and Sunday", () => {
    expect(dueDeparture(morning, at("2026-11-21T07:50:00"))).toBeNull();
    expect(dueDeparture(morning, at("2026-11-22T07:50:00"))).toBeNull();
    expect(dueDeparture(morning, at("2026-11-23T07:50:00"))).not.toBeNull();
  });

  test("evaluates time in KST regardless of the server clock (UTC instant)", () => {
    expect(dueDeparture(morning, new Date("2026-11-18T22:50:00Z"))).not.toBeNull();
  });
});

describe("runDispatch (AC7, AC8, AC13)", () => {
  function deps(claimed = new Set<string>()) {
    const sent: string[] = [];
    const recorded: Array<[number, { success: number; total: number }]> = [];
    const d: DispatchDeps = {
      listSettings: async () => [morning, evening],
      claim: async (kind, due) => {
        const key = `${kind}:${due.serviceDate}`;
        if (claimed.has(key)) return null;
        claimed.add(key);
        return claimed.size;
      },
      record: async (id, r) => {
        recorded.push([id, r]);
      },
      buildBriefing: async (setting, departure, now) => ({
        setting,
        departure,
        queriedAt: now,
        weather: { precipitationType: "없음", amount: null, temperature: 3 },
        buses: [],
      }),
      send: vi.fn(async (p) => {
        sent.push(p.body);
        return { success: 2, total: 2 };
      }),
    };
    return { d, sent, recorded };
  }

  test("sends the due commute once to all devices and records the result", async () => {
    const { d, sent, recorded } = deps();
    const results = await runDispatch(at("2026-11-19T07:50:10"), d);
    expect(results).toEqual([{ kind: "morning", success: 2, total: 2 }]);
    expect(sent).toEqual(["08:00 출발 · 강수 없음 · 3°C\n146번 도착 예정 버스 없음"]);
    expect(recorded).toEqual([[1, { success: 2, total: 2 }]]);
  });

  test("a repeated wake-up on the same day does not send again", async () => {
    const claimed = new Set<string>();
    const first = deps(claimed);
    await runDispatch(at("2026-11-19T07:50:00"), first.d);
    const second = deps(claimed);
    await runDispatch(at("2026-11-19T07:50:30"), second.d);
    expect(second.sent).toEqual([]);
  });

  test("nothing is sent outside the due minute", async () => {
    const { d, sent } = deps();
    await runDispatch(at("2026-11-19T12:00:00"), d);
    expect(sent).toEqual([]);
  });
});

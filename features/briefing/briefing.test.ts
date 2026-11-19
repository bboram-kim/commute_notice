import { describe, expect, test, vi } from "vitest";

import type { CommuteSetting } from "@/features/commute";

import { buildBriefing, formatNotification, toWidgetJson, type Briefing } from "./briefing";

const at = (s: string) => new Date(`${s}+09:00`);

const setting: CommuteSetting = {
  kind: "morning",
  departureTime: "08:00",
  arsId: "01001",
  routeName: "146",
  stationName: "종로2가사거리",
  location: { lon: 126.98, lat: 37.57 },
  leadMinutes: 10,
};

const briefing = (patch: Partial<Briefing>): Briefing => ({
  setting,
  departure: at("2026-11-19T08:00:00"),
  queriedAt: at("2026-11-19T07:50:00"),
  weather: { precipitationType: "비", amount: "2mm", temperature: 3 },
  buses: [at("2026-11-19T08:04:00"), at("2026-11-19T08:19:00")],
  ...patch,
});

describe("formatNotification (AC9, AC10, AC11)", () => {
  test("matches the spec example", () => {
    expect(formatNotification(briefing({}))).toEqual({
      title: "출근 알림",
      body: "08:00 출발 · 비 2mm · 3°C\n146번 08:04 도착 (출발 4분 뒤) · 다음 08:19",
    });
  });

  test("a bus before the departure shows minutes before", () => {
    const { body } = formatNotification(briefing({ buses: [at("2026-11-19T07:57:30")] }));
    expect(body.split("\n")[1]).toBe("146번 07:57 도착 (출발 3분 전)");
  });

  test("no rain reads as 강수 없음", () => {
    const { body } = formatNotification(
      briefing({ weather: { precipitationType: "없음", amount: null, temperature: -1 } }),
    );
    expect(body.split("\n")[0]).toBe("08:00 출발 · 강수 없음 · -1°C");
  });

  test("no bus coming", () => {
    expect(formatNotification(briefing({ buses: [] })).body.split("\n")[1]).toBe("146번 도착 예정 버스 없음");
  });

  test("failed lookups only mark the failed side", () => {
    const { body } = formatNotification(briefing({ weather: null, buses: null }));
    expect(body).toBe("08:00 출발 · 날씨 정보를 가져오지 못했습니다\n146번 버스 정보를 가져오지 못했습니다");
  });

  test("evening uses the 퇴근 title", () => {
    expect(formatNotification(briefing({ setting: { ...setting, kind: "evening" } })).title).toBe("퇴근 알림");
  });
});

describe("buildBriefing", () => {
  test("a failing weather lookup still returns bus data", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const b = await buildBriefing(setting, at("2026-11-19T08:00:00"), at("2026-11-19T07:50:00"), {
      fetchWeather: async () => {
        throw new Error("down");
      },
      fetchStation: async () => ({
        arsId: "01001",
        stationName: "종로2가사거리",
        location: { lon: 126.98, lat: 37.57 },
        routes: [{ routeName: "146", next: [{ seconds: 840, message: "14분후" }, { seconds: 0, message: "운행종료" }] }],
      }),
    });
    expect(b.weather).toBeNull();
    expect(b.buses?.map((d) => d.toISOString())).toEqual(["2026-11-18T23:04:00.000Z"]);
  });
});

test("toWidgetJson returns KST ISO times (AC12, AC14)", () => {
  expect(toWidgetJson(briefing({}))).toEqual({
    kind: "morning",
    label: "출근",
    departureTime: "08:00",
    stationName: "종로2가사거리",
    routeName: "146",
    weather: { precipitationType: "비", amount: "2mm", temperature: 3 },
    weatherError: null,
    buses: ["2026-11-19T08:04:00+09:00", "2026-11-19T08:19:00+09:00"],
    busError: null,
    queriedAt: "2026-11-19T07:50:00+09:00",
  });
});

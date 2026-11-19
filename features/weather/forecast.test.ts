import { describe, expect, test } from "vitest";

import { fetchWeather, formatAmount, shortTermBase, ultraShortBase } from "./forecast";
import { toKmaGrid } from "./grid";

const at = (s: string) => new Date(`${s}+09:00`);

function kmaResponse(items: Array<[string, string, string]>, date = "20261119") {
  return new Response(
    JSON.stringify({
      response: {
        header: { resultCode: "00" },
        body: {
          items: {
            item: items.map(([category, fcstTime, fcstValue]) => ({ category, fcstDate: date, fcstTime, fcstValue })),
          },
        },
      },
    }),
  );
}

const asFetch = (fn: (url: string) => Promise<Response>) => fn as unknown as typeof fetch;

describe("toKmaGrid", () => {
  test("Seoul City Hall maps to grid 60,127", () => {
    expect(toKmaGrid(126.978, 37.5665)).toEqual({ nx: 60, ny: 127 });
  });
});

describe("forecast base times", () => {
  test("ultra-short base waits for the HH:30 release to be available", () => {
    expect(ultraShortBase(at("2026-11-19T07:50:00"))).toEqual({ baseDate: "20261119", baseTime: "0730" });
    expect(ultraShortBase(at("2026-11-19T07:40:00"))).toEqual({ baseDate: "20261119", baseTime: "0630" });
    expect(ultraShortBase(at("2026-11-19T00:20:00"))).toEqual({ baseDate: "20261118", baseTime: "2330" });
  });

  test("short-term base uses the last 3-hour release", () => {
    expect(shortTermBase(at("2026-11-19T07:50:00"))).toEqual({ baseDate: "20261119", baseTime: "0500" });
    expect(shortTermBase(at("2026-11-19T01:00:00"))).toEqual({ baseDate: "20261118", baseTime: "2300" });
  });
});

test("formatAmount trims .0 and hides none values", () => {
  expect(formatAmount("2.0mm")).toBe("2mm");
  expect(formatAmount("1mm 미만")).toBe("1mm 미만");
  expect(formatAmount("강수없음")).toBeNull();
  expect(formatAmount("적설없음")).toBeNull();
});

describe("fetchWeather (AC9)", () => {
  const seoul = { lon: 126.978, lat: 37.5665 };

  test("uses the slot of the hour the departure falls in", async () => {
    const fetcher = asFetch(async () =>
      kmaResponse([
        ["PTY", "0800", "1"],
        ["RN1", "0800", "2.0mm"],
        ["T1H", "0800", "3"],
        ["PTY", "0900", "0"],
        ["RN1", "0900", "강수없음"],
        ["T1H", "0900", "5"],
      ]),
    );
    const w = await fetchWeather(seoul, at("2026-11-19T08:20:00"), at("2026-11-19T08:10:00"), fetcher);
    expect(w).toEqual({ precipitationType: "비", amount: "2mm", temperature: 3 });
  });

  test("snow uses the short-term snow depth", async () => {
    const fetcher = asFetch(async (url) =>
      url.includes("getUltraSrtFcst")
        ? kmaResponse([["PTY", "0800", "3"], ["RN1", "0800", "1.0mm"], ["T1H", "0800", "-2"]])
        : kmaResponse([["SNO", "0800", "1.0cm"]]),
    );
    const w = await fetchWeather(seoul, at("2026-11-19T08:00:00"), at("2026-11-19T07:50:00"), fetcher);
    expect(w).toEqual({ precipitationType: "눈", amount: "1cm", temperature: -2 });
  });

  test("an API error is thrown so the caller can mark weather unavailable", async () => {
    const fetcher = asFetch(async () => new Response(JSON.stringify({ response: { header: { resultCode: "30" } } })));
    await expect(
      fetchWeather(seoul, at("2026-11-19T08:00:00"), at("2026-11-19T07:50:00"), fetcher),
    ).rejects.toThrow();
  });
});

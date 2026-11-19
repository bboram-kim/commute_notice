import { describe, expect, test } from "vitest";

import { arrivalTimes, fetchStation, findRoute } from "./station";

const asFetch = (fn: () => Promise<Response>) => fn as unknown as typeof fetch;

const okResponse = (items: object[]) =>
  new Response(JSON.stringify({ msgHeader: { headerCd: "0" }, msgBody: { itemList: items } }));

const row = (rtNm: string, traTime1: string, arrmsg1: string, traTime2: string, arrmsg2: string) => ({
  stNm: "종로2가사거리",
  rtNm,
  gpsX: "126.9877522923",
  gpsY: "37.5698055407",
  traTime1,
  arrmsg1,
  traTime2,
  arrmsg2,
});

describe("fetchStation (AC3)", () => {
  test("returns the station name, location and routes", async () => {
    const station = await fetchStation(
      "01001",
      asFetch(async () => okResponse([row("470", "6", "곧 도착", "831", "13분후[3번째 전]")])),
    );
    expect(station?.stationName).toBe("종로2가사거리");
    expect(station?.location).toEqual({ lon: 126.9877522923, lat: 37.5698055407 });
    expect(findRoute(station!, "470")).toBeDefined();
    expect(findRoute(station!, "146")).toBeUndefined();
  });

  test("an unknown stop number returns null", async () => {
    const station = await fetchStation(
      "99999",
      asFetch(async () => new Response(JSON.stringify({ msgHeader: { headerCd: "4" }, msgBody: { itemList: null } }))),
    );
    expect(station).toBeNull();
  });

  test("an API failure throws", async () => {
    await expect(
      fetchStation("01001", asFetch(async () => new Response(JSON.stringify({ msgHeader: { headerCd: "7" } })))),
    ).rejects.toThrow();
  });
});

describe("arrivalTimes (AC10, AC11)", () => {
  const queriedAt = new Date("2026-11-19T07:50:00+09:00");
  const route = (t1: string, m1: string, t2: string, m2: string) => ({
    routeName: "146",
    next: [
      { seconds: Number(t1), message: m1 },
      { seconds: Number(t2), message: m2 },
    ],
  });

  test("adds traTime seconds to the query time", () => {
    const times = arrivalTimes(route("840", "14분후[3번째 전]", "1740", "29분후[9번째 전]"), queriedAt);
    expect(times.map((t) => t.toISOString())).toEqual(["2026-11-18T23:04:00.000Z", "2026-11-18T23:19:00.000Z"]);
  });

  test("ended or waiting service means no bus", () => {
    expect(arrivalTimes(route("0", "운행종료", "0", "운행종료"), queriedAt)).toEqual([]);
    expect(arrivalTimes(route("0", "출발대기", "0", "출발대기"), queriedAt)).toEqual([]);
  });

  test("keeps the first bus when only one is coming", () => {
    expect(arrivalTimes(route("300", "5분후[1번째 전]", "0", "운행종료"), queriedAt)).toHaveLength(1);
  });
});

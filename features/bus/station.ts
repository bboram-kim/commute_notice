export type RouteArrival = {
  routeName: string;
  /** Raw arrival rows for the next two buses: seconds until arrival and the status message. */
  next: Array<{ seconds: number; message: string }>;
};

export type Station = {
  arsId: string;
  stationName: string;
  location: { lon: number; lat: number };
  routes: RouteArrival[];
};

const ENDPOINT = "http://ws.bus.go.kr/api/rest/stationinfo/getStationByUid";

type Item = Record<string, string>;

/**
 * Seoul bus station info by arsId (5-digit stop number).
 * Returns null when the stop number does not exist. Throws on API failure.
 */
export async function fetchStation(arsId: string, fetcher: typeof fetch = fetch): Promise<Station | null> {
  const key = encodeURIComponent(process.env.DATA_GO_KR_SERVICE_KEY ?? "");
  const res = await fetcher(`${ENDPOINT}?serviceKey=${key}&arsId=${encodeURIComponent(arsId)}&resultType=json`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Seoul bus HTTP ${res.status}`);
  const json = await res.json();
  const code = String(json?.msgHeader?.headerCd ?? "");
  if (code === "4") return null; // 결과가 없습니다
  if (code !== "0") throw new Error(`Seoul bus result ${code}: ${json?.msgHeader?.headerMsg}`);

  const raw = json.msgBody?.itemList;
  const items: Item[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
  if (items.length === 0) return null;

  return {
    arsId,
    stationName: items[0].stNm,
    location: { lon: Number(items[0].gpsX), lat: Number(items[0].gpsY) },
    routes: items.map((it) => ({
      routeName: it.rtNm,
      next: [
        { seconds: Number(it.traTime1), message: it.arrmsg1 ?? "" },
        { seconds: Number(it.traTime2), message: it.arrmsg2 ?? "" },
      ],
    })),
  };
}

export function findRoute(station: Station, routeName: string): RouteArrival | undefined {
  const wanted = routeName.trim();
  return station.routes.find((r) => r.routeName === wanted);
}

/**
 * Arrival instants for the next (up to two) buses. traTime is seconds (verified against arrmsg,
 * e.g. traTime 444 with "7분후"). Rows like "운행종료" or "출발대기" carry 0 and mean no bus.
 */
export function arrivalTimes(route: RouteArrival, queriedAt: Date): Date[] {
  const times: Date[] = [];
  for (const row of route.next) {
    const soon = row.message.includes("곧 도착");
    if (!soon && !(row.seconds > 0)) break;
    times.push(new Date(queriedAt.getTime() + Math.max(row.seconds, 0) * 1000));
  }
  return times;
}

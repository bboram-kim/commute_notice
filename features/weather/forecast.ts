import { kstParts } from "@/lib/kst";

import { toKmaGrid } from "./grid";

export type PrecipitationType = "없음" | "비" | "비/눈" | "눈" | "소나기";

export type Weather = {
  precipitationType: PrecipitationType;
  /** Rain amount (e.g. "2mm") or snow depth (e.g. "1cm"); null when none. */
  amount: string | null;
  temperature: number;
};

type ForecastItem = { category: string; fcstDate: string; fcstTime: string; fcstValue: string };
type Base = { baseDate: string; baseTime: string };
type Slot = { date: string; time: string };

const BASE_URL = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0";

// Ultra-short PTY: 0 none, 1 rain, 2 rain/snow, 3 snow, 5 drizzle, 6 drizzle/snow flurry, 7 snow flurry.
// Short-term PTY adds 4 shower.
const PTY: Record<string, PrecipitationType> = {
  "0": "없음",
  "1": "비",
  "2": "비/눈",
  "3": "눈",
  "4": "소나기",
  "5": "비",
  "6": "비/눈",
  "7": "눈",
};

const ymd = (date: string) => date.replaceAll("-", "");
const pad = (n: number) => String(n).padStart(2, "0");

/** Latest ultra-short forecast base: issued at HH:30, available about 15 minutes later. */
export function ultraShortBase(now: Date): Base {
  const p = kstParts(new Date(now.getTime() - 45 * 60 * 1000));
  return { baseDate: ymd(p.date), baseTime: `${pad(p.hour)}30` };
}

/** Latest short-term forecast base: 02, 05, ..., 23 o'clock, available 10 minutes later. */
export function shortTermBase(now: Date): Base {
  const p = kstParts(new Date(now.getTime() - 10 * 60 * 1000));
  const h = [23, 20, 17, 14, 11, 8, 5, 2].find((x) => x <= p.hour);
  if (h !== undefined) return { baseDate: ymd(p.date), baseTime: `${pad(h)}00` };
  const prev = kstParts(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  return { baseDate: ymd(prev.date), baseTime: "2300" };
}

/** "2.0mm" -> "2mm"; "강수없음" / "적설없음" -> null. */
export function formatAmount(raw: string | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim();
  if (v === "" || v.includes("없음") || v === "0") return null;
  return v.replace(/(\d+)\.0(?!\d)/g, "$1");
}

/** The slot for the hour the departure falls in, else the closest earlier slot, else the first. */
function slotFor(items: ForecastItem[], departure: Date): Slot | null {
  if (items.length === 0) return null;
  const p = kstParts(departure);
  const target = `${ymd(p.date)}${pad(p.hour)}00`;
  const keys = [...new Set(items.map((i) => `${i.fcstDate}${i.fcstTime}`))].sort();
  const key = keys.filter((k) => k <= target).at(-1) ?? keys[0];
  return { date: key.slice(0, 8), time: key.slice(8) };
}

function valueAt(items: ForecastItem[], slot: Slot, category: string) {
  return items.find((i) => i.category === category && i.fcstDate === slot.date && i.fcstTime === slot.time)
    ?.fcstValue;
}

async function fetchItems(
  op: string,
  base: Base,
  grid: { nx: number; ny: number },
  fetcher: typeof fetch,
): Promise<ForecastItem[]> {
  const key = encodeURIComponent(process.env.DATA_GO_KR_SERVICE_KEY ?? "");
  const url =
    `${BASE_URL}/${op}?serviceKey=${key}&numOfRows=1000&pageNo=1&dataType=JSON` +
    `&base_date=${base.baseDate}&base_time=${base.baseTime}&nx=${grid.nx}&ny=${grid.ny}`;
  const res = await fetcher(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`KMA ${op} HTTP ${res.status}`);
  const json = await res.json();
  const code = json?.response?.header?.resultCode;
  if (code !== "00") throw new Error(`KMA ${op} result ${code}`);
  return json.response.body?.items?.item ?? [];
}

/** Weather at the station location for the hour of the departure. Throws on failure. */
export async function fetchWeather(
  location: { lon: number; lat: number },
  departure: Date,
  now: Date,
  fetcher: typeof fetch = fetch,
): Promise<Weather> {
  const grid = toKmaGrid(location.lon, location.lat);
  const items = await fetchItems("getUltraSrtFcst", ultraShortBase(now), grid, fetcher);
  const slot = slotFor(items, departure);
  if (!slot) throw new Error("KMA ultra-short forecast has no items");

  const precipitationType = PTY[valueAt(items, slot, "PTY") ?? "0"] ?? "없음";
  const temperature = Number(valueAt(items, slot, "T1H"));
  if (Number.isNaN(temperature)) throw new Error("KMA ultra-short forecast has no T1H");
  let amount = precipitationType === "없음" ? null : formatAmount(valueAt(items, slot, "RN1"));

  // Ultra-short forecasts carry no snow depth; use the short-term SNO when it snows.
  if (precipitationType === "눈") {
    try {
      const st = await fetchItems("getVilageFcst", shortTermBase(now), grid, fetcher);
      const stSlot = slotFor(st, departure);
      const sno = stSlot ? formatAmount(valueAt(st, stSlot, "SNO")) : null;
      if (sno) amount = sno;
    } catch {
      // keep the rain-equivalent amount
    }
  }

  return { precipitationType, amount, temperature };
}

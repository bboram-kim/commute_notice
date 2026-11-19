import { arrivalTimes, fetchStation, findRoute } from "@/features/bus";
import { KIND_LABEL, type CommuteSetting } from "@/features/commute";
import { fetchWeather, type Weather } from "@/features/weather";
import { floorToMinute, kstHHMM, kstIso } from "@/lib/kst";

export const UNAVAILABLE = "정보를 가져오지 못했습니다";
export const NO_BUS = "도착 예정 버스 없음";

/** Weather and bus snapshot for one departure. null means that lookup failed. */
export type Briefing = {
  setting: CommuteSetting;
  departure: Date;
  queriedAt: Date;
  weather: Weather | null;
  buses: Date[] | null;
};

export type BriefingDeps = {
  fetchWeather: typeof fetchWeather;
  fetchStation: typeof fetchStation;
};

const defaultDeps: BriefingDeps = { fetchWeather, fetchStation };

export async function buildBriefing(
  setting: CommuteSetting,
  departure: Date,
  now: Date,
  deps: BriefingDeps = defaultDeps,
): Promise<Briefing> {
  const [weather, buses] = await Promise.all([
    deps.fetchWeather(setting.location, departure, now).catch((e) => {
      console.error("weather lookup failed", e);
      return null;
    }),
    deps
      .fetchStation(setting.arsId)
      .then((station) => {
        const route = station && findRoute(station, setting.routeName);
        if (!route) throw new Error(`route ${setting.routeName} not found at ${setting.arsId}`);
        return arrivalTimes(route, now);
      })
      .catch((e) => {
        console.error("bus lookup failed", e);
        return null;
      }),
  ]);
  return { setting, departure, queriedAt: now, weather, buses };
}

function weatherText(w: Weather): string {
  const precip = w.precipitationType === "없음" ? "강수 없음" : [w.precipitationType, w.amount].filter(Boolean).join(" ");
  return `${precip} · ${w.temperature}°C`;
}

function offsetText(minutes: number): string {
  if (minutes === 0) return "출발 시각";
  return minutes > 0 ? `출발 ${minutes}분 뒤` : `출발 ${-minutes}분 전`;
}

export function formatNotification(b: Briefing): { title: string; body: string } {
  const { setting, departure } = b;
  const line1 = `${setting.departureTime} 출발 · ${b.weather ? weatherText(b.weather) : `날씨 ${UNAVAILABLE}`}`;

  let line2: string;
  if (b.buses === null) line2 = `${setting.routeName}번 버스 ${UNAVAILABLE}`;
  else if (b.buses.length === 0) line2 = `${setting.routeName}번 ${NO_BUS}`;
  else {
    const first = floorToMinute(b.buses[0]);
    const offset = Math.round((first.getTime() - departure.getTime()) / 60000);
    line2 = `${setting.routeName}번 ${kstHHMM(first)} 도착 (${offsetText(offset)})`;
    if (b.buses[1]) line2 += ` · 다음 ${kstHHMM(floorToMinute(b.buses[1]))}`;
  }

  return { title: `${KIND_LABEL[setting.kind]} 알림`, body: `${line1}\n${line2}` };
}

export function toWidgetJson(b: Briefing) {
  return {
    kind: b.setting.kind,
    label: KIND_LABEL[b.setting.kind],
    departureTime: b.setting.departureTime,
    stationName: b.setting.stationName,
    routeName: b.setting.routeName,
    weather: b.weather,
    weatherError: b.weather ? null : UNAVAILABLE,
    buses: b.buses?.map(kstIso) ?? [],
    busError: b.buses ? null : UNAVAILABLE,
    queriedAt: kstIso(b.queriedAt),
  };
}

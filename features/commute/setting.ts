export type CommuteKind = "morning" | "evening";

export const COMMUTE_KINDS: CommuteKind[] = ["morning", "evening"];

export const KIND_LABEL: Record<CommuteKind, string> = { morning: "출근", evening: "퇴근" };

export const DEFAULT_LEAD_MINUTES = 10;

export type CommuteSetting = {
  kind: CommuteKind;
  departureTime: string; // HH:MM, KST
  arsId: string;
  routeName: string;
  stationName: string;
  location: { lon: number; lat: number };
  leadMinutes: number;
};

export type CommuteInput = Pick<CommuteSetting, "kind" | "departureTime" | "arsId" | "routeName" | "leadMinutes">;

export type ParseResult = { ok: true; value: CommuteInput } | { ok: false; error: string };

/** Validates the raw settings form before any external lookup. */
export function parseCommuteForm(form: FormData): ParseResult {
  const kind = String(form.get("kind") ?? "");
  if (kind !== "morning" && kind !== "evening") return { ok: false, error: "출근 또는 퇴근을 선택하세요." };

  const departureTime = String(form.get("departureTime") ?? "").trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(departureTime)) {
    return { ok: false, error: "출발 시각을 시:분 형식으로 입력하세요." };
  }

  const arsId = String(form.get("arsId") ?? "").trim();
  if (!/^\d{5}$/.test(arsId)) return { ok: false, error: "정류소 번호는 5자리 숫자입니다." };

  const routeName = String(form.get("routeName") ?? "").trim();
  if (!routeName) return { ok: false, error: "노선 번호를 입력하세요." };

  const leadRaw = String(form.get("leadMinutes") ?? "").trim();
  const leadMinutes = leadRaw === "" ? DEFAULT_LEAD_MINUTES : Number(leadRaw);
  if (!Number.isInteger(leadMinutes) || leadMinutes < 1 || leadMinutes > 120) {
    return { ok: false, error: "알림 시점은 1–120분 사이로 입력하세요." };
  }

  return { ok: true, value: { kind, departureTime, arsId, routeName, leadMinutes } };
}

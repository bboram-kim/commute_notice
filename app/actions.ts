"use server";

import { headers } from "next/headers";

import { fetchStation, findRoute } from "@/features/bus";
import { KIND_LABEL, parseCommuteForm } from "@/features/commute";
import { saveCommuteSetting } from "@/features/commute/server";
import { deleteSubscription, saveSubscription, sendToAll, type StoredSubscription } from "@/features/push/server";
import { isValidKey } from "@/lib/access";

export type SaveState =
  | { status: "idle" }
  | { status: "saved"; stationName: string; message: string; values: FormValues }
  | { status: "error"; message: string; values?: FormValues };

/** Submitted values, echoed back so the form keeps them after React resets it. */
export type FormValues = Partial<Record<"departureTime" | "arsId" | "routeName" | "leadMinutes", string>>;

const UNAUTHORIZED = "접근 키가 올바르지 않습니다.";

export async function saveCommute(_prev: SaveState, form: FormData): Promise<SaveState> {
  if (!isValidKey(form.get("key"))) return { status: "error", message: UNAUTHORIZED };

  const values: FormValues = Object.fromEntries(
    (["departureTime", "arsId", "routeName", "leadMinutes"] as const).map((k) => [k, String(form.get(k) ?? "")]),
  );
  const parsed = parseCommuteForm(form);
  if (!parsed.ok) return { status: "error", message: parsed.error, values };
  const input = parsed.value;

  let station;
  try {
    station = await fetchStation(input.arsId);
  } catch (e) {
    console.error("station lookup failed", e);
    return { status: "error", message: "버스 정보를 확인하지 못했습니다. 잠시 후 다시 저장하세요.", values };
  }
  if (!station) return { status: "error", message: `정류소 번호 ${input.arsId}를 찾을 수 없습니다.`, values };
  if (!findRoute(station, input.routeName)) {
    return {
      status: "error",
      message: `${station.stationName}(${input.arsId}) 정류소에는 ${input.routeName}번 노선이 없습니다.`,
      values,
    };
  }

  await saveCommuteSetting({ ...input, stationName: station.stationName, location: station.location });
  return {
    status: "saved",
    stationName: station.stationName,
    values,
    message: `${KIND_LABEL[input.kind]} 설정을 저장했습니다. ${station.stationName} 정류소의 ${input.routeName}번입니다.`,
  };
}

export async function subscribePush(key: string, sub: StoredSubscription): Promise<void> {
  if (!isValidKey(key)) throw new Error(UNAUTHORIZED);
  await saveSubscription(sub, (await headers()).get("user-agent"));
}

export async function unsubscribePush(key: string, endpoint: string): Promise<void> {
  if (!isValidKey(key)) throw new Error(UNAUTHORIZED);
  await deleteSubscription(endpoint);
}

export async function sendTestPush(key: string): Promise<{ success: number; total: number }> {
  if (!isValidKey(key)) throw new Error(UNAUTHORIZED);
  return sendToAll({ title: "테스트 알림", body: "출퇴근 알림이 이 기기에 잘 도착합니다." });
}

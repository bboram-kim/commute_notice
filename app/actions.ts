"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createAccount, regenerateWidgetToken } from "@/features/accounts/server";
import { parseSignupForm } from "@/features/accounts/signup";
import { fetchStation, findRoute } from "@/features/bus";
import { KIND_LABEL, parseCommuteForm } from "@/features/commute";
import { saveCommuteSetting } from "@/features/commute/server";
import { deleteSubscription, saveSubscription, sendToUser, type StoredSubscription } from "@/features/push/server";
import { currentUser, sessionClient } from "@/lib/auth";

export type AuthState = { error?: string; email?: string };

export type SaveState =
  | { status: "idle" }
  | { status: "saved"; stationName: string; message: string; values: FormValues }
  | { status: "error"; message: string; values?: FormValues };

/** Submitted values, echoed back so the form keeps them after React resets it. */
export type FormValues = Partial<Record<"departureTime" | "arsId" | "routeName" | "leadMinutes", string>>;

const LOGIN_REQUIRED = "로그인이 필요합니다. 페이지를 새로고침해 다시 로그인하세요.";

async function requireUserId(): Promise<string> {
  const user = await currentUser();
  if (!user) throw new Error(LOGIN_REQUIRED);
  return user.id;
}

async function signIn(email: string, password: string): Promise<string | null> {
  const { error } = await (await sessionClient()).auth.signInWithPassword({ email, password });
  return error ? "이메일 또는 비밀번호가 올바르지 않습니다." : null;
}

export async function signUp(_prev: AuthState, form: FormData): Promise<AuthState> {
  const parsed = parseSignupForm(form, process.env.SIGNUP_INVITE_CODE);
  const email = String(form.get("email") ?? "");
  if (!parsed.ok) return { error: parsed.error, email };

  const created = await createAccount(parsed.value.email, parsed.value.password);
  if (!created.ok) {
    return {
      error:
        created.reason === "exists"
          ? "이미 가입한 이메일입니다. 로그인해 주세요."
          : "가입하지 못했습니다. 잠시 후 다시 시도하세요.",
      email,
    };
  }
  const error = await signIn(parsed.value.email, parsed.value.password);
  if (error) return { error, email };
  redirect("/");
}

export async function logIn(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const error = await signIn(email, String(form.get("password") ?? ""));
  if (error) return { error, email };
  redirect("/");
}

export async function logOut(): Promise<void> {
  await (await sessionClient()).auth.signOut();
  redirect("/");
}

export async function saveCommute(_prev: SaveState, form: FormData): Promise<SaveState> {
  const user = await currentUser();
  if (!user) return { status: "error", message: LOGIN_REQUIRED };

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

  await saveCommuteSetting(user.id, { ...input, stationName: station.stationName, location: station.location });
  return {
    status: "saved",
    stationName: station.stationName,
    values,
    message: `${KIND_LABEL[input.kind]} 설정을 저장했습니다. ${station.stationName} 정류소의 ${input.routeName}번입니다.`,
  };
}

export async function subscribePush(sub: StoredSubscription): Promise<void> {
  await saveSubscription(await requireUserId(), sub, (await headers()).get("user-agent"));
}

export async function unsubscribePush(endpoint: string): Promise<void> {
  await deleteSubscription(await requireUserId(), endpoint);
}

export async function sendTestPush(): Promise<{ success: number; total: number }> {
  return sendToUser(await requireUserId(), { title: "테스트 알림", body: "출퇴근 알림이 이 기기에 잘 도착합니다." });
}

export async function reissueWidgetToken(): Promise<string> {
  return regenerateWidgetToken(await requireUserId());
}

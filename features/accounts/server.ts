import "server-only";
import { randomBytes } from "node:crypto";

import { supabase } from "@/lib/supabase";

export type CreateAccountResult = { ok: true } | { ok: false; reason: "exists" | "failed" };

/**
 * Creates the account with admin rights. Supabase's public sign-up is switched off, so this
 * server action (which checks the invite code first) is the only way in.
 */
export async function createAccount(email: string, password: string): Promise<CreateAccountResult> {
  const { data, error } = await supabase().auth.admin.createUser({ email, password, email_confirm: true });
  if (error) {
    const exists = error.code === "email_exists" || /already|registered/i.test(error.message);
    if (!exists) console.error("createUser failed", error);
    return { ok: false, reason: exists ? "exists" : "failed" };
  }
  await widgetTokenFor(data.user.id);
  return { ok: true };
}

const newToken = () => randomBytes(24).toString("hex");

/** The user's widget token, created on first use. */
export async function widgetTokenFor(userId: string): Promise<string> {
  const { data, error } = await supabase().from("widget_tokens").select("token").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (data) return data.token as string;
  return regenerateWidgetToken(userId);
}

/** Replaces the token; the previous widget address stops working immediately (AC13). */
export async function regenerateWidgetToken(userId: string): Promise<string> {
  const token = newToken();
  const { error } = await supabase()
    .from("widget_tokens")
    .upsert({ user_id: userId, token, created_at: new Date().toISOString() });
  if (error) throw error;
  return token;
}

export async function userIdForToken(token: string): Promise<string | null> {
  const { data, error } = await supabase().from("widget_tokens").select("user_id").eq("token", token).maybeSingle();
  if (error) throw error;
  return (data?.user_id as string | undefined) ?? null;
}

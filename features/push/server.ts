import "server-only";
import * as webpush from "web-push";

import { supabase } from "@/lib/supabase";

export type PushPayload = { title: string; body: string };

export type StoredSubscription = { endpoint: string; keys: { p256dh: string; auth: string } };

let configured = false;
function configure() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:commute-notice@example.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
}

/** Stores the device for this user. A device that signs in as someone else moves to that user. */
export async function saveSubscription(
  userId: string,
  sub: StoredSubscription,
  userAgent: string | null,
): Promise<void> {
  const { error } = await supabase().from("push_subscriptions").upsert({
    endpoint: sub.endpoint,
    user_id: userId,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    user_agent: userAgent,
  });
  if (error) throw error;
}

export async function deleteSubscription(userId: string, endpoint: string): Promise<void> {
  const { error } = await supabase().from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", userId);
  if (error) throw error;
}

/** Sends to every device of one user; drops subscriptions the push service reports as gone. */
export async function sendToUser(userId: string, payload: PushPayload): Promise<{ success: number; total: number }> {
  configure();
  const { data, error } = await supabase()
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (error) throw error;
  const subs = data as Array<{ endpoint: string; p256dh: string; auth: string }>;

  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), {
        TTL: 60 * 30,
        urgency: "high",
      }),
    ),
  );

  await Promise.all(
    results.map((r, i) => {
      const status = r.status === "rejected" ? (r.reason as { statusCode?: number })?.statusCode : undefined;
      return status === 404 || status === 410 ? deleteSubscription(userId, subs[i].endpoint) : undefined;
    }),
  );

  return { success: results.filter((r) => r.status === "fulfilled").length, total: subs.length };
}

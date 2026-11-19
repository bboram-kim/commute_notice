import { dispatchNow } from "@/features/dispatch/server";

// Woken every minute by Supabase pg_cron + pg_net (see supabase/cron-dispatch.sql).
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const sent = await dispatchNow();
  return Response.json({ sent });
}

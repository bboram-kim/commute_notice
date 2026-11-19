import "server-only";

import { buildBriefing } from "@/features/briefing";
import { listCommuteSettings } from "@/features/commute/server";
import { sendToAll } from "@/features/push/server";
import { supabase } from "@/lib/supabase";

import { runDispatch, type DispatchDeps } from "./dispatch";

const deps: DispatchDeps = {
  listSettings: listCommuteSettings,
  async claim(kind, due) {
    // The unique (kind, service_date) constraint makes a second send on the same day a no-op.
    const { data, error } = await supabase()
      .from("dispatch_log")
      .upsert(
        { kind, service_date: due.serviceDate, scheduled_for: due.scheduledFor.toISOString() },
        { onConflict: "kind,service_date", ignoreDuplicates: true },
      )
      .select("id");
    if (error) throw error;
    return data?.[0]?.id ?? null;
  },
  async record(logId, { success, total }) {
    const { error } = await supabase()
      .from("dispatch_log")
      .update({ sent_at: new Date().toISOString(), success_count: success, total_count: total })
      .eq("id", logId);
    if (error) throw error;
  },
  buildBriefing,
  send: sendToAll,
};

export function dispatchNow(now = new Date()) {
  return runDispatch(now, deps);
}

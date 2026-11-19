import { buildBriefing, formatNotification } from "@/features/briefing";
import type { CommuteKind, CommuteSetting } from "@/features/commute";
import { floorToMinute, kstHHMM, kstParts } from "@/lib/kst";

export type Due = { departure: Date; serviceDate: string; scheduledFor: Date };

/**
 * A commute is due when "now + lead minutes" lands on its departure time on a weekday (Mon–Fri, KST).
 * Looking forward from now handles lead times that cross midnight.
 */
export function dueDeparture(setting: CommuteSetting, now: Date): Due | null {
  const scheduledFor = floorToMinute(now);
  const departure = new Date(scheduledFor.getTime() + setting.leadMinutes * 60000);
  const p = kstParts(departure);
  if (p.weekday === 0 || p.weekday === 6) return null;
  if (kstHHMM(departure) !== setting.departureTime) return null;
  return { departure, serviceDate: p.date, scheduledFor };
}

export type DispatchDeps = {
  listSettings: () => Promise<CommuteSetting[]>;
  /** Reserves today's send for a commute; returns a log id, or null when it was already sent. */
  claim: (kind: CommuteKind, due: Due) => Promise<number | null>;
  record: (logId: number, result: { success: number; total: number }) => Promise<void>;
  buildBriefing: typeof buildBriefing;
  send: (payload: { title: string; body: string }) => Promise<{ success: number; total: number }>;
};

export type DispatchResult = { kind: CommuteKind; success: number; total: number };

export async function runDispatch(now: Date, deps: DispatchDeps): Promise<DispatchResult[]> {
  const settings = await deps.listSettings();
  const results: DispatchResult[] = [];
  for (const setting of settings) {
    const due = dueDeparture(setting, now);
    if (!due) continue;
    const logId = await deps.claim(setting.kind, due);
    if (logId === null) continue;
    const briefing = await deps.buildBriefing(setting, due.departure, now);
    const sent = await deps.send(formatNotification(briefing));
    await deps.record(logId, sent);
    results.push({ kind: setting.kind, ...sent });
  }
  return results;
}

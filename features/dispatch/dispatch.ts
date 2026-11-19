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
  listSettings: () => Promise<Array<{ userId: string; setting: CommuteSetting }>>;
  /** Reserves today's send for a user's commute; returns a log id, or null when it was already sent. */
  claim: (userId: string, kind: CommuteKind, due: Due) => Promise<number | null>;
  record: (logId: number, result: { success: number; total: number }) => Promise<void>;
  buildBriefing: typeof buildBriefing;
  send: (userId: string, payload: { title: string; body: string }) => Promise<{ success: number; total: number }>;
};

export type DispatchResult = { userId: string; kind: CommuteKind; success: number; total: number };

export async function runDispatch(now: Date, deps: DispatchDeps): Promise<DispatchResult[]> {
  const all = await deps.listSettings();
  const results: DispatchResult[] = [];
  for (const { userId, setting } of all) {
    const due = dueDeparture(setting, now);
    if (!due) continue;
    // One user's failure must not stop the others (AC10).
    try {
      const logId = await deps.claim(userId, setting.kind, due);
      if (logId === null) continue;
      const briefing = await deps.buildBriefing(setting, due.departure, now);
      const sent = await deps.send(userId, formatNotification(briefing));
      await deps.record(logId, sent);
      results.push({ userId, kind: setting.kind, ...sent });
    } catch (e) {
      console.error(`dispatch failed for ${userId}/${setting.kind}`, e);
    }
  }
  return results;
}

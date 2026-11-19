// Post-release check: were weekday morning/evening notices sent within 1 minute of schedule?
// Usage: bun docs/specs/commute-departure-notice/check-send-timeliness.ts [--from YYYY-MM-DD] [--days 14]
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY from the environment (bun loads .env.local).
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const arg = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const days = Number(arg("days") ?? 14);
const todayKst = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const from = arg("from") ?? new Date(Date.parse(`${todayKst}T00:00:00Z`) - (days - 1) * 86400e3).toISOString().slice(0, 10);

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false },
});

const { data: settings, error: e1 } = await db.from("commute_settings").select("kind, departure_time, lead_minutes");
if (e1) throw e1;
const { data: logs, error: e2 } = await db
  .from("dispatch_log")
  .select("kind, service_date, scheduled_for, sent_at")
  .gte("service_date", from);
if (e2) throw e2;

const problems: string[] = [];
let expected = 0;
for (let i = 0; i < days; i++) {
  const date = new Date(Date.parse(`${from}T00:00:00Z`) + i * 86400e3);
  const ymd = date.toISOString().slice(0, 10);
  if (ymd > todayKst) break;
  const weekday = date.getUTCDay();
  if (weekday === 0 || weekday === 6) continue;
  for (const s of settings ?? []) {
    const due = Date.parse(`${ymd}T${s.departure_time.slice(0, 5)}:00+09:00`) - s.lead_minutes * 60e3;
    if (due > Date.now()) continue;
    expected++;
    const log = logs?.find((l) => l.kind === s.kind && l.service_date === ymd);
    if (!log?.sent_at) problems.push(`${ymd} ${s.kind}: missing`);
    else if (Date.parse(log.sent_at) - due > 60e3) {
      problems.push(`${ymd} ${s.kind}: late by ${Math.round((Date.parse(log.sent_at) - due) / 1000)}s`);
    }
  }
}

console.log(`from ${from}, ${days} days: ${expected - problems.length}/${expected} on time`);
for (const p of problems) console.log(`  ${p}`);
console.log(problems.length === 0 ? "PASS" : "FAIL");
process.exit(problems.length === 0 ? 0 : 1);

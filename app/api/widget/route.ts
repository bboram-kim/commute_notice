import { userIdForToken } from "@/features/accounts/server";
import { buildBriefing, toWidgetJson } from "@/features/briefing";
import { listCommuteSettings } from "@/features/commute/server";
import { kstDateAt, kstParts } from "@/lib/kst";

// JSON for the Scriptable widget, scoped to the token's owner:
// morning commute before noon, evening commute after.
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const userId = token ? await userIdForToken(token) : null;
  if (!userId) return Response.json({ error: "unauthorized" }, { status: 401 });

  const now = new Date();
  const today = kstParts(now);
  const kind = today.hour < 12 ? "morning" : "evening";
  const setting = (await listCommuteSettings(userId)).find((s) => s.kind === kind);
  if (!setting) return Response.json({ error: "not_configured", kind }, { status: 404 });

  const briefing = await buildBriefing(setting, kstDateAt(today.date, setting.departureTime), now);
  return Response.json(toWidgetJson(briefing), { headers: { "Cache-Control": "no-store" } });
}

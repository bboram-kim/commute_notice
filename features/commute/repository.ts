import { supabase } from "@/lib/supabase";

import type { CommuteKind, CommuteSetting } from "./setting";

type Row = {
  user_id: string;
  kind: CommuteKind;
  departure_time: string;
  ars_id: string;
  route_name: string;
  station_name: string;
  lon: number;
  lat: number;
  lead_minutes: number;
};

export type UserSetting = { userId: string; setting: CommuteSetting };

const toSetting = (r: Row): CommuteSetting => ({
  kind: r.kind,
  departureTime: r.departure_time.slice(0, 5),
  arsId: r.ars_id,
  routeName: r.route_name,
  stationName: r.station_name,
  location: { lon: r.lon, lat: r.lat },
  leadMinutes: r.lead_minutes,
});

/** One user's settings. Every read is scoped by a user id taken from the verified session or token. */
export async function listCommuteSettings(userId: string): Promise<CommuteSetting[]> {
  const { data, error } = await supabase().from("commute_settings").select("*").eq("user_id", userId);
  if (error) throw error;
  return (data as Row[]).map(toSetting);
}

/** Every user's settings, for the scheduled dispatch only. */
export async function listAllCommuteSettings(): Promise<UserSetting[]> {
  const { data, error } = await supabase().from("commute_settings").select("*");
  if (error) throw error;
  return (data as Row[]).map((r) => ({ userId: r.user_id, setting: toSetting(r) }));
}

export async function saveCommuteSetting(userId: string, s: CommuteSetting): Promise<void> {
  const row: Row & { updated_at: string } = {
    user_id: userId,
    kind: s.kind,
    departure_time: s.departureTime,
    ars_id: s.arsId,
    route_name: s.routeName,
    station_name: s.stationName,
    lon: s.location.lon,
    lat: s.location.lat,
    lead_minutes: s.leadMinutes,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase().from("commute_settings").upsert(row, { onConflict: "user_id,kind" });
  if (error) throw error;
}

import { supabase } from "@/lib/supabase";

import type { CommuteKind, CommuteSetting } from "./setting";

type Row = {
  kind: CommuteKind;
  departure_time: string;
  ars_id: string;
  route_name: string;
  station_name: string;
  lon: number;
  lat: number;
  lead_minutes: number;
};

const toSetting = (r: Row): CommuteSetting => ({
  kind: r.kind,
  departureTime: r.departure_time.slice(0, 5),
  arsId: r.ars_id,
  routeName: r.route_name,
  stationName: r.station_name,
  location: { lon: r.lon, lat: r.lat },
  leadMinutes: r.lead_minutes,
});

export async function listCommuteSettings(): Promise<CommuteSetting[]> {
  const { data, error } = await supabase().from("commute_settings").select("*");
  if (error) throw error;
  return (data as Row[]).map(toSetting);
}

export async function saveCommuteSetting(s: CommuteSetting): Promise<void> {
  const row: Row & { updated_at: string } = {
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
  const { error } = await supabase().from("commute_settings").upsert(row);
  if (error) throw error;
}

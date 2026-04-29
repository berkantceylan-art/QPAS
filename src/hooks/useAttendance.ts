import { useCallback, useEffect, useState } from "react";
import {
  supabase,
  type AttendanceRecord,
  type AttendanceMethod,
  type AttendanceType,
} from "@/lib/supabase";

// ─── Attendance Log Hook ──────────────────────────────────
export function useAttendanceLog(userId: string | undefined, limit = 10) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    setRecords((data as AttendanceRecord[]) ?? []);
    setLoading(false);
  }, [userId, limit]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { records, loading, refetch: fetch };
}

// ─── Last Check Status ────────────────────────────────────
export function useLastCheckStatus(userId: string | undefined) {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("attendance")
      .select("type")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setIsCheckedIn(data?.type === "in");
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { isCheckedIn, setIsCheckedIn, loading, refetch: fetch };
}

// ─── Check In/Out Mutation ────────────────────────────────
type CheckInParams = {
  userId: string;
  type: AttendanceType;
  method?: AttendanceMethod;
  latitude?: number;
  longitude?: number;
  locationLabel?: string;
  actorName: string;
};

export async function performCheckIn(params: CheckInParams) {
  const { userId, type, method = "geo", latitude, longitude, locationLabel, actorName } = params;

  const { data, error } = await supabase
    .from("attendance")
    .insert({
      user_id: userId,
      type,
      method,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      location_label: locationLabel ?? null,
    })
    .select()
    .single();

  if (error) throw error;

  // Log activity
  await supabase.from("activity_log").insert({
    actor_id: userId,
    actor_name: actorName,
    action: type === "in" ? "PDKS girişi yaptı" : "PDKS çıkışı yaptı",
    category: "pdks",
  });

  return data as AttendanceRecord;
}

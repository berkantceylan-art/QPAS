import { useCallback, useEffect, useState } from "react";
import { supabase, type ActivityRecord } from "@/lib/supabase";

// ─── Helpers ──────────────────────────────────────────────
function startOfDay() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfWeek() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + 1); // Monday
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ─── Shared Types ─────────────────────────────────────────
type DayTrend = { day: string; check_ins: number; check_outs: number };

// ─── Admin Stats ──────────────────────────────────────────
export type AdminStats = {
  totalUsers: number;
  todayAttendance: number;
  openRequests: number;
  weeklyTotal: number;
  weeklyDelta: string;
  activities: ActivityRecord[];
  weeklyTrend: DayTrend[];
};

export function useAdminStats() {
  const [data, setData] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, attendanceRes, requestsRes, activityRes, weeklyRes] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("*", { count: "exact", head: true }),
          supabase
            .from("attendance")
            .select("*", { count: "exact", head: true })
            .eq("type", "in")
            .gte("created_at", startOfDay()),
          supabase
            .from("requests")
            .select("*", { count: "exact", head: true })
            .eq("status", "pending"),
          supabase
            .from("activity_log")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("attendance")
            .select("created_at, type")
            .gte("created_at", startOfWeek()),
        ]);

      // Aggregate weekly trend by day
      const trendMap = new Map<string, { check_ins: number; check_outs: number }>();
      for (const row of weeklyRes.data ?? []) {
        const day = new Date(row.created_at).toLocaleDateString("tr-TR", {
          weekday: "short",
        });
        const entry = trendMap.get(day) ?? { check_ins: 0, check_outs: 0 };
        if (row.type === "in") entry.check_ins++;
        else entry.check_outs++;
        trendMap.set(day, entry);
      }
      const weeklyTrend: DayTrend[] = Array.from(trendMap.entries()).map(
        ([day, v]) => ({ day, ...v }),
      );

      const weeklyTotal = (weeklyRes.data ?? []).filter(
        (r) => r.type === "in",
      ).length;

      setData({
        totalUsers: usersRes.count ?? 0,
        todayAttendance: attendanceRes.count ?? 0,
        openRequests: requestsRes.count ?? 0,
        weeklyTotal,
        weeklyDelta: "+0%",
        activities: (activityRes.data as ActivityRecord[]) ?? [],
        weeklyTrend,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Veri yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// ─── Client Stats ─────────────────────────────────────────
export type ClientStats = {
  activeEmployees: number;
  monthlyAttendance: number;
  openRequests: number;
  activities: ActivityRecord[];
  weeklyTrend: DayTrend[];
};

export function useClientStats() {
  const [data, setData] = useState<ClientStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [employeesRes, monthlyRes, requestsRes, activityRes, weeklyRes] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("role", "employee"),
          supabase
            .from("attendance")
            .select("*", { count: "exact", head: true })
            .eq("type", "in")
            .gte("created_at", startOfMonth()),
          supabase
            .from("requests")
            .select("*", { count: "exact", head: true })
            .eq("status", "pending"),
          supabase
            .from("activity_log")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("attendance")
            .select("created_at, type")
            .gte("created_at", startOfWeek()),
        ]);

      const trendMap = new Map<string, { check_ins: number; check_outs: number }>();
      for (const row of weeklyRes.data ?? []) {
        const day = new Date(row.created_at).toLocaleDateString("tr-TR", {
          weekday: "short",
        });
        const entry = trendMap.get(day) ?? { check_ins: 0, check_outs: 0 };
        if (row.type === "in") entry.check_ins++;
        else entry.check_outs++;
        trendMap.set(day, entry);
      }

      setData({
        activeEmployees: employeesRes.count ?? 0,
        monthlyAttendance: monthlyRes.count ?? 0,
        openRequests: requestsRes.count ?? 0,
        activities: (activityRes.data as ActivityRecord[]) ?? [],
        weeklyTrend: Array.from(trendMap.entries()).map(([day, v]) => ({
          day,
          ...v,
        })),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Veri yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// ─── Employee Stats ───────────────────────────────────────
export type EmployeeStats = {
  weeklyMinutes: number;
  netSalary: number | null;
  paymentDate: string | null;
  remainingLeave: number;
  openRequests: number;
  activities: ActivityRecord[];
};

export function useEmployeeStats(userId: string | undefined) {
  const [data, setData] = useState<EmployeeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const [attendanceRes, payrollRes, requestsRes, leaveRes, activityRes] =
        await Promise.all([
          // Weekly attendance for work hours calc
          supabase
            .from("attendance")
            .select("type, created_at")
            .eq("user_id", userId)
            .gte("created_at", startOfWeek())
            .order("created_at", { ascending: true }),
          // Current month payroll
          supabase
            .from("payroll")
            .select("net_salary, payment_date")
            .eq("user_id", userId)
            .eq("period", currentPeriod())
            .maybeSingle(),
          // Open requests count
          supabase
            .from("requests")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("status", "pending"),
          // Used leave days this year
          supabase
            .from("requests")
            .select("start_date, end_date")
            .eq("user_id", userId)
            .eq("type", "leave")
            .eq("status", "approved")
            .gte(
              "start_date",
              `${new Date().getFullYear()}-01-01`,
            ),
          // Personal activity log
          supabase
            .from("activity_log")
            .select("*")
            .eq("actor_id", userId)
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

      // Calculate weekly work minutes from in/out pairs
      let weeklyMinutes = 0;
      const rows = attendanceRes.data ?? [];
      let lastIn: Date | null = null;
      for (const row of rows) {
        if (row.type === "in") {
          lastIn = new Date(row.created_at);
        } else if (row.type === "out" && lastIn) {
          weeklyMinutes += (new Date(row.created_at).getTime() - lastIn.getTime()) / 60000;
          lastIn = null;
        }
      }

      // Calculate used leave days
      let usedLeaveDays = 0;
      for (const r of leaveRes.data ?? []) {
        if (r.start_date && r.end_date) {
          const start = new Date(r.start_date);
          const end = new Date(r.end_date);
          usedLeaveDays += Math.ceil(
            (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
          ) + 1;
        }
      }
      const ANNUAL_LEAVE_ALLOWANCE = 14;

      setData({
        weeklyMinutes: Math.round(weeklyMinutes),
        netSalary: payrollRes.data?.net_salary ?? null,
        paymentDate: payrollRes.data?.payment_date ?? null,
        remainingLeave: Math.max(0, ANNUAL_LEAVE_ALLOWANCE - usedLeaveDays),
        openRequests: requestsRes.count ?? 0,
        activities: (activityRes.data as ActivityRecord[]) ?? [],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Veri yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

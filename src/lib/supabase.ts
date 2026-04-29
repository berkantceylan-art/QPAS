import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    "Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local",
  );
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type UserRole = "admin" | "client" | "employee";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

export type AttendanceType = "in" | "out";
export type AttendanceMethod = "qr" | "nfc" | "geo" | "manual";

export type AttendanceRecord = {
  id: string;
  user_id: string;
  type: AttendanceType;
  method: AttendanceMethod;
  latitude: number | null;
  longitude: number | null;
  location_label: string | null;
  created_at: string;
};

export type RequestType = "leave" | "advance" | "bes";
export type RequestStatus = "pending" | "approved" | "rejected";

export type RequestRecord = {
  id: string;
  user_id: string;
  type: RequestType;
  status: RequestStatus;
  title: string;
  detail: string | null;
  amount: number | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
};

export type ActivityCategory = "user" | "role" | "pdks" | "payroll" | "system" | "request";

export type ActivityRecord = {
  id: string;
  actor_id: string | null;
  actor_name: string;
  action: string;
  category: ActivityCategory;
  created_at: string;
};

export type PayrollStatus = "draft" | "published" | "paid";

export type PayrollRecord = {
  id: string;
  user_id: string;
  period: string;
  gross_salary: number;
  net_salary: number;
  deductions: number;
  overtime_pay: number;
  payment_date: string | null;
  status: PayrollStatus;
  created_at: string;
  updated_at: string;
};

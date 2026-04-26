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

export type Company = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "suspended";
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  company_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Department = {
  id: string;
  company_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type JobTitle = {
  id: string;
  company_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type Branch = {
  id: string;
  company_id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  geofence_radius_m: number | null;
  created_at: string;
  updated_at: string;
};

export type Shift = {
  id: string;
  company_id: string;
  name: string;
  start_time: string | null;
  end_time: string | null;
  grace_period_minutes: number;
  is_flexible: boolean;
  min_daily_hours: number | null;
  max_daily_hours: number | null;
  created_at: string;
  updated_at: string;
};

export type PeriodHours = {
  total_minutes: number;
  day_minutes: number;
  night_minutes: number;
  effective_minutes: number;
  overtime_minutes: number;
  pair_count: number;
};

export type FinanceRequestType = "advance" | "loan";
export type FinanceRequestStatus =
  | "pending_manager"
  | "pending_admin"
  | "approved"
  | "rejected"
  | "cancelled";
export type LedgerEntryType = "debit" | "credit";

export type FinancialRequest = {
  id: string;
  company_id: string;
  employee_id: string;
  requested_by: string;
  request_type: FinanceRequestType;
  amount: number;
  installments: number;
  monthly_deduction: number | null;
  reason: string | null;
  status: FinanceRequestStatus;
  manager_decided_by: string | null;
  manager_decided_at: string | null;
  manager_note: string | null;
  admin_decided_by: string | null;
  admin_decided_at: string | null;
  admin_note: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DebtLedgerEntry = {
  id: string;
  company_id: string;
  employee_id: string;
  request_id: string | null;
  entry_type: LedgerEntryType;
  amount: number;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

export type EmployeeBalance = {
  total_debit: number;
  total_credit: number;
  balance: number;
};

export type ChatThread = {
  id: string;
  company_id: string;
  employee_id: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_message_sender_id: string | null;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  thread_id: string;
  company_id: string;
  sender_id: string | null;
  body: string;
  created_at: string;
};

export type Announcement = {
  id: string;
  company_id: string;
  title: string;
  body: string;
  created_by: string | null;
  created_at: string;
};

export type AnnouncementRead = {
  announcement_id: string;
  user_id: string;
  read_at: string;
};

export type EmergencyKind = "call_hr" | "help" | "sos";

export type EmergencyRequest = {
  id: string;
  company_id: string;
  employee_id: string;
  user_id: string | null;
  kind: EmergencyKind;
  note: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
  created_at: string;
};

export type EmployeeStatus = "active" | "passive" | "resigned" | "candidate";
export type Gender = "male" | "female" | "other";
export type ContractType = "full_time" | "part_time" | "contractor" | "intern";
export type SgkType = "standard" | "retiree" | "disabled";

export type AttendanceMethod = "gps" | "qr" | "device" | "manual";
export type AttendanceLogType = "in" | "out";

export type AttendanceLog = {
  id: string;
  company_id: string;
  employee_id: string;
  branch_id: string | null;
  method: AttendanceMethod;
  log_type: AttendanceLogType;
  latitude: number | null;
  longitude: number | null;
  accuracy_m: number | null;
  distance_m: number | null;
  qr_token_prefix: string | null;
  device_id: string | null;
  paired_log_id: string | null;
  worked_minutes: number | null;
  notes: string | null;
  logged_at: string;
  created_at: string;
};

export type DocType =
  | "identity"
  | "health_report"
  | "contract"
  | "criminal_record"
  | "other";

export type EmployeeDocument = {
  id: string;
  employee_id: string;
  company_id: string;
  doc_type: DocType;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
};

export type Employee = {
  id: string;
  company_id: string;
  user_id: string | null;

  employee_no: string | null;
  full_name: string;
  national_id: string | null;
  birth_date: string | null;
  gender: Gender | null;
  phone: string | null;
  personal_email: string | null;
  photo_url: string | null;

  hire_date: string | null;
  resign_date: string | null;
  status: EmployeeStatus;
  department_id: string | null;
  job_title_id: string | null;
  manager_id: string | null;
  branch_id: string | null;
  contract_type: ContractType | null;

  salary: number | null;
  iban: string | null;
  bank_name: string | null;
  sgk_type: SgkType | null;
  tax_office: string | null;

  rfid_card_id: string | null;
  shift_id: string | null;

  notes: string | null;
  created_at: string;
  updated_at: string;
};

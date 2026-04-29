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

  salary: number | null; // This represents total_agreed_salary now
  official_salary: number | null;
  iban: string | null;
  bank_name: string | null;
  sgk_type: SgkType | null;
  tax_office: string | null;
  is_retired: boolean;
  disability_degree: number;
  is_part_time: boolean;

  rfid_card_id: string | null;
  shift_id: string | null;
  custom_role_id: string | null;

  notes: string | null;
  created_at: string;
  updated_at: string;
};

// ── RBAC ────────────────────────────────────────────────────
export type PermissionModule =
  | "personnel"
  | "finance"
  | "shifts"
  | "reports"
  | "communication"
  | "settings"
  | "attendance";

export type PermissionAction = "read" | "write" | "edit" | "delete";

export type PermissionMap = Partial<Record<PermissionModule, PermissionAction[]>>;

export type CustomRole = {
  id: string;
  company_id: string;
  name: string;
  permissions: PermissionMap;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

// ── Import Jobs ─────────────────────────────────────────────
export type ImportJobStatus = "processing" | "completed" | "failed";

export type ImportJob = {
  id: string;
  company_id: string;
  uploaded_by: string;
  file_name: string;
  file_size_bytes: number | null;
  status: ImportJobStatus;
  total_rows: number;
  imported_rows: number;
  skipped_rows: number;
  error_rows: number;
  errors: Array<{ row: number; message: string }>;
  column_mapping: Record<string, string>;
  created_at: string;
  completed_at: string | null;
};

// ── Faz 6: Yasal Parametreler ve Bordro ─────────────────────

export type TaxBracket = {
  limit: number;
  rate: number;
};

export type PayrollParameter = {
  id: string;
  company_id: string;
  year: number;
  month: number | null;
  min_wage_gross: number;
  min_wage_net: number;
  sgk_floor: number;
  sgk_ceiling: number;
  stamp_tax_rate: number;
  disability_discount_1: number;
  disability_discount_2: number;
  disability_discount_3: number;
  tax_brackets: TaxBracket[];
  created_at: string;
  updated_at: string;
};

export type Payroll = {
  id: string;
  company_id: string;
  employee_id: string;
  period_year: number;
  period_month: number;
  worked_days: number;
  official_gross: number;
  official_net: number;
  sgk_employee: number;
  sgk_employer: number;
  income_tax: number;
  stamp_tax: number;
  advance_deduction: number;
  total_agreed_salary: number;
  cash_difference: number;
  total_employer_cost: number;
  status: "draft" | "finalized";
  created_at: string;
  updated_at: string;
  // Join relations
  employee?: {
    id: string;
    full_name: string;
    department_id: string | null;
  };
};

export type SystemNotification = {
  id: string;
  company_id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

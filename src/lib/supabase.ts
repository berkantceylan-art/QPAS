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
  created_at: string;
  updated_at: string;
};

export type Shift = {
  id: string;
  company_id: string;
  name: string;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
  updated_at: string;
};

export type EmployeeStatus = "active" | "passive" | "resigned" | "candidate";
export type Gender = "male" | "female" | "other";
export type ContractType = "full_time" | "part_time" | "contractor" | "intern";
export type SgkType = "standard" | "retiree" | "disabled";

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

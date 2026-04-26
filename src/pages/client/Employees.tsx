import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Briefcase,
  Building2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cardReveal, staggerContainer } from "@/components/motion/variants";
import { PORTALS } from "@/lib/portals";
import { useAuth } from "@/hooks/useAuth";
import {
  supabase,
  type Department,
  type Employee,
  type EmployeeStatus,
  type JobTitle,
  type Branch,
  type Shift,
} from "@/lib/supabase";
import { cn } from "@/lib/utils";
import PersonnelCard from "./PersonnelCard";

const STATUS_LABEL: Record<EmployeeStatus, string> = {
  active: "Aktif",
  passive: "Pasif",
  resigned: "Ayrıldı",
  candidate: "Aday",
};

const STATUS_BADGE: Record<EmployeeStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  passive: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  resigned: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  candidate: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
};

type StatusFilter = "all" | EmployeeStatus;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "active", label: "Aktif" },
  { value: "passive", label: "Pasif" },
  { value: "candidate", label: "Aday" },
  { value: "resigned", label: "Ayrıldı" },
];

type EmployeeRow = Employee & {
  department?: { id: string; name: string } | null;
  job_title?: { id: string; name: string } | null;
  branch?: { id: string; name: string } | null;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters =
    parts.length >= 2
      ? parts[0][0] + parts[parts.length - 1][0]
      : parts[0]?.slice(0, 2) ?? "?";
  return letters.toUpperCase();
}

export default function Employees() {
  const client = PORTALS.client;
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");

  const [editing, setEditing] = useState<EmployeeRow | null>(null);
  const [creating, setCreating] = useState(false);
  const { profile, loading: authLoading } = useAuth();
  const companyMissing = !authLoading && profile && !profile.company_id;

  const fetchAll = async () => {
    setLoading(true);
    setLoadError(null);
    await Promise.all([fetchEmployees(), fetchSupportTables()]);
    setLoading(false);
  };

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select(
        "*, department:departments(id,name), job_title:job_titles(id,name), branch:branches(id,name)",
      )
      .order("created_at", { ascending: false });
    if (error) {
      setLoadError(error.message);
      return;
    }
    setRows((data as EmployeeRow[]) ?? []);
  };

  const fetchSupportTables = async () => {
    const [depts, titles, brs, shfts] = await Promise.all([
      supabase.from("departments").select("*").order("name"),
      supabase.from("job_titles").select("*").order("name"),
      supabase.from("branches").select("*").order("name"),
      supabase.from("shifts").select("*").order("name"),
    ]);
    setDepartments(depts.data ?? []);
    setJobTitles(titles.data ?? []);
    setBranches(brs.data ?? []);
    setShifts(shfts.data ?? []);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Re-fetch support tables when personnel card opens so dropdowns reflect
  // any departments/positions/branches/shifts created in another tab.
  useEffect(() => {
    if (creating || editing) {
      fetchSupportTables();
    }
  }, [creating, editing]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (departmentFilter !== "all" && r.department_id !== departmentFilter)
        return false;
      if (q) {
        const haystack = [
          r.full_name,
          r.employee_no,
          r.personal_email,
          r.phone,
          r.department?.name,
          r.job_title?.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, statusFilter, departmentFilter]);

  const handleSaved = (saved: Employee) => {
    setRows((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id);
      const enriched: EmployeeRow = {
        ...saved,
        department:
          departments.find((d) => d.id === saved.department_id) ?? null,
        job_title: jobTitles.find((j) => j.id === saved.job_title_id) ?? null,
        branch: branches.find((b) => b.id === saved.branch_id) ?? null,
      };
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = enriched;
        return copy;
      }
      return [enriched, ...prev];
    });
  };

  const handleDeleted = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p
            className={cn(
              "text-sm font-semibold uppercase tracking-[0.18em]",
              client.accentEyebrow,
            )}
          >
            Modül
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Çalışanlar
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Personel kartları, departmanlar ve özlük bilgileri.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchAll}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw
              className={cn("h-4 w-4", loading && "animate-spin")}
            />
            Yenile
          </Button>
          <Button
            size="sm"
            onClick={() => setCreating(true)}
            disabled={!!companyMissing}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Yeni Çalışan
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="İsim, sicil no, departman, iletişim…"
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map(({ value, label }) => {
            const count =
              value === "all"
                ? rows.length
                : rows.filter((r) => r.status === value).length;
            const active = statusFilter === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  active
                    ? `border-transparent bg-gradient-to-r ${client.accentGradient} text-white shadow-sm`
                    : "border-slate-200 bg-white/70 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10",
                )}
              >
                {label}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[10px] font-bold",
                    active
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}

          {departments.length > 0 && (
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="ml-auto rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
            >
              <option value="all">Tüm Departmanlar</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {companyMissing && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
          <span>
            Hesabınız bir firmaya bağlanmamış. Çalışan oluşturmak için sistem
            yöneticisinden firma ataması talep edin.
          </span>
        </div>
      )}

      {loadError && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
          <span>{loadError}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500 dark:text-slate-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Yükleniyor…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center dark:border-white/10 dark:bg-slate-900/40">
          <UserPlus className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">
            {rows.length === 0
              ? "Henüz çalışan kaydı yok."
              : "Bu filtrede çalışan yok."}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {rows.length === 0
              ? "Yeni bir çalışan oluşturmak için yukarıdaki butonu kullan."
              : "Filtreyi sıfırla veya farklı bir arama dene."}
          </p>
        </div>
      ) : (
        <motion.ul
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="space-y-2"
        >
          {filtered.map((row) => (
            <motion.li
              key={row.id}
              variants={cardReveal}
              className="cursor-pointer"
              onClick={() => setEditing(row)}
            >
              <div className="group flex items-center gap-4 rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3.5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md dark:border-white/10 dark:bg-slate-900/60 dark:hover:border-white/20">
                <span
                  className={cn(
                    "flex h-11 w-11 flex-none items-center justify-center rounded-full bg-gradient-to-br text-sm font-semibold text-white shadow-md ring-1 ring-white/20",
                    client.accentGradient,
                  )}
                >
                  {row.photo_url ? (
                    <img
                      src={row.photo_url}
                      alt={row.full_name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    initials(row.full_name)
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {row.full_name}
                    </p>
                    {row.employee_no && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:bg-white/5 dark:text-slate-400">
                        #{row.employee_no}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    {row.job_title?.name && (
                      <span className="inline-flex items-center gap-1 truncate">
                        <Briefcase className="h-3 w-3 flex-none" />
                        {row.job_title.name}
                      </span>
                    )}
                    {row.department?.name && (
                      <span className="inline-flex items-center gap-1 truncate">
                        <Building2 className="h-3 w-3 flex-none" />
                        {row.department.name}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider",
                    STATUS_BADGE[row.status],
                  )}
                >
                  {STATUS_LABEL[row.status]}
                </span>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      )}

      <PersonnelCard
        open={creating || editing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
          }
        }}
        employee={editing}
        departments={departments}
        jobTitles={jobTitles}
        branches={branches}
        shifts={shifts}
        otherEmployees={rows.filter((r) => r.id !== editing?.id)}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Dialog } from "@/components/ui/Dialog";
import { cardReveal, staggerContainer } from "@/components/motion/variants";
import { PORTALS } from "@/lib/portals";
import { supabase, type Company, type Profile, type UserRole } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Admin",
  client: "Müşteri",
  employee: "Çalışan",
};

type RoleFilter = "all" | UserRole;

const ROLE_FILTERS: { value: RoleFilter; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "admin", label: "Admin" },
  { value: "client", label: "Müşteri" },
  { value: "employee", label: "Çalışan" },
];

const createSchema = z
  .object({
    email: z
      .string()
      .min(1, "E-posta gerekli")
      .email("Geçerli bir e-posta girin"),
    full_name: z.string().min(2, "En az 2 karakter"),
    role: z.enum(["client", "employee"], {
      errorMap: () => ({ message: "Rol seçin" }),
    }),
    company_id: z.string().uuid("Firma seçin"),
    passwordMode: z.enum(["auto", "manual"]),
    password: z.string().optional(),
  })
  .refine(
    (v) =>
      v.passwordMode === "auto" || (v.password && v.password.length >= 8),
    {
      message: "Şifre en az 8 karakter olmalı",
      path: ["password"],
    },
  );

type CreateValues = z.infer<typeof createSchema>;

type CreateResponse = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  company_id: string | null;
  initial_password?: string | null;
};

function initials(name: string | null, email: string) {
  const source = (name && name.trim()) || email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  const letters =
    parts.length >= 2
      ? parts[0][0] + parts[1][0]
      : parts[0]?.slice(0, 2) ?? "?";
  return letters.toUpperCase();
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function Users() {
  const admin = PORTALS.admin;
  const [rows, setRows] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<RoleFilter>("all");
  const [open, setOpen] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from("profiles")
      .select("*, company:companies(id,name,slug)")
      .order("created_at", { ascending: false });
    if (error) {
      setLoadError(error.message);
    } else {
      setRows(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filtered = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.role === filter)),
    [rows, filter],
  );

  const handleCreated = (created: CreateResponse) => {
    setRows((prev) => [
      {
        id: created.id,
        email: created.email,
        full_name: created.full_name,
        role: created.role,
        company_id: created.company_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p
            className={cn(
              "text-sm font-semibold uppercase tracking-[0.18em]",
              admin.accentEyebrow,
            )}
          >
            Modül
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Kullanıcılar
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Müşteri ve çalışan hesaplarını oluştur, rolleri yönet.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchUsers}
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
            onClick={() => setOpen(true)}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Yeni Kullanıcı
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {ROLE_FILTERS.map(({ value, label }) => {
          const count =
            value === "all"
              ? rows.length
              : rows.filter((r) => r.role === value).length;
          const active = filter === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                active
                  ? `border-transparent bg-gradient-to-r ${admin.accentGradient} text-white shadow-sm`
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
      </div>

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
            Bu filtrede kullanıcı yok.
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Yeni bir kullanıcı oluşturmak için yukarıdaki butonu kullan.
          </p>
        </div>
      ) : (
        <motion.ul
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="space-y-2"
        >
          {filtered.map((row) => {
            const portal = PORTALS[row.role];
            return (
              <motion.li
                key={row.id}
                variants={cardReveal}
                className="flex items-center gap-4 rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3.5 shadow-sm transition-shadow hover:shadow-md dark:border-white/10 dark:bg-slate-900/60"
              >
                <span
                  className={cn(
                    "flex h-10 w-10 flex-none items-center justify-center rounded-full bg-gradient-to-br text-sm font-semibold text-white shadow-md ring-1 ring-white/20",
                    portal.accentGradient,
                  )}
                >
                  {initials(row.full_name, row.email)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {row.full_name || row.email.split("@")[0]}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {row.email}
                  </p>
                </div>
                {(row as any).company && (
                  <span className="hidden lg:inline text-xs text-slate-500 dark:text-slate-400">
                    {(row as any).company.name}
                  </span>
                )}
                <span
                  className={cn(
                    "hidden sm:inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider",
                    portal.accentBadge,
                  )}
                >
                  {ROLE_LABEL[row.role]}
                </span>
                <span className="hidden md:inline text-xs text-slate-500 dark:text-slate-400">
                  {formatDate(row.created_at)}
                </span>
              </motion.li>
            );
          })}
        </motion.ul>
      )}

      <CreateUserDialog
        open={open}
        onOpenChange={setOpen}
        onCreated={handleCreated}
      />
    </div>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (created: CreateResponse) => void;
}) {
  const [apiError, setApiError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      email: "",
      full_name: "",
      role: "client",
      company_id: "",
      passwordMode: "auto",
      password: "",
    },
  });

  const passwordMode = watch("passwordMode");

  useEffect(() => {
    if (open && companies.length === 0) {
      setCompaniesLoading(true);
      supabase
        .from("companies")
        .select("*")
        .order("name")
        .then(({ data }) => {
          setCompanies(data ?? []);
          setCompaniesLoading(false);
        });
    }
  }, [open, companies.length]);

  useEffect(() => {
    if (!open) {
      setApiError(null);
      setResult(null);
      setCopied(false);
      reset();
    }
  }, [open, reset]);

  const onSubmit = async (values: CreateValues) => {
    setApiError(null);
    const payload = {
      email: values.email,
      full_name: values.full_name,
      role: values.role,
      company_id: values.company_id,
      ...(values.passwordMode === "manual" && values.password
        ? { password: values.password }
        : {}),
    };
    const { data, error } = await supabase.functions.invoke<CreateResponse>(
      "admin-create-user",
      { body: payload },
    );
    if (error) {
      let msg = error.message || "Kullanıcı oluşturulamadı";
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === "function") {
        try {
          const parsed = (await ctx.json()) as {
            error?: string;
            detail?: string;
          };
          msg = parsed.error
            ? parsed.detail
              ? `${parsed.error} — ${parsed.detail}`
              : parsed.error
            : msg;
        } catch {
          // body wasn't JSON — keep default msg
        }
      }
      setApiError(msg);
      return;
    }
    if (!data) {
      setApiError("Beklenmeyen yanıt");
      return;
    }
    setResult(data);
    onCreated(data);
  };

  const copyPassword = async () => {
    if (!result?.initial_password) return;
    await navigator.clipboard.writeText(result.initial_password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={result ? "Kullanıcı oluşturuldu" : "Yeni Kullanıcı"}
      description={
        result
          ? "Giriş bilgilerini güvenli bir kanalla kullanıcıyla paylaş."
          : "Müşteri veya çalışan için hesap oluştur."
      }
    >
      {result ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 flex-none" />
            <span>
              <span className="font-semibold">{ROLE_LABEL[result.role]}</span>{" "}
              hesabı hazır.
            </span>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-slate-400" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  E-posta
                </p>
                <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                  {result.email}
                </p>
              </div>
            </div>

            {result.initial_password && (
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Başlangıç Şifresi
                  </p>
                  <p className="truncate font-mono text-sm font-medium text-slate-900 dark:text-white">
                    {result.initial_password}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyPassword}
                  className="gap-1.5"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? "Kopyalandı" : "Kopyala"}
                </Button>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Şifre bir daha gösterilmeyecek. Kullanıcı ilk girişte değiştirmeli.
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" onClick={() => onOpenChange(false)}>
              Kapat
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Ad Soyad</Label>
            <Input
              id="full_name"
              invalid={!!errors.full_name}
              placeholder="Örn. Ayşe Yılmaz"
              {...register("full_name")}
            />
            {errors.full_name && (
              <p className="text-xs text-rose-500">
                {errors.full_name.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">E-posta</Label>
            <Input
              id="email"
              type="email"
              autoComplete="off"
              invalid={!!errors.email}
              placeholder="user@sirket.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-rose-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="role">Rol</Label>
            <Select id="role" invalid={!!errors.role} {...register("role")}>
              <option value="client">Müşteri (İşletme Yöneticisi)</option>
              <option value="employee">Çalışan</option>
            </Select>
            {errors.role && (
              <p className="text-xs text-rose-500">{errors.role.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company_id">Firma</Label>
            <Select
              id="company_id"
              invalid={!!errors.company_id}
              disabled={companiesLoading}
              {...register("company_id")}
            >
              <option value="">Firma seçin…</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            {errors.company_id && (
              <p className="text-xs text-rose-500">
                {errors.company_id.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Başlangıç Şifresi</Label>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                  passwordMode === "auto"
                    ? "border-cyan-500/60 bg-cyan-500/10 text-slate-900 dark:text-white"
                    : "border-slate-200 bg-white/70 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300",
                )}
              >
                <input
                  type="radio"
                  value="auto"
                  className="h-3.5 w-3.5"
                  {...register("passwordMode")}
                />
                Otomatik
              </label>
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                  passwordMode === "manual"
                    ? "border-cyan-500/60 bg-cyan-500/10 text-slate-900 dark:text-white"
                    : "border-slate-200 bg-white/70 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300",
                )}
              >
                <input
                  type="radio"
                  value="manual"
                  className="h-3.5 w-3.5"
                  {...register("passwordMode")}
                />
                Elle gir
              </label>
            </div>
            {passwordMode === "manual" && (
              <Input
                id="password"
                type="text"
                autoComplete="off"
                invalid={!!errors.password}
                placeholder="En az 8 karakter"
                className="mt-2"
                {...register("password")}
              />
            )}
            {errors.password && (
              <p className="text-xs text-rose-500">
                {errors.password.message}
              </p>
            )}
          </div>

          {apiError && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
              <span>{apiError}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Vazgeç
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-1.5">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Oluşturuluyor…
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Oluştur
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

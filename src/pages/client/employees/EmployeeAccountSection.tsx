import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { supabase, type Employee } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type Props = {
  employee: Employee;
};

type CreateResponse = {
  user_id: string;
  employee_id: string;
  email: string;
  initial_password: string | null;
};

export default function EmployeeAccountSection({ employee }: Props) {
  const [linkedEmail, setLinkedEmail] = useState<string | null>(null);
  const [linkedLoading, setLinkedLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [email, setEmail] = useState(employee.personal_email ?? "");
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateResponse | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset only when switching to a different employee
  useEffect(() => {
    setLinkedEmail(null);
    setResult(null);
    setFormOpen(false);
    setError(null);
    setPassword("");
    setMode("auto");
    setEmail(employee.personal_email ?? "");
  }, [employee.id]);

  // Fetch linked profile email when user_id is present
  useEffect(() => {
    if (!employee.user_id) return;
    setLinkedLoading(true);
    supabase
      .from("profiles")
      .select("email")
      .eq("id", employee.user_id)
      .maybeSingle()
      .then(({ data }) => {
        setLinkedEmail(data?.email ?? null);
        setLinkedLoading(false);
      });
  }, [employee.user_id]);

  const handleSubmit = async () => {
    setError(null);
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Geçerli bir e-posta gerekli");
      return;
    }
    if (mode === "manual" && password.trim().length < 8) {
      setError("Şifre en az 8 karakter olmalı");
      return;
    }
    setSubmitting(true);
    const payload: Record<string, string> = {
      employee_id: employee.id,
      email: trimmedEmail,
    };
    if (mode === "manual") payload.password = password.trim();

    const { data, error: invokeError } =
      await supabase.functions.invoke<CreateResponse>(
        "client-create-employee-login",
        { body: payload },
      );
    setSubmitting(false);

    if (invokeError) {
      let msg = invokeError.message || "Hesap oluşturulamadı";
      const ctx = (invokeError as { context?: Response }).context;
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
          /* not JSON */
        }
      }
      setError(msg);
      return;
    }
    if (!data) {
      setError("Beklenmeyen yanıt");
      return;
    }
    setResult(data);
    setLinkedEmail(data.email);
  };

  const handleCopy = async () => {
    if (!result?.initial_password) return;
    await navigator.clipboard.writeText(result.initial_password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Result takes priority — user just created an account
  if (result) {
    return (
      <div className="col-span-full space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
        <div className="flex items-center gap-2 text-sm text-emerald-800 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4 flex-none" />
          <span className="font-semibold">Hesap oluşturuldu.</span>
        </div>
        <div className="space-y-2 rounded-lg border border-emerald-200/70 bg-white/80 p-3 dark:border-emerald-500/20 dark:bg-slate-900/60">
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
                onClick={handleCopy}
                className="gap-1.5"
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? "Kopyalandı" : "Kopyala"}
              </Button>
            </div>
          )}
        </div>
        <p className="text-xs text-emerald-700/80 dark:text-emerald-300/70">
          Şifreyi güvenli bir kanalla çalışana iletin. Tekrar gösterilmeyecek.
        </p>
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setResult(null)}
          >
            Tamam
          </Button>
        </div>
      </div>
    );
  }

  if (employee.user_id && linkedEmail !== null) {
    return (
      <div className="col-span-full flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3.5 py-3 text-sm dark:border-emerald-500/30 dark:bg-emerald-500/10">
        <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-emerald-600 dark:text-emerald-300" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-emerald-800 dark:text-emerald-200">
            Bağlı hesap
          </p>
          <p className="mt-0.5 truncate text-emerald-700 dark:text-emerald-300">
            {linkedEmail}
          </p>
          <p className="mt-0.5 text-xs text-emerald-600/80 dark:text-emerald-300/70">
            Çalışan bu e-posta ile /employee/login üzerinden giriş yapabilir.
          </p>
        </div>
      </div>
    );
  }

  if (employee.user_id && linkedLoading) {
    return (
      <div className="col-span-full flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-3.5 py-3 text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Bağlı hesap bilgileri yükleniyor…
      </div>
    );
  }

  if (!formOpen) {
    return (
      <div className="col-span-full rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Sistem Girişi
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Bu çalışanın henüz bir kullanıcı hesabı yok. PDKS ve çalışan
              portalına erişmesi için hesap oluşturun.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setFormOpen(true)}
            className="gap-1.5"
          >
            <UserPlus className="h-4 w-4" />
            Hesap Oluştur
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="col-span-full space-y-3 rounded-xl border border-slate-200/70 bg-white/80 p-4 dark:border-white/10 dark:bg-slate-900/60">
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        Yeni Hesap
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="acc-email">E-posta</Label>
          <Input
            id="acc-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="calisan@sirket.com"
            disabled={submitting}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Şifre</Label>
          <div className="grid grid-cols-2 gap-2">
            <label
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                mode === "auto"
                  ? "border-cyan-500/60 bg-cyan-500/10 text-slate-900 dark:text-white"
                  : "border-slate-200 bg-white/70 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300",
              )}
            >
              <input
                type="radio"
                value="auto"
                checked={mode === "auto"}
                onChange={() => setMode("auto")}
                className="h-3.5 w-3.5"
              />
              Otomatik
            </label>
            <label
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                mode === "manual"
                  ? "border-cyan-500/60 bg-cyan-500/10 text-slate-900 dark:text-white"
                  : "border-slate-200 bg-white/70 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300",
              )}
            >
              <input
                type="radio"
                value="manual"
                checked={mode === "manual"}
                onChange={() => setMode("manual")}
                className="h-3.5 w-3.5"
              />
              Elle gir
            </label>
          </div>
        </div>
      </div>
      {mode === "manual" && (
        <Input
          type="text"
          placeholder="En az 8 karakter"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={submitting}
        />
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setFormOpen(false);
            setError(null);
          }}
          disabled={submitting}
        >
          Vazgeç
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSubmit}
          disabled={submitting}
          className="gap-1.5"
        >
          {submitting ? (
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
    </div>
  );
}

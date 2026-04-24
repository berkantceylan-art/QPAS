import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Coins,
  FileSignature,
  HandCoins,
  Loader2,
  Plus,
  Receipt,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Dialog } from "@/components/ui/Dialog";
import { cardReveal, staggerContainer } from "@/components/motion/variants";
import { useAuth } from "@/hooks/useAuth";
import {
  supabase,
  type DebtLedgerEntry,
  type Employee,
  type EmployeeBalance,
  type FinanceRequestType,
  type FinancialRequest,
} from "@/lib/supabase";
import {
  STATUS_BADGE,
  STATUS_LABEL,
  TYPE_LABEL,
  formatDate,
  formatTRY,
} from "@/lib/finance";
import { cn } from "@/lib/utils";

export default function EmployeeRequests() {
  const { user } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [requests, setRequests] = useState<FinancialRequest[]>([]);
  const [ledger, setLedger] = useState<DebtLedgerEntry[]>([]);
  const [balance, setBalance] = useState<EmployeeBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadAll = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    const { data: emp, error: empError } = await supabase
      .from("employees")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (empError) {
      setError(empError.message);
      setLoading(false);
      return;
    }
    setEmployee((emp as Employee) ?? null);
    if (!emp) {
      setLoading(false);
      return;
    }
    const [reqRes, ledRes, balRes] = await Promise.all([
      supabase
        .from("financial_requests")
        .select("*")
        .eq("employee_id", emp.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("debt_ledger")
        .select("*")
        .eq("employee_id", emp.id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.rpc("finance_employee_balance", { p_employee_id: emp.id }),
    ]);
    setRequests((reqRes.data as FinancialRequest[]) ?? []);
    setLedger((ledRes.data as DebtLedgerEntry[]) ?? []);
    const balArr = balRes.data as EmployeeBalance[] | null;
    setBalance(balArr && balArr.length > 0 ? balArr[0] : null);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleCancel = async (req: FinancialRequest) => {
    if (
      !confirm(
        `${TYPE_LABEL[req.request_type]} talebini iptal etmek istediğine emin misin?`,
      )
    )
      return;
    const { error: rpcError } = await supabase.rpc("finance_cancel", {
      p_request_id: req.id,
    });
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    loadAll();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 dark:text-slate-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Yükleniyor…
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
        Bu hesaba bağlı bir çalışan kaydı yok.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400">
            Modül
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Finansal Talepler
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Avans ve senetli borç taleplerini yönet, mevcut bakiyeyi gör.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadAll}
            className="gap-1.5"
          >
            <RefreshCw className="h-4 w-4" />
            Yenile
          </Button>
          <Button
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Yeni Talep
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Mevcut Borç"
          value={formatTRY(balance?.balance ?? 0)}
          tone={balance && balance.balance > 0 ? "amber" : "emerald"}
          icon={<Wallet className="h-5 w-5" />}
        />
        <StatCard
          label="Toplam Alınan"
          value={formatTRY(balance?.total_debit ?? 0)}
          tone="slate"
          icon={<HandCoins className="h-5 w-5" />}
        />
        <StatCard
          label="Toplam Ödenen"
          value={formatTRY(balance?.total_credit ?? 0)}
          tone="emerald"
          icon={<Receipt className="h-5 w-5" />}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          Talepler ({requests.length})
        </h2>
        {requests.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-white/40 p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
            Henüz talep yok.
          </p>
        ) : (
          <motion.ul
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="space-y-2"
          >
            {requests.map((r) => (
              <motion.li
                key={r.id}
                variants={cardReveal}
                className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3.5 shadow-sm dark:border-white/10 dark:bg-slate-900/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {r.request_type === "loan" ? (
                        <FileSignature className="h-4 w-4 text-indigo-500" />
                      ) : (
                        <Coins className="h-4 w-4 text-amber-500" />
                      )}
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {TYPE_LABEL[r.request_type]} — {formatTRY(r.amount)}
                      </p>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {r.installments > 1 &&
                        `${r.installments} taksit · ${formatTRY(r.monthly_deduction)}/ay · `}
                      {formatDate(r.created_at)}
                    </p>
                    {r.reason && (
                      <p className="mt-1 text-xs italic text-slate-500 dark:text-slate-400">
                        "{r.reason}"
                      </p>
                    )}
                    {r.manager_note && (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold">Yönetici:</span>{" "}
                        {r.manager_note}
                      </p>
                    )}
                    {r.admin_note && (
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold">Admin:</span>{" "}
                        {r.admin_note}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider",
                        STATUS_BADGE[r.status],
                      )}
                    >
                      {STATUS_LABEL[r.status]}
                    </span>
                    {(r.status === "pending_manager" ||
                      r.status === "pending_admin") && (
                      <button
                        type="button"
                        onClick={() => handleCancel(r)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                      >
                        <Ban className="h-3 w-3" />
                        İptal
                      </button>
                    )}
                  </div>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </section>

      {ledger.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Borç Defteri (son 20)
          </h2>
          <ul className="space-y-1.5">
            {ledger.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between rounded-lg border border-slate-200/70 bg-white/60 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {e.note ??
                      (e.entry_type === "debit" ? "Borç" : "Ödeme")}
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDate(e.created_at)}
                  </p>
                </div>
                <span
                  className={cn(
                    "font-mono text-sm font-semibold",
                    e.entry_type === "debit"
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-emerald-600 dark:text-emerald-400",
                  )}
                >
                  {e.entry_type === "debit" ? "+" : "−"}
                  {formatTRY(e.amount)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <CreateRequestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={loadAll}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "slate" | "emerald" | "amber";
}) {
  const toneMap = {
    slate: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
    emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  };
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
      <span
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-xl",
          toneMap[tone],
        )}
      >
        {icon}
      </span>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function CreateRequestDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [type, setType] = useState<FinanceRequestType>("advance");
  const [amount, setAmount] = useState("");
  const [installments, setInstallments] = useState("3");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setType("advance");
      setAmount("");
      setInstallments("3");
      setReason("");
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setError("Geçerli bir tutar girin");
      return;
    }
    const inst = type === "loan" ? Math.max(2, parseInt(installments, 10) || 2) : 1;
    setSubmitting(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("finance_submit_request", {
      p_type: type,
      p_amount: n,
      p_installments: inst,
      p_reason: reason,
    });
    setSubmitting(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    onCreated();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Yeni Finansal Talep"
      description={
        type === "advance"
          ? "Avans tek seferlik — sadece firma yöneticisi onayı yeterli."
          : "Senetli borç çoklu taksitli — yönetici + admin çift onayı gerekir."
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="req-type">Tür</Label>
          <Select
            id="req-type"
            value={type}
            onChange={(e) => setType(e.target.value as FinanceRequestType)}
          >
            <option value="advance">Avans</option>
            <option value="loan">Senetli Borç</option>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="req-amount">Tutar (₺)</Label>
          <Input
            id="req-amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            disabled={submitting}
          />
        </div>

        {type === "loan" && (
          <div className="space-y-1.5">
            <Label htmlFor="req-installments">Taksit sayısı</Label>
            <Input
              id="req-installments"
              type="number"
              min="2"
              max="60"
              value={installments}
              onChange={(e) => setInstallments(e.target.value)}
              disabled={submitting}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Aylık kesinti =
              {amount && Number(installments) > 0
                ? ` ${formatTRY(Number(amount) / Number(installments))}`
                : " —"}
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="req-reason">Açıklama</Label>
          <Textarea
            id="req-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="İsteğe bağlı: talebin sebebi"
            disabled={submitting}
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Vazgeç
          </Button>
          <Button type="submit" disabled={submitting} className="gap-1.5">
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Gönder
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Coins,
  FileSignature,
  Loader2,
  PlusCircle,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Dialog } from "@/components/ui/Dialog";
import { PORTALS } from "@/lib/portals";
import {
  supabase,
  type Employee,
  type FinancialRequest,
} from "@/lib/supabase";
import {
  STATUS_BADGE,
  STATUS_LABEL,
  TYPE_LABEL,
  formatDate,
  formatTRY,
} from "@/lib/finance";
import { cardReveal, staggerContainer } from "@/components/motion/variants";
import { cn } from "@/lib/utils";

type RequestRow = FinancialRequest & {
  employee?: { id: string; full_name: string } | null;
};

const TAB_FILTERS = [
  { value: "pending", label: "Bekleyen" },
  { value: "approved", label: "Onaylı" },
  { value: "rejected", label: "Red" },
  { value: "all", label: "Tümü" },
] as const;

type TabFilter = (typeof TAB_FILTERS)[number]["value"];

export default function ClientFinance() {
  const client = PORTALS.client;
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabFilter>("pending");
  const [decisionFor, setDecisionFor] = useState<RequestRow | null>(null);
  const [decisionMode, setDecisionMode] = useState<"approve" | "reject" | null>(
    null,
  );
  const [repaymentFor, setRepaymentFor] = useState<Employee | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [reqs, emps] = await Promise.all([
      supabase
        .from("financial_requests")
        .select("*, employee:employees(id, full_name)")
        .order("created_at", { ascending: false }),
      supabase.from("employees").select("*").order("full_name"),
    ]);
    if (reqs.error) setError(reqs.error.message);
    setRequests((reqs.data as RequestRow[]) ?? []);
    setEmployees((emps.data as Employee[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    switch (tab) {
      case "pending":
        return requests.filter(
          (r) => r.status === "pending_manager" || r.status === "pending_admin",
        );
      case "approved":
        return requests.filter((r) => r.status === "approved");
      case "rejected":
        return requests.filter(
          (r) => r.status === "rejected" || r.status === "cancelled",
        );
      default:
        return requests;
    }
  }, [requests, tab]);

  const counts = useMemo(
    () => ({
      pending: requests.filter(
        (r) => r.status === "pending_manager" || r.status === "pending_admin",
      ).length,
      approved: requests.filter((r) => r.status === "approved").length,
      rejected: requests.filter(
        (r) => r.status === "rejected" || r.status === "cancelled",
      ).length,
      all: requests.length,
    }),
    [requests],
  );

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
            Finansal Onaylar
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Avans ve senetli borç taleplerini onayla, borç defterini yönet.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={load}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Yenile
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (employees.length === 0) return;
              setRepaymentFor(employees[0]);
            }}
            disabled={employees.length === 0}
            className="gap-1.5"
          >
            <PlusCircle className="h-4 w-4" />
            Ödeme Gir
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {TAB_FILTERS.map(({ value, label }) => {
          const active = tab === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
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
                {counts[value]}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500 dark:text-slate-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Yükleniyor…
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white/40 p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
          Bu filtrede talep yok.
        </p>
      ) : (
        <motion.ul
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="space-y-2"
        >
          {filtered.map((r) => {
            const canDecide = r.status === "pending_manager";
            const isLoanPendingAdmin =
              r.status === "pending_admin" && r.request_type === "loan";
            return (
              <motion.li
                key={r.id}
                variants={cardReveal}
                className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3.5 shadow-sm dark:border-white/10 dark:bg-slate-900/60"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {r.request_type === "loan" ? (
                        <FileSignature className="h-4 w-4 text-indigo-500" />
                      ) : (
                        <Coins className="h-4 w-4 text-amber-500" />
                      )}
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {r.employee?.full_name ?? "—"} ·{" "}
                        {TYPE_LABEL[r.request_type]}
                      </p>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                          STATUS_BADGE[r.status],
                        )}
                      >
                        {STATUS_LABEL[r.status]}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-lg font-bold text-slate-900 dark:text-white">
                      {formatTRY(r.amount)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {r.installments > 1 &&
                        `${r.installments} taksit · ${formatTRY(r.monthly_deduction)}/ay · `}
                      {formatDate(r.created_at)}
                    </p>
                    {r.reason && (
                      <p className="mt-1 text-xs italic text-slate-600 dark:text-slate-400">
                        "{r.reason}"
                      </p>
                    )}
                    {r.manager_note && (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold">Sizin notunuz:</span>{" "}
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
                  {canDecide && (
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setDecisionFor(r);
                          setDecisionMode("reject");
                        }}
                        className="gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reddet
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setDecisionFor(r);
                          setDecisionMode("approve");
                        }}
                        className="gap-1.5"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {r.request_type === "loan"
                          ? "Onayla & Admine İlet"
                          : "Onayla"}
                      </Button>
                    </div>
                  )}
                  {isLoanPendingAdmin && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                      <FileSignature className="h-3.5 w-3.5" />
                      Admin onayı bekliyor
                    </span>
                  )}
                </div>
              </motion.li>
            );
          })}
        </motion.ul>
      )}

      <DecisionDialog
        request={decisionFor}
        mode={decisionMode}
        onClose={() => {
          setDecisionFor(null);
          setDecisionMode(null);
        }}
        onDone={() => {
          setDecisionFor(null);
          setDecisionMode(null);
          load();
        }}
      />

      <RepaymentDialog
        employees={employees}
        initial={repaymentFor}
        onClose={() => setRepaymentFor(null)}
        onDone={() => {
          setRepaymentFor(null);
          load();
        }}
      />
    </div>
  );
}

function DecisionDialog({
  request,
  mode,
  onClose,
  onDone,
}: {
  request: RequestRow | null;
  mode: "approve" | "reject" | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (request) {
      setNote("");
      setError(null);
    }
  }, [request?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request || !mode) return;
    setSubmitting(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("finance_manager_decide", {
      p_request_id: request.id,
      p_decision: mode,
      p_note: note,
    });
    setSubmitting(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    onDone();
  };

  const isApprove = mode === "approve";
  const title = isApprove
    ? request?.request_type === "loan"
      ? "Onayla → Admine İlet"
      : "Avansı Onayla"
    : "Talebi Reddet";

  return (
    <Dialog
      open={request !== null && mode !== null}
      onOpenChange={(next) => !next && onClose()}
      title={title}
      description={
        request
          ? `${request.employee?.full_name ?? "—"} · ${TYPE_LABEL[request.request_type]} · ${formatTRY(request.amount)}`
          : ""
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="decision-note">Not {isApprove ? "(opsiyonel)" : "(gerekçe)"}</Label>
          <Textarea
            id="decision-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              isApprove ? "Onay notu…" : "Red gerekçesi…"
            }
            disabled={submitting}
          />
        </div>
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
            onClick={onClose}
            disabled={submitting}
          >
            Vazgeç
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className={cn(
              "gap-1.5",
              !isApprove &&
                "bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500",
            )}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isApprove ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {isApprove ? "Onayla" : "Reddet"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function RepaymentDialog({
  employees,
  initial,
  onClose,
  onDone,
}: {
  employees: Employee[];
  initial: Employee | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [employeeId, setEmployeeId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial) {
      setEmployeeId(initial.id);
      setAmount("");
      setNote("");
      setError(null);
    }
  }, [initial?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setError("Geçerli bir tutar girin");
      return;
    }
    if (!employeeId) {
      setError("Çalışan seçin");
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("finance_add_repayment", {
      p_employee_id: employeeId,
      p_amount: n,
      p_note: note,
    });
    setSubmitting(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    onDone();
  };

  return (
    <Dialog
      open={initial !== null}
      onOpenChange={(next) => !next && onClose()}
      title="Ödeme Gir"
      description="Borç defterine kredi (ödeme) kaydı ekle. Bakiye otomatik düşer."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="repay-employee">Çalışan</Label>
          <select
            id="repay-employee"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="flex h-10 w-full rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/60 dark:text-white"
            disabled={submitting}
          >
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.full_name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="repay-amount">Tutar (₺)</Label>
          <Input
            id="repay-amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            disabled={submitting}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="repay-note">Not</Label>
          <Textarea
            id="repay-note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="örn. Şubat bordro kesintisi"
            disabled={submitting}
          />
        </div>
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
            onClick={onClose}
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
            Kaydet
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

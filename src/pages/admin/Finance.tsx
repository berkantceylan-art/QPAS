import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  FileSignature,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Dialog } from "@/components/ui/Dialog";
import { PORTALS } from "@/lib/portals";
import { supabase, type FinancialRequest } from "@/lib/supabase";
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
  company?: { id: string; name: string } | null;
};

export default function AdminFinance() {
  const admin = PORTALS.admin;
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decisionFor, setDecisionFor] = useState<RequestRow | null>(null);
  const [decisionMode, setDecisionMode] = useState<"approve" | "reject" | null>(
    null,
  );
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    let query = supabase
      .from("financial_requests")
      .select(
        "*, employee:employees(id,full_name), company:companies(id,name)",
      )
      .eq("request_type", "loan")
      .order("created_at", { ascending: false });
    if (!showAll) {
      query = query.eq("status", "pending_admin");
    }
    const { data, error: fetchError } = await query;
    if (fetchError) setError(fetchError.message);
    setRequests((data as RequestRow[]) ?? []);
    setLoading(false);
  }, [showAll]);

  useEffect(() => {
    load();
  }, [load]);

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
            Senet Onayları
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Firma yöneticisi tarafından ilk onayı verilmiş senetli borç
            taleplerine ikinci onay verin.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll((v) => !v)}
            className="gap-1.5"
          >
            {showAll ? "Sadece Bekleyen" : "Tümünü Göster"}
          </Button>
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
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500 dark:text-slate-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Yükleniyor…
        </div>
      ) : requests.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white/40 p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
          {showAll
            ? "Hiç senetli borç talebi yok."
            : "Şu an onay bekleyen senetli borç yok."}
        </p>
      ) : (
        <motion.ul
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="space-y-2"
        >
          {requests.map((r) => {
            const canDecide = r.status === "pending_admin";
            return (
              <motion.li
                key={r.id}
                variants={cardReveal}
                className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3.5 shadow-sm dark:border-white/10 dark:bg-slate-900/60"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <FileSignature className="h-4 w-4 text-indigo-500" />
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {r.employee?.full_name ?? "—"}
                      </p>
                      <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-white/5 dark:text-slate-400">
                        <Building2 className="h-3 w-3" />
                        {r.company?.name ?? "—"}
                      </span>
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
                      <span className="ml-2 text-xs font-normal text-slate-500">
                        {r.installments} taksit ·{" "}
                        {formatTRY(r.monthly_deduction)}/ay
                      </span>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {TYPE_LABEL[r.request_type]} · Oluşturuldu{" "}
                      {formatDate(r.created_at)}
                    </p>
                    {r.reason && (
                      <p className="mt-1 text-xs italic text-slate-600 dark:text-slate-400">
                        "{r.reason}"
                      </p>
                    )}
                    {r.manager_note && (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold">Yönetici onayı:</span>{" "}
                        {r.manager_note}
                      </p>
                    )}
                    {r.admin_note && (
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold">Sizin notunuz:</span>{" "}
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
                        Nihai Onay
                      </Button>
                    </div>
                  )}
                </div>
              </motion.li>
            );
          })}
        </motion.ul>
      )}

      <AdminDecisionDialog
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
    </div>
  );
}

function AdminDecisionDialog({
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
    const { error: rpcError } = await supabase.rpc("finance_admin_decide", {
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

  return (
    <Dialog
      open={request !== null && mode !== null}
      onOpenChange={(next) => !next && onClose()}
      title={isApprove ? "Nihai Onay" : "Senedi Reddet"}
      description={
        request
          ? `${request.employee?.full_name ?? "—"} · ${request.company?.name ?? "—"} · ${formatTRY(request.amount)} / ${request.installments} taksit`
          : ""
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="admin-note">
            Not {isApprove ? "(opsiyonel)" : "(gerekçe)"}
          </Label>
          <Textarea
            id="admin-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              isApprove
                ? "Senet onay notu…"
                : "Red gerekçesi (çalışana gösterilir)…"
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

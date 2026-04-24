import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  LifeBuoy,
  Loader2,
  PhoneCall,
  RefreshCw,
  Siren,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Dialog } from "@/components/ui/Dialog";
import {
  supabase,
  type EmergencyKind,
  type EmergencyRequest,
} from "@/lib/supabase";
import { PORTALS } from "@/lib/portals";
import { cardReveal, staggerContainer } from "@/components/motion/variants";
import { cn } from "@/lib/utils";

type EmergencyRow = EmergencyRequest & {
  employee?: { id: string; full_name: string | null } | null;
};

const KIND_LABEL: Record<EmergencyKind, string> = {
  call_hr: "İK'yı Ara",
  help: "Yardım",
  sos: "SOS",
};

const KIND_ICON: Record<EmergencyKind, typeof PhoneCall> = {
  call_hr: PhoneCall,
  help: LifeBuoy,
  sos: Siren,
};

const KIND_TONE: Record<EmergencyKind, string> = {
  call_hr: "text-sky-500",
  help: "text-amber-500",
  sos: "text-rose-500",
};

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function ClientEmergency() {
  const client = PORTALS.client;
  const [rows, setRows] = useState<EmergencyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [resolveFor, setResolveFor] = useState<EmergencyRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    let query = supabase
      .from("emergency_requests")
      .select("*, employee:employees(id, full_name)")
      .order("resolved_at", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: false })
      .limit(100);
    if (!showAll) {
      query = query.is("resolved_at", null);
    }
    const { data, error: fetchError } = await query;
    if (fetchError) setError(fetchError.message);
    setRows((data as EmergencyRow[]) ?? []);
    setLoading(false);
  }, [showAll]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("client-emergency-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "emergency_requests" },
        () => {
          load();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const activeCount = useMemo(
    () => rows.filter((r) => r.resolved_at == null).length,
    [rows],
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
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            <AlertTriangle className="h-7 w-7 text-rose-500" />
            Acil Çağrılar
            {activeCount > 0 && (
              <span className="ml-2 rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-600 dark:text-rose-300">
                {activeCount} açık
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Çalışanlardan gelen acil çağrı ve yardım talepleri.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll((v) => !v)}
            className="gap-1.5"
          >
            {showAll ? "Sadece Açık" : "Tümünü Göster"}
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
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white/40 p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
          {showAll
            ? "Hiç çağrı yok."
            : "Şu an açık çağrı yok. Harika!"}
        </p>
      ) : (
        <motion.ul
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="space-y-2"
        >
          {rows.map((r) => {
            const Icon = KIND_ICON[r.kind];
            const resolved = r.resolved_at != null;
            return (
              <motion.li
                key={r.id}
                variants={cardReveal}
                className={cn(
                  "rounded-2xl border px-4 py-3.5 shadow-sm",
                  !resolved && r.kind === "sos"
                    ? "border-rose-300 bg-rose-50/60 dark:border-rose-500/40 dark:bg-rose-500/10"
                    : "border-slate-200/70 bg-white/80 dark:border-white/10 dark:bg-slate-900/60",
                )}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <Icon
                      className={cn("mt-0.5 h-5 w-5 flex-none", KIND_TONE[r.kind])}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {r.employee?.full_name ?? "—"}
                        </p>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                            r.kind === "sos"
                              ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                              : r.kind === "help"
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                : "bg-sky-500/10 text-sky-700 dark:text-sky-300",
                          )}
                        >
                          {KIND_LABEL[r.kind]}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                            resolved
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : "bg-amber-500/10 text-amber-700 dark:text-amber-300",
                          )}
                        >
                          {resolved ? "Çözüldü" : "Açık"}
                        </span>
                      </div>
                      {r.note && (
                        <p className="mt-1 text-sm italic text-slate-700 dark:text-slate-200">
                          "{r.note}"
                        </p>
                      )}
                      {r.resolution_note && (
                        <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                          <span className="font-semibold">Çözüm notu:</span>{" "}
                          {r.resolution_note}
                        </p>
                      )}
                      <p className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <Clock className="h-3 w-3" />
                        {formatDate(r.created_at)}
                      </p>
                    </div>
                  </div>
                  {!resolved && (
                    <Button
                      size="sm"
                      onClick={() => setResolveFor(r)}
                      className="shrink-0 gap-1.5"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Çözüldü İşaretle
                    </Button>
                  )}
                </div>
              </motion.li>
            );
          })}
        </motion.ul>
      )}

      <ResolveDialog
        target={resolveFor}
        onClose={() => setResolveFor(null)}
        onDone={() => {
          setResolveFor(null);
          load();
        }}
      />
    </div>
  );
}

function ResolveDialog({
  target,
  onClose,
  onDone,
}: {
  target: EmergencyRow | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (target) {
      setNote("");
      setError(null);
    }
  }, [target?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    setSubmitting(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("emergency_resolve", {
      p_id: target.id,
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
      open={target !== null}
      onOpenChange={(next) => !next && onClose()}
      title="Çağrıyı Çözüldü İşaretle"
      description={
        target
          ? `${target.employee?.full_name ?? "—"} · ${KIND_LABEL[target.kind]}`
          : ""
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="resolve-note">Çözüm notu (opsiyonel)</Label>
          <Textarea
            id="resolve-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Neyin yapıldığını kısaca yaz…"
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
            Çözüldü
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

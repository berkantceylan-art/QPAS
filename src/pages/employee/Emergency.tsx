import { useCallback, useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/Textarea";
import { useAuth } from "@/hooks/useAuth";
import {
  supabase,
  type EmergencyKind,
  type EmergencyRequest,
} from "@/lib/supabase";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<EmergencyKind, string> = {
  call_hr: "İK'yı Ara",
  help: "Yardım",
  sos: "SOS",
};

const KIND_DESC: Record<EmergencyKind, string> = {
  call_hr: "Genel görüşme / geri arama talebi",
  help: "Acil olmayan destek / soru",
  sos: "Acil durum / güvenlik / tıbbi",
};

const KIND_STYLE: Record<EmergencyKind, string> = {
  call_hr: "from-sky-500 to-blue-500",
  help: "from-amber-500 to-orange-500",
  sos: "from-rose-500 to-red-600",
};

const KIND_ICON: Record<EmergencyKind, typeof PhoneCall> = {
  call_hr: PhoneCall,
  help: LifeBuoy,
  sos: Siren,
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

export default function EmployeeEmergency() {
  const { user } = useAuth();
  const [history, setHistory] = useState<EmergencyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<EmergencyKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("emergency_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    if (fetchError) setError(fetchError.message);
    setHistory((data as EmergencyRequest[]) ?? []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (kind: EmergencyKind) => {
    const isSos = kind === "sos";
    if (
      isSos &&
      !confirm(
        "SOS göndermek üzeresin. Bu, yöneticini anında uyarır. Devam edilsin mi?",
      )
    ) {
      return;
    }
    setSubmitting(kind);
    setError(null);
    setSuccess(null);
    const { error: rpcError } = await supabase.rpc("emergency_submit", {
      p_kind: kind,
      p_note: note,
    });
    setSubmitting(null);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setSuccess(
      `${KIND_LABEL[kind]} gönderildi. Yöneticine anında bildirildi.`,
    );
    setNote("");
    setTimeout(() => setSuccess(null), 4000);
    load();
  };

  const activeCount = history.filter((h) => h.resolved_at == null).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-600 dark:text-rose-400">
            Modül
          </p>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            <AlertTriangle className="h-7 w-7 text-rose-500" />
            Acil Çağrı
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Tek dokunuşla yöneticine ulaş. SOS anında bildirim gönderir.
          </p>
        </div>
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

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" />
          <span>{success}</span>
        </motion.div>
      )}

      <section className="space-y-3">
        <label htmlFor="em-note" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Not (opsiyonel)
        </label>
        <Textarea
          id="em-note"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Kısa açıklama (örn. konum, durum)…"
          disabled={submitting !== null}
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {(["call_hr", "help", "sos"] as EmergencyKind[]).map((kind) => {
          const Icon = KIND_ICON[kind];
          const isSubmitting = submitting === kind;
          return (
            <button
              key={kind}
              type="button"
              onClick={() => submit(kind)}
              disabled={submitting !== null}
              className={cn(
                "group relative overflow-hidden rounded-2xl border-2 border-transparent p-5 text-left text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-100 disabled:cursor-not-allowed disabled:opacity-60",
                `bg-gradient-to-br ${KIND_STYLE[kind]}`,
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-white/75">
                    Tek dokunuş
                  </p>
                  <p className="mt-1 text-2xl font-bold">{KIND_LABEL[kind]}</p>
                  <p className="mt-1 text-xs text-white/80">
                    {KIND_DESC[kind]}
                  </p>
                </div>
                <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-white/20 ring-2 ring-white/30">
                  {isSubmitting ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Icon className="h-6 w-6" />
                  )}
                </span>
              </div>
            </button>
          );
        })}
      </section>

      {(history.length > 0 || loading) && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Geçmiş
            {activeCount > 0 && (
              <span className="ml-2 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-300">
                {activeCount} açık
              </span>
            )}
          </h2>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-slate-500 dark:text-slate-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Yükleniyor…
            </div>
          ) : (
            <ul className="space-y-2">
              {history.map((h) => {
                const Icon = KIND_ICON[h.kind];
                const resolved = h.resolved_at != null;
                return (
                  <li
                    key={h.id}
                    className="flex items-start gap-3 rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2.5 text-sm dark:border-white/10 dark:bg-slate-900/60"
                  >
                    <Icon
                      className={cn(
                        "mt-0.5 h-4 w-4 flex-none",
                        h.kind === "sos"
                          ? "text-rose-500"
                          : h.kind === "help"
                            ? "text-amber-500"
                            : "text-sky-500",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {KIND_LABEL[h.kind]}
                      </p>
                      {h.note && (
                        <p className="mt-0.5 text-xs italic text-slate-500 dark:text-slate-400">
                          "{h.note}"
                        </p>
                      )}
                      {h.resolution_note && (
                        <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                          <span className="font-semibold">Yanıt:</span>{" "}
                          {h.resolution_note}
                        </p>
                      )}
                      <p className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <Clock className="h-3 w-3" />
                        {formatDate(h.created_at)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                        resolved
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : "bg-amber-500/10 text-amber-700 dark:text-amber-300",
                      )}
                    >
                      {resolved ? "Çözüldü" : "Açık"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

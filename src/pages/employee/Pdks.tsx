import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  Moon,
  QrCode,
  ScanLine,
  Sun,
  TrendingUp,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import {
  supabase,
  type AttendanceLog,
  type AttendanceLogType,
  type AttendanceMethod,
  type Employee,
  type PeriodHours,
} from "@/lib/supabase";
import { cardReveal, staggerContainer } from "@/components/motion/variants";
import { cn } from "@/lib/utils";

type RecordResponse = {
  id: string;
  log_type: AttendanceLogType;
  branch_id: string | null;
  logged_at: string;
  worked_minutes: number | null;
  distance_m: number | null;
};

const METHOD_ICON: Record<AttendanceMethod, typeof QrCode> = {
  gps: MapPin,
  qr: QrCode,
  device: ScanLine,
  manual: Clock,
};

const METHOD_LABEL: Record<AttendanceMethod, string> = {
  gps: "GPS",
  qr: "QR",
  device: "Cihaz",
  manual: "Manuel",
};

function formatTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatDuration(minutes: number | null) {
  if (minutes == null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}s ${m}d`;
}

function getWeekRange(): { from: Date; to: Date } {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const from = new Date(now);
  from.setDate(now.getDate() + diffToMonday);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(from.getDate() + 7);
  return { from, to };
}

export default function EmployeePdks() {
  const { user } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [weekSummary, setWeekSummary] = useState<PeriodHours | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    const { data: emp } = await supabase
      .from("employees")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    setEmployee((emp as Employee) ?? null);
    if (emp) {
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      const { data: logRows } = await supabase
        .from("attendance_logs")
        .select("*")
        .eq("employee_id", emp.id)
        .gte("logged_at", since.toISOString())
        .order("logged_at", { ascending: false });
      setLogs((logRows as AttendanceLog[]) ?? []);

      const week = getWeekRange();
      const { data: summary } = await supabase.rpc("calculate_period_hours", {
        p_employee_id: emp.id,
        p_from: week.from.toISOString(),
        p_to: week.to.toISOString(),
      });
      if (summary && summary.length > 0) {
        setWeekSummary(summary[0] as PeriodHours);
      } else {
        setWeekSummary(null);
      }
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const lastLog = logs[0];
  const nextLogType: AttendanceLogType =
    lastLog?.log_type === "in" ? "out" : "in";

  const submitRecord = async (
    method: AttendanceMethod,
    payload: Record<string, unknown>,
  ) => {
    setSubmitting(true);
    setError(null);
    setFlash(null);
    const body = { method, log_type: nextLogType, ...payload };
    const { data, error: invokeError } =
      await supabase.functions.invoke<RecordResponse>("pdks-record", { body });
    setSubmitting(false);
    if (invokeError) {
      let msg = invokeError.message || "Kayıt başarısız";
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
          /* not json */
        }
      }
      setError(msg);
      return;
    }
    if (!data) {
      setError("Beklenmeyen yanıt");
      return;
    }
    setFlash(
      data.log_type === "in"
        ? "Giriş kaydedildi."
        : `Çıkış kaydedildi${
            data.worked_minutes != null
              ? ` · ${formatDuration(data.worked_minutes)}`
              : ""
          }.`,
    );
    setTimeout(() => setFlash(null), 3500);
    await loadData();
  };

  const handleGps = () => {
    if (!navigator.geolocation) {
      setError("Tarayıcınız konum desteğini sağlamıyor.");
      return;
    }
    setSubmitting(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSubmitting(false);
        submitRecord("gps", {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        setSubmitting(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Konum izni reddedildi. Tarayıcı ayarlarından açabilirsin."
            : "Konum alınamadı.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );
  };

  const handleQrScanned = (qrToken: string) => {
    setScannerOpen(false);
    submitRecord("qr", { qr_token: qrToken });
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
        Bu hesaba bağlı bir çalışan kaydı yok. Firma yöneticinize başvurun.
      </div>
    );
  }

  const now = new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  const todayDate = new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const isIn = lastLog?.log_type === "in";

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400">
          Mobil PDKS
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
          Giriş / Çıkış
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {todayDate} · şu an {now}
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/60"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500"
        />

        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Durum
              </p>
              <p
                className={cn(
                  "mt-0.5 text-lg font-bold",
                  isIn
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-slate-500 dark:text-slate-300",
                )}
              >
                {isIn
                  ? `Vardiyada · ${formatTime(lastLog.logged_at)}'de giriş`
                  : lastLog
                    ? `Çıkış yapıldı · ${formatTime(lastLog.logged_at)}`
                    : "Henüz kayıt yok"}
              </p>
            </div>
            <div
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-2xl",
                isIn
                  ? "bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg"
                  : "bg-slate-100 text-slate-400 dark:bg-white/5",
              )}
            >
              <Clock className="h-7 w-7" strokeWidth={2} />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
              <span>{error}</span>
            </div>
          )}
          {flash && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
            >
              <CheckCircle2 className="h-4 w-4 flex-none" />
              <span>{flash}</span>
            </motion.div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              size="lg"
              className={cn(
                "h-auto w-full gap-2 py-4 text-base font-bold shadow-lg border-0 text-white",
                nextLogType === "in"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                  : "bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600",
              )}
              onClick={handleGps}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : nextLogType === "in" ? (
                <LogIn className="h-5 w-5" />
              ) : (
                <LogOut className="h-5 w-5" />
              )}
              GPS ile {nextLogType === "in" ? "Giriş" : "Çıkış"}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-auto w-full gap-2 border-2 border-slate-300 py-4 text-base font-bold dark:border-white/10"
              onClick={() => setScannerOpen(true)}
              disabled={submitting}
            >
              <ScanLine className="h-5 w-5" />
              QR Tara
            </Button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <MapPin className="h-3.5 w-3.5 text-orange-400" />
            Konum ve QR doğrulaması sunucu tarafında yapılır.
          </div>
        </div>
      </motion.div>

      {weekSummary && weekSummary.total_minutes > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/60"
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Bu Hafta
              </p>
              <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-white">
                {formatDuration(weekSummary.effective_minutes)}{" "}
                <span className="text-sm font-normal text-slate-500">
                  efektif
                </span>
              </p>
            </div>
            <span
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl",
                weekSummary.overtime_minutes > 0
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
              )}
            >
              <TrendingUp className="h-5 w-5" />
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryStat
              label="Toplam"
              value={formatDuration(weekSummary.total_minutes)}
              icon={<Clock className="h-3.5 w-3.5" />}
              tone="slate"
            />
            <SummaryStat
              label="Gündüz"
              value={formatDuration(weekSummary.day_minutes)}
              icon={<Sun className="h-3.5 w-3.5" />}
              tone="sky"
            />
            <SummaryStat
              label="Gece ×1.5"
              value={formatDuration(weekSummary.night_minutes)}
              icon={<Moon className="h-3.5 w-3.5" />}
              tone="indigo"
            />
            <SummaryStat
              label="Mesai"
              value={formatDuration(weekSummary.overtime_minutes)}
              icon={<TrendingUp className="h-3.5 w-3.5" />}
              tone={weekSummary.overtime_minutes > 0 ? "amber" : "slate"}
            />
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Gece 22:00-06:00 saatleri ×1.5 katsayıyla, haftalık 45 saat üstü
            mesai sayılır.
          </p>
        </motion.div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          Bugünkü Kayıtlar
        </h2>
        {logs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-white/40 p-6 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
            Bugün henüz bir kayıt yok.
          </p>
        ) : (
          <motion.ul
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="space-y-2"
          >
            {logs.map((log) => {
              const Icon = METHOD_ICON[log.method];
              const isInLog = log.log_type === "in";
              return (
                <motion.li
                  key={log.id}
                  variants={cardReveal}
                  className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-white/80 px-4 py-3 shadow-sm dark:border-white/10 dark:bg-slate-900/60"
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 flex-none items-center justify-center rounded-lg text-white shadow-sm",
                      isInLog
                        ? "bg-gradient-to-br from-emerald-500 to-teal-500"
                        : "bg-gradient-to-br from-rose-500 to-pink-500",
                    )}
                  >
                    {isInLog ? (
                      <LogIn className="h-4 w-4" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {isInLog ? "Giriş" : "Çıkış"}
                    </p>
                    <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Icon className="h-3 w-3" /> {METHOD_LABEL[log.method]}
                      {log.distance_m != null && (
                        <span className="text-slate-400">
                          · {Math.round(Number(log.distance_m))}m
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
                      {formatTime(log.logged_at)}
                    </p>
                    {log.worked_minutes != null && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        {formatDuration(log.worked_minutes)}
                      </p>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </div>

      {scannerOpen && (
        <QrScannerSheet
          onClose={() => setScannerOpen(false)}
          onScanned={handleQrScanned}
        />
      )}
    </div>
  );
}

function SummaryStat({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "slate" | "sky" | "indigo" | "amber";
}) {
  const toneClasses = {
    slate: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
    sky: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    indigo: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  };
  return (
    <div className="rounded-lg border border-slate-200/70 bg-white/60 px-3 py-2 dark:border-white/10 dark:bg-white/5">
      <p
        className={cn(
          "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
          toneClasses[tone],
        )}
      >
        {icon}
        {label}
      </p>
      <p className="mt-1 font-mono text-sm font-semibold text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function QrScannerSheet({
  onClose,
  onScanned,
}: {
  onClose: () => void;
  onScanned: (token: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (!mounted || !containerRef.current) return;
        const container = containerRef.current;
        container.id = container.id || "qr-scanner-" + Date.now();
        const scanner = new Html5Qrcode(container.id);
        scannerRef.current = {
          stop: () => scanner.stop(),
          clear: () => scanner.clear(),
        };
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decoded) => {
            if (!mounted) return;
            onScanned(decoded);
          },
          () => {
            // per-frame errors — ignore
          },
        );
      } catch (e) {
        setError(
          (e as Error).message ||
            "Kamera açılamadı. Tarayıcı izinlerini kontrol edin.",
        );
      }
    })();
    return () => {
      mounted = false;
      const s = scannerRef.current;
      if (s) {
        s.stop()
          .then(() => s.clear())
          .catch(() => {
            /* ignore */
          });
      }
    };
  }, [onScanned]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Kapat"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-t-2xl border-t border-slate-200/70 bg-white p-4 shadow-2xl dark:border-white/10 dark:bg-slate-900 sm:rounded-2xl sm:border">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-slate-900 dark:text-white">
              QR Kod Tara
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Kamerayı şube QR kodunun üstüne doğrultun.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {error ? (
          <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            <XCircle className="mt-0.5 h-4 w-4 flex-none" />
            <span>{error}</span>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-xl bg-slate-950">
            <div
              ref={containerRef}
              className="aspect-square w-full"
            />
            <div className="pointer-events-none absolute inset-8 rounded-lg border-2 border-white/40" />
          </div>
        )}
      </div>
    </div>
  );
}

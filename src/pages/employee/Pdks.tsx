import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  QrCode,
  SmartphoneNfc,
  XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import {
  useAttendanceLog,
  useLastCheckStatus,
  performCheckIn,
} from "@/hooks/useAttendance";
import type { AttendanceRecord } from "@/lib/supabase";

type CheckInState = "idle" | "locating" | "success" | "error";

export default function EmployeePdks() {
  const { user, profile } = useAuth();
  const { records, loading: logLoading, refetch: refetchLog } = useAttendanceLog(user?.id);
  const {
    isCheckedIn,
    setIsCheckedIn,
    loading: statusLoading,
    refetch: refetchStatus,
  } = useLastCheckStatus(user?.id);

  const [state, setState] = useState<CheckInState>("idle");
  const [lastAction, setLastAction] = useState<"Giriş" | "Çıkış">("Giriş");
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const now = new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  function handleCheckIn() {
    if (!user) return;
    setState("locating");
    setErrorMsg(null);
    if (!navigator.geolocation) {
      setState("error");
      setErrorMsg("Tarayıcınız konum özelliğini desteklemiyor.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const locLabel = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        const actionType = isCheckedIn ? "out" : "in";
        const actionLabel = isCheckedIn ? "Çıkış" : "Giriş";

        try {
          await performCheckIn({
            userId: user.id,
            type: actionType,
            method: "geo",
            latitude,
            longitude,
            locationLabel: locLabel,
            actorName: profile?.full_name || user.email || "Çalışan",
          });

          setLocationLabel(locLabel);
          setLastAction(actionLabel);
          setState("success");
          setIsCheckedIn(!isCheckedIn);

          // Refresh logs
          await refetchLog();
          await refetchStatus();
        } catch (err) {
          setState("error");
          setErrorMsg(
            err instanceof Error
              ? err.message
              : "Kayıt oluşturulamadı. Tekrar deneyin.",
          );
        }
      },
      () => {
        setState("error");
        setErrorMsg(
          "Konuma erişilemedi. Tarayıcı izinlerini kontrol edin veya QR kodla devam edin.",
        );
      },
      { timeout: 8000 },
    );
  }

  function formatRecordTime(iso: string) {
    return new Date(iso).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatRecordDate(iso: string) {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return "Bugün";
    if (d.toDateString() === yesterday.toDateString()) return "Dün";
    return d.toLocaleDateString("tr-TR", { weekday: "long" });
  }

  function methodLabel(method: AttendanceRecord["method"]) {
    switch (method) {
      case "qr":
        return "QR";
      case "nfc":
        return "NFC";
      case "geo":
        return "Konum";
      case "manual":
        return "Manuel";
    }
  }

  const isLoading = logLoading || statusLoading;

  return (
    <div className="mx-auto max-w-md space-y-6">
      {/* Current time */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400">
          Anlık Saat
        </p>
        <p className="mt-1 text-5xl font-extrabold tracking-tighter text-slate-900 dark:text-white">
          {now}
        </p>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {new Intl.DateTimeFormat("tr-TR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          }).format(new Date())}
        </p>
      </motion.div>

      {/* Check-in button */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="rounded-2xl border border-slate-200/70 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/60"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-rose-500 text-white shadow-sm ring-1 ring-white/20">
            <SmartphoneNfc className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Konum ile {isCheckedIn ? "Çıkış" : "Giriş"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              GPS konumunuz doğrulanacak
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleCheckIn}
          disabled={state === "locating" || isLoading}
          className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white shadow-lg transition-all ${
            isCheckedIn
              ? "bg-gradient-to-r from-rose-500 to-orange-500 shadow-rose-500/25 hover:shadow-rose-500/40"
              : "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/25 hover:shadow-emerald-500/40"
          } disabled:opacity-60`}
        >
          {state === "locating" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Konum alınıyor…
            </>
          ) : isCheckedIn ? (
            <>
              <MapPin className="h-4 w-4" />
              Çıkış Yap
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4" />
              Giriş Yap
            </>
          )}
        </button>

        <AnimatePresence mode="wait">
          {state === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 overflow-hidden"
            >
              <div
                className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              >
                <CheckCircle2 className="h-4 w-4" />
                {lastAction} kaydedildi!
                {locationLabel && (
                  <span className="text-xs text-emerald-600/70 dark:text-emerald-400/70">
                    {" "}({locationLabel})
                  </span>
                )}
              </div>
            </motion.div>
          )}
          {state === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 overflow-hidden"
            >
              <div className="flex items-start gap-2 rounded-lg bg-rose-50 px-4 py-2.5 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                <XCircle className="mt-0.5 h-4 w-4 flex-none" />
                {errorMsg}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Alt yöntemler */}
        <div className="mt-5 flex items-center gap-3 border-t border-slate-200/60 pt-4 dark:border-white/10">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Diğer yöntemler:
          </p>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:border-white/20 dark:hover:bg-white/5"
          >
            <QrCode className="h-3.5 w-3.5" />
            QR Tara
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:border-white/20 dark:hover:bg-white/5"
          >
            <SmartphoneNfc className="h-3.5 w-3.5" />
            NFC
          </button>
        </div>
      </motion.div>

      {/* Log */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="rounded-2xl border border-slate-200/70 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/60"
      >
        <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
          Geçmiş Kayıtlar
        </h2>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Son {records.length} hareket
        </p>

        {logLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : records.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
            Henüz PDKS kaydı yok
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-200/70 dark:divide-white/10">
            {records.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span
                  className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg text-white shadow-sm ring-1 ring-white/20 ${
                    r.type === "in"
                      ? "bg-gradient-to-br from-emerald-500 to-teal-500"
                      : "bg-gradient-to-br from-rose-500 to-orange-500"
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" strokeWidth={2.5} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {r.type === "in" ? "Giriş" : "Çıkış"}{" "}
                    <span className="font-normal text-slate-500 dark:text-slate-400">
                      — {formatRecordTime(r.created_at)}
                    </span>
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {methodLabel(r.method)}
                    {r.location_label ? ` · ${r.location_label}` : ""}
                  </p>
                </div>
                <span className="whitespace-nowrap text-xs text-slate-400 dark:text-slate-500">
                  {formatRecordDate(r.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </motion.section>
    </div>
  );
}

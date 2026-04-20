import { useState, useEffect } from "react";
import {
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  QrCode,
  SmartphoneNfc,
  XCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { cardReveal, staggerContainer } from "@/components/motion/variants";

type CheckInState = "idle" | "locating" | "success" | "error";

type LogEntry = {
  type: "Giriş" | "Çıkış";
  time: string;
  method: string;
  location: string;
};

const MOCK_LOG: LogEntry[] = [
  { type: "Giriş", time: "08:52", method: "QR", location: "İstanbul, Şişli" },
  { type: "Çıkış", time: "18:05", method: "QR", location: "İstanbul, Şişli" },
  { type: "Giriş", time: "09:01", method: "Konum", location: "İstanbul, Şişli" },
  { type: "Çıkış", time: "17:58", method: "Konum", location: "İstanbul, Şişli" },
  { type: "Giriş", time: "08:47", method: "QR", location: "İstanbul, Şişli" },
];

const LOG_DATES = ["Bugün", "Dün", "Pazartesi", "Cuma", "Perşembe"];

export default function EmployeePdks() {
  useAuth();
  const [state, setState] = useState<CheckInState>("idle");
  const [checkedIn, setCheckedIn] = useState(true);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const now = new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  function handleCheckIn() {
    setState("locating");
    setErrorMsg(null);
    if (!navigator.geolocation) {
      setState("error");
      setErrorMsg("Tarayıcınız konum özelliğini desteklemiyor.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocationLabel(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        setState("success");
        setCheckedIn((v) => !v);
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

  useEffect(() => {
    if (state === "success") {
      const t = setTimeout(() => setState("idle"), 3000);
      return () => clearTimeout(t);
    }
  }, [state]);

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
          QR kod tara veya konum doğrulamasıyla kaydet.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: action card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 p-8 shadow-sm dark:border-white/10 dark:bg-slate-900/60"
        >
          {/* gradient accent */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500"
          />

          <div className="flex flex-col items-center gap-6 text-center">
            {/* QR mockup */}
            <div className="relative">
              <div className="flex h-36 w-36 items-center justify-center rounded-2xl border-2 border-dashed border-orange-300 bg-orange-50/60 dark:border-orange-500/40 dark:bg-orange-500/5">
                <QrCode
                  className="h-20 w-20 text-orange-400 dark:text-orange-500"
                  strokeWidth={1.25}
                />
              </div>
              <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-rose-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                QR
              </span>
            </div>

            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Şu an saat{" "}
                <span className="font-semibold text-slate-900 dark:text-white">
                  {now}
                </span>
              </p>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                Durum:{" "}
                <span
                  className={`font-semibold ${checkedIn ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
                >
                  {checkedIn ? "Vardiyada" : "Çıkış yapıldı"}
                </span>
              </p>
            </div>

            {/* Feedback */}
            {state === "locating" && (
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                Konum alınıyor…
              </div>
            )}
            {state === "success" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              >
                <CheckCircle2 className="h-4 w-4" />
                {checkedIn ? "Giriş" : "Çıkış"} kaydedildi!
                {locationLabel && (
                  <span className="text-xs text-emerald-600/70 dark:text-emerald-400/70">
                    {" "}({locationLabel})
                  </span>
                )}
              </motion.div>
            )}
            {state === "error" && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-left text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                <XCircle className="mt-0.5 h-4 w-4 flex-none" />
                {errorMsg}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex w-full flex-col gap-3">
              <Button
                size="lg"
                className={`w-full bg-gradient-to-r ${checkedIn ? "from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600" : "from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"} border-0 text-white shadow-lg`}
                onClick={handleCheckIn}
                disabled={state === "locating"}
              >
                {state === "locating" ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Konum alınıyor…</>
                ) : checkedIn ? (
                  <><Clock className="h-4 w-4" /> Çıkış Yap</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4" /> Giriş Yap</>
                )}
              </Button>
              <Button variant="outline" size="sm" className="w-full gap-2" disabled>
                <SmartphoneNfc className="h-4 w-4" />
                NFC ile Tara
                <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-white/10 dark:text-slate-400">
                  Yakında
                </span>
              </Button>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <MapPin className="h-3.5 w-3.5 text-orange-400" />
              Konum doğrulaması etkin — geofence yarıçapı: 500m
            </div>
          </div>
        </motion.div>

        {/* Right: log */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="space-y-3"
        >
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Son Kayıtlar
          </h2>
          {MOCK_LOG.map((entry, i) => (
            <motion.div
              key={i}
              variants={cardReveal}
              className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-white/80 px-4 py-3 shadow-sm dark:border-white/10 dark:bg-slate-900/60"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-sm ring-1 ring-white/20 ${entry.type === "Giriş" ? "bg-gradient-to-br from-amber-500 to-orange-500" : "bg-gradient-to-br from-rose-500 to-pink-500"}`}
                >
                  <Clock className="h-4 w-4" strokeWidth={2.25} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {entry.type}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {entry.method} · {entry.location}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {entry.time}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {LOG_DATES[i]}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

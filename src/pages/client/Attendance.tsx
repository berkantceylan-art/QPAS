import { useCallback, useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Building,
  Clock,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  QrCode,
  RefreshCw,
  ScanLine,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { cardReveal, staggerContainer } from "@/components/motion/variants";
import { PORTALS } from "@/lib/portals";
import {
  supabase,
  type AttendanceLog,
  type AttendanceMethod,
  type Branch,
} from "@/lib/supabase";
import { cn } from "@/lib/utils";

type LogRow = AttendanceLog & {
  employee?: { id: string; full_name: string } | null;
  branch?: { id: string; name: string } | null;
};

type QrTokenResponse = {
  token: string;
  branch_id: string;
  branch_name: string;
  bucket: number;
  expires_at: number;
  bucket_seconds: number;
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

export default function Attendance() {
  const client = PORTALS.client;
  const [branches, setBranches] = useState<Branch[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string>("");
  const [qrToken, setQrToken] = useState<QrTokenResponse | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const [brs, lgs] = await Promise.all([
      supabase.from("branches").select("*").order("name"),
      supabase
        .from("attendance_logs")
        .select(
          "*, employee:employees(id,full_name), branch:branches(id,name)",
        )
        .gte("logged_at", since.toISOString())
        .order("logged_at", { ascending: false }),
    ]);
    if (brs.error) setError(brs.error.message);
    if (lgs.error && !brs.error) setError(lgs.error.message);
    const branchList = (brs.data as Branch[]) ?? [];
    setBranches(branchList);
    setLogs((lgs.data as LogRow[]) ?? []);
    if (!branchId) {
      const withCoords = branchList.find(
        (b) => b.latitude != null && b.longitude != null,
      );
      if (withCoords) setBranchId(withCoords.id);
    }
    setLoading(false);
  }, [branchId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const refreshQrToken = useCallback(async () => {
    if (!branchId) {
      setQrToken(null);
      return;
    }
    setQrLoading(true);
    const { data, error: invokeError } =
      await supabase.functions.invoke<QrTokenResponse>("pdks-qr-token", {
        body: { branch_id: branchId },
      });
    setQrLoading(false);
    if (invokeError) {
      setError(invokeError.message);
      return;
    }
    if (!data) return;
    setQrToken(data);
  }, [branchId]);

  useEffect(() => {
    refreshQrToken();
    if (!branchId) return;
    const interval = setInterval(refreshQrToken, 25000);
    return () => clearInterval(interval);
  }, [branchId, refreshQrToken]);

  const groupedByEmployee = useMemo(() => {
    const map = new Map<string, LogRow[]>();
    for (const log of logs) {
      if (!log.employee) continue;
      const arr = map.get(log.employee.id) ?? [];
      arr.push(log);
      map.set(log.employee.id, arr);
    }
    return Array.from(map.entries()).map(([id, rows]) => ({
      id,
      name: rows[0].employee?.full_name ?? "—",
      rows,
      totalWorked: rows.reduce(
        (sum, r) => sum + (r.worked_minutes ?? 0),
        0,
      ),
    }));
  }, [logs]);

  const selectedBranch = branches.find((b) => b.id === branchId);
  const branchHasCoords =
    selectedBranch?.latitude != null && selectedBranch?.longitude != null;

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
            Devam
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Bugünkü giriş/çıkış kayıtları ve şube QR panosu.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchAll}
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

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Şube QR Panosu
            </h2>
            {qrToken && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {qrToken.bucket_seconds}sn'de bir yenilenir
              </span>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 p-5 dark:border-white/10 dark:bg-slate-900/60">
            {branches.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                Henüz şube tanımlı değil.{" "}
                <a
                  href="/client/organization"
                  className="font-semibold text-cyan-600 hover:underline dark:text-cyan-400"
                >
                  Organizasyon
                </a>{" "}
                sayfasından ekleyin.
              </p>
            ) : (
              <div className="space-y-4">
                <Select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                >
                  <option value="">— Şube seçin —</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                      {b.latitude == null && " (konumsuz)"}
                    </option>
                  ))}
                </Select>

                {!branchId ? (
                  <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                    QR kodu görüntülemek için bir şube seçin.
                  </p>
                ) : qrLoading && !qrToken ? (
                  <div className="flex items-center justify-center py-8 text-slate-500 dark:text-slate-400">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    QR yükleniyor…
                  </div>
                ) : qrToken ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="rounded-xl bg-white p-4 shadow-inner ring-1 ring-slate-200 dark:ring-white/10">
                      <QRCodeSVG
                        value={qrToken.token}
                        size={220}
                        level="M"
                        includeMargin={false}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {qrToken.branch_name}
                      </p>
                      <p className="mt-0.5 flex items-center justify-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <QrCode className="h-3 w-3" />
                        v1 · bucket {qrToken.bucket}
                      </p>
                    </div>
                    {!branchHasCoords && (
                      <div className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                        Bu şubenin GPS konumu tanımlı değil. Konumlu girişler
                        için Organizasyon &gt; Şubeler sayfasından koordinat
                        ekleyin.
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200/70 bg-white/60 p-3 text-xs text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
            <p className="mb-1 font-semibold text-slate-700 dark:text-slate-200">
              Nasıl kullanılır?
            </p>
            Bu QR'ı resepsiyonda bir ekranda açık tutun. Çalışanın mobil PDKS
            ekranındaki <strong>QR Tara</strong> butonu bu kodu okur ve
            30 saniye geçerliliği olan HMAC imzasını sunucuda doğrular.
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Bugün ({groupedByEmployee.length} çalışan, {logs.length} kayıt)
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500 dark:text-slate-400">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Yükleniyor…
            </div>
          ) : groupedByEmployee.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-white/40 p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
              Bugün henüz kayıt yok.
            </p>
          ) : (
            <motion.ul
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="space-y-2"
            >
              {groupedByEmployee.map((group) => (
                <motion.li
                  key={group.id}
                  variants={cardReveal}
                  className="rounded-xl border border-slate-200/70 bg-white/80 p-3 shadow-sm dark:border-white/10 dark:bg-slate-900/60"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {group.name}
                    </p>
                    <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                      {formatDuration(group.totalWorked)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.rows
                      .slice()
                      .reverse()
                      .map((log) => (
                        <span
                          key={log.id}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium",
                            log.log_type === "in"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : "bg-rose-500/10 text-rose-700 dark:text-rose-300",
                          )}
                          title={`${METHOD_LABEL[log.method]} · ${log.branch?.name ?? "—"}`}
                        >
                          {log.log_type === "in" ? (
                            <LogIn className="h-3 w-3" />
                          ) : (
                            <LogOut className="h-3 w-3" />
                          )}
                          {formatTime(log.logged_at)}
                          {log.method === "gps" ? (
                            <MapPin className="h-3 w-3 opacity-60" />
                          ) : log.method === "qr" ? (
                            <ScanLine className="h-3 w-3 opacity-60" />
                          ) : (
                            <Clock className="h-3 w-3 opacity-60" />
                          )}
                        </span>
                      ))}
                  </div>
                  {group.rows[0]?.branch?.name && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <Building className="h-3 w-3" />
                      {group.rows[0].branch.name}
                    </p>
                  )}
                </motion.li>
              ))}
            </motion.ul>
          )}
        </section>
      </div>
    </div>
  );
}

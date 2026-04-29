import {
  ArrowUpRight,
  CalendarCheck2,
  CheckCircle2,
  Clock,
  HandCoins,
  Loader2,
  SmartphoneNfc,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { cardReveal, staggerContainer } from "@/components/motion/variants";
import MiniChart from "@/components/portal/MiniChart";
import { useAuth } from "@/hooks/useAuth";
import { useEmployeeStats } from "@/hooks/useDashboardData";

type Kpi = {
  label: string;
  value: string;
  sub: string;
  tint: string;
  icon: LucideIcon;
};

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  pdks: CheckCircle2,
  request: CalendarCheck2,
  payroll: Wallet,
  system: Clock,
  user: CheckCircle2,
  role: CheckCircle2,
};

const CATEGORY_TINTS: Record<string, string> = {
  pdks: "from-amber-500 to-orange-500",
  request: "from-orange-500 to-rose-500",
  payroll: "from-pink-500 to-amber-500",
  system: "from-rose-500 to-pink-500",
  user: "from-amber-500 to-orange-500",
  role: "from-orange-500 to-rose-500",
};

function todayLabel() {
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date());
  } catch {
    return new Date().toLocaleDateString();
  }
}

function shiftStatus() {
  const hour = new Date().getHours();
  if (hour >= 8 && hour < 18)
    return { label: "Vardiyada", color: "bg-emerald-500" };
  return { label: "Vardiya Dışı", color: "bg-slate-400" };
}

function greeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Günaydın";
  if (hour >= 12 && hour < 18) return "İyi günler";
  if (hour >= 18 && hour < 22) return "İyi akşamlar";
  return "İyi geceler";
}

function formatWorkTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours} sa ${mins} dk`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Az önce";
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}

export default function EmployeeDashboard() {
  const { profile, user } = useAuth();
  const { data, loading } = useEmployeeStats(user?.id);

  const firstName =
    profile?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "Çalışan";
  const status = shiftStatus();

  const WEEKLY_TARGET = 40 * 60; // 40 hours in minutes

  const kpis: Kpi[] = data
    ? [
        {
          label: "Bu Haftaki Çalışma",
          value: formatWorkTime(data.weeklyMinutes),
          sub: `Hedef: 40 sa — %${Math.min(100, Math.round((data.weeklyMinutes / WEEKLY_TARGET) * 100))}`,
          tint: "from-amber-500 to-orange-500",
          icon: Clock,
        },
        {
          label: "Bu Ay Net Maaş",
          value:
            data.netSalary != null
              ? `₺${new Intl.NumberFormat("tr-TR").format(data.netSalary)}`
              : "—",
          sub: data.paymentDate
            ? `Ödeme: ${new Date(data.paymentDate).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}`
            : "Bordro henüz yayınlanmadı",
          tint: "from-orange-500 to-rose-500",
          icon: Wallet,
        },
        {
          label: "Kalan Yıllık İzin",
          value: `${data.remainingLeave} gün`,
          sub: `Toplam hak: 14 gün`,
          tint: "from-rose-500 to-pink-500",
          icon: CalendarCheck2,
        },
        {
          label: "Açık Talepler",
          value: String(data.openRequests),
          sub: data.openRequests > 0 ? "Onay bekliyor" : "Tüm talepler işlendi",
          tint: "from-pink-500 to-amber-500",
          icon: HandCoins,
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400">
            Kişisel Panel
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            {greeting()},{" "}
            <span className="bg-gradient-to-r from-amber-500 to-rose-500 bg-clip-text text-transparent">
              {firstName}
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {todayLabel()} — günün özeti.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          <span className={`h-1.5 w-1.5 rounded-full ${status.color}`} />
          {status.label}
        </span>
      </div>

      {/* PDKS quick action banner */}
      <Link
        to="/employee/pdks"
        className="group flex items-center justify-between gap-4 overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-5 shadow-lg shadow-orange-500/20 transition-shadow hover:shadow-xl hover:shadow-orange-500/30"
      >
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30">
            <SmartphoneNfc
              className="h-6 w-6 text-white"
              strokeWidth={2.25}
            />
          </span>
          <div>
            <p className="text-sm font-semibold text-white/80">Mobil PDKS</p>
            <p className="text-lg font-bold text-white">Giriş / Çıkış Yap</p>
          </div>
        </div>
        <ArrowUpRight className="h-5 w-5 text-white/70 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </Link>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : (
        <>
          {/* KPIs */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            {kpis.map(({ label, value, sub, tint, icon: Icon }) => (
              <motion.div
                key={label}
                variants={cardReveal}
                className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-sm transition-shadow hover:shadow-lg dark:border-white/10 dark:bg-slate-900/60"
              >
                <div
                  aria-hidden="true"
                  className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${tint}`}
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {label}
                  </p>
                  <span
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${tint} text-white shadow-sm ring-1 ring-white/20`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2.25} />
                  </span>
                </div>
                <p className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {value}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {sub}
                </p>
              </motion.div>
            ))}
          </motion.div>

          {/* Activity + chart */}
          <div className="grid gap-6 lg:grid-cols-3">
            <motion.section
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 p-6 shadow-sm lg:col-span-2 dark:border-white/10 dark:bg-slate-900/60"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
                    Son Hareketlerim
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Kişisel aktivite geçmişi
                  </p>
                </div>
                <a
                  href="#!"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
                >
                  Tümünü gör
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>
              <ul className="mt-5 divide-y divide-slate-200/70 dark:divide-white/10">
                {data && data.activities.length > 0 ? (
                  data.activities.map((a) => {
                    const Icon = CATEGORY_ICONS[a.category] ?? CheckCircle2;
                    const tint =
                      CATEGORY_TINTS[a.category] ??
                      "from-slate-500 to-slate-600";
                    return (
                      <li
                        key={a.id}
                        className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0"
                      >
                        <span
                          className={`mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-gradient-to-br ${tint} text-white shadow-sm ring-1 ring-white/20`}
                        >
                          <Icon className="h-4 w-4" strokeWidth={2.25} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {a.action}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {timeAgo(a.created_at)}
                          </p>
                        </div>
                      </li>
                    );
                  })
                ) : (
                  <li className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                    Henüz aktivite kaydı yok
                  </li>
                )}
              </ul>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/60"
            >
              <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
                Haftalık Çalışma
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Son 7 gün (saat)
              </p>
              <div className="mt-4 flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Mesai
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  Hedef
                </span>
              </div>
              <MiniChart
                className="mt-3 h-36 w-full text-slate-400"
                colorA="#f59e0b"
                colorB="#f43f5e"
                gradientId="empChart"
              />
              <div className="mt-5 flex items-center justify-between border-t border-slate-200/60 pt-4 dark:border-white/10">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Bu hafta
                  </p>
                  <p className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                    {data ? formatWorkTime(data.weeklyMinutes) : "—"}
                  </p>
                </div>
                <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                  %
                  {data
                    ? Math.min(
                        100,
                        Math.round(
                          (data.weeklyMinutes / WEEKLY_TARGET) * 100,
                        ),
                      )
                    : "—"}
                </span>
              </div>
            </motion.section>
          </div>
        </>
      )}
    </div>
  );
}

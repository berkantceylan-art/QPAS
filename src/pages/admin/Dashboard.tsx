import {
  ArrowUpRight,
  Clock,
  FileCheck2,
  Loader2,
  TrendingUp,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { cardReveal, staggerContainer } from "@/components/motion/variants";
import MiniChart from "@/components/portal/MiniChart";
import { useAuth } from "@/hooks/useAuth";
import { useAdminStats } from "@/hooks/useDashboardData";

type Kpi = {
  label: string;
  value: string;
  delta: string;
  deltaPositive: boolean;
  tint: string;
  icon: LucideIcon;
};

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  user: UserPlus,
  role: Users,
  pdks: Clock,
  payroll: TrendingUp,
  system: FileCheck2,
  request: FileCheck2,
};

const CATEGORY_TINTS: Record<string, string> = {
  user: "from-cyan-500 to-sky-500",
  role: "from-indigo-500 to-purple-500",
  pdks: "from-emerald-500 to-teal-500",
  payroll: "from-amber-500 to-rose-500",
  system: "from-cyan-500 to-indigo-500",
  request: "from-amber-500 to-orange-500",
};

function todayLabel() {
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());
  } catch {
    return new Date().toLocaleDateString();
  }
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("tr-TR").format(n);
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

export default function Dashboard() {
  const { profile, user } = useAuth();
  const { data, loading } = useAdminStats();

  const firstName =
    profile?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "Admin";

  const kpis: Kpi[] = data
    ? [
        {
          label: "Toplam Kullanıcı",
          value: formatNumber(data.totalUsers),
          delta: `Aktif sistem kullanıcısı`,
          deltaPositive: true,
          tint: "from-cyan-500 to-sky-500",
          icon: Users,
        },
        {
          label: "Günlük PDKS Girişi",
          value: formatNumber(data.todayAttendance),
          delta: "Bugünkü giriş sayısı",
          deltaPositive: true,
          tint: "from-emerald-500 to-teal-500",
          icon: Clock,
        },
        {
          label: "Açık Talepler",
          value: formatNumber(data.openRequests),
          delta: "Onay bekleyen",
          deltaPositive: data.openRequests === 0,
          tint: "from-amber-500 to-rose-500",
          icon: FileCheck2,
        },
        {
          label: "Haftalık Giriş",
          value: formatNumber(data.weeklyTotal),
          delta: "Son 7 gün toplam",
          deltaPositive: true,
          tint: "from-indigo-500 to-purple-500",
          icon: TrendingUp,
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-400">
            Genel Bakış
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Hoş geldin, <span className="gradient-text">{firstName}</span>
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Bugün sistemde olanlar bir bakışta.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {todayLabel()}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
        </div>
      ) : (
        <>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            {kpis.map(
              ({ label, value, delta, deltaPositive, tint, icon: Icon }) => (
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
                  <p
                    className={
                      deltaPositive
                        ? "mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"
                        : "mt-1 text-xs font-medium text-rose-600 dark:text-rose-400"
                    }
                  >
                    {delta}
                  </p>
                </motion.div>
              ),
            )}
          </motion.div>

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
                    Son Aktiviteler
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Sistem genelinde son hareketler
                  </p>
                </div>
                <a
                  href="#!"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300"
                >
                  Tümünü gör
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>
              <ul className="mt-5 divide-y divide-slate-200/70 dark:divide-white/10">
                {data && data.activities.length > 0 ? (
                  data.activities.map((a) => {
                    const Icon = CATEGORY_ICONS[a.category] ?? FileCheck2;
                    const tint = CATEGORY_TINTS[a.category] ?? "from-slate-500 to-slate-600";
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
                          <p className="text-sm text-slate-700 dark:text-slate-200">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {a.actor_name}
                            </span>{" "}
                            {a.action}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
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
                Haftalık Giriş Trendi
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Son 7 gün
              </p>
              <div className="mt-4 flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                  Giriş
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  Çıkış
                </span>
              </div>
              <MiniChart className="mt-3 h-36 w-full text-slate-400" />
              <div className="mt-5 flex items-center justify-between border-t border-slate-200/60 pt-4 dark:border-white/10">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Bu hafta
                  </p>
                  <p className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                    {data ? formatNumber(data.weeklyTotal) : "—"} giriş
                  </p>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  {data?.weeklyDelta ?? "—"}
                </span>
              </div>
            </motion.section>
          </div>
        </>
      )}
    </div>
  );
}

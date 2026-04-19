import {
  ArrowRight,
  BarChart3,
  Shield,
  Sparkles,
  Zap,
  LayoutDashboard,
  Users,
  Clock,
  FileBarChart2,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "./ui/Button";
import { fadeUp, staggerContainer } from "./motion/variants";

const TRUST_ITEMS = [
  { icon: Shield, label: "ISO 27001 Güvenlik" },
  { icon: Zap, label: "%99.9 Uptime SLA" },
  { icon: BarChart3, label: "Canlı Analitik" },
];

export default function Hero() {
  return (
    <section
      id="top"
      className="relative isolate overflow-hidden pt-12 pb-24 sm:pt-20 sm:pb-32"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-radial-fade" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-40 mask-fade-y dark:opacity-25" />

      <motion.div
        className="section flex flex-col items-center text-center"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <motion.span
          variants={fadeUp}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/70 px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
        >
          <Sparkles className="h-3.5 w-3.5 text-cyan-500" />
          Yeni Nesil ERP Platformu
        </motion.span>

        <motion.h1
          variants={fadeUp}
          className="mt-6 max-w-4xl text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl md:text-7xl dark:text-white"
        >
          Akıllı Geçiş,{" "}
          <span className="gradient-text">Kusursuz Yönetim</span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="mt-6 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-400"
        >
          Q-Pass ERP; PDKS takibi, İK analitiği ve modüler ERP çözümlerini tek
          platformda birleştirir. Operasyonlarınızı hızlandırın, kararlarınızı
          veriyle güçlendirin.
        </motion.p>

        <motion.div
          variants={fadeUp}
          className="mt-10 flex flex-col items-center gap-3 sm:flex-row"
        >
          <Button size="lg" className="w-full sm:w-auto">
            Ücretsiz Demo Al
            <ArrowRight className="h-4 w-4" />
          </Button>
          <a href="#portals" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full">
              Portalları Keşfet
            </Button>
          </a>
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-600 dark:text-slate-400"
        >
          {TRUST_ITEMS.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-cyan-500" />
              <span>{label}</span>
            </div>
          ))}
        </motion.div>

        <HeroMockup />
      </motion.div>
    </section>
  );
}

function HeroMockup() {
  const reduce = useReducedMotion();

  return (
    <motion.div
      variants={fadeUp}
      className="relative mt-16 hidden w-full max-w-5xl sm:block"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[32px] bg-gradient-to-br from-cyan-500/20 via-sky-500/10 to-indigo-500/20 blur-2xl"
      />
      <motion.div
        animate={
          reduce ? undefined : { y: [0, -6, 0] }
        }
        transition={
          reduce
            ? undefined
            : { duration: 6, repeat: Infinity, ease: "easeInOut" }
        }
        className="glass relative overflow-hidden rounded-2xl shadow-2xl shadow-indigo-500/10 mask-fade-y"
      >
        {/* Browser chrome */}
        <div className="flex items-center gap-2 border-b border-slate-200/70 bg-slate-50/60 px-4 py-3 dark:border-white/10 dark:bg-slate-900/60">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          <div className="mx-auto flex items-center gap-2 rounded-md bg-white/70 px-3 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200/80 dark:bg-white/5 dark:text-slate-400 dark:ring-white/10">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            app.qpass.io/dashboard
          </div>
          <span className="w-8" />
        </div>

        {/* Dashboard body */}
        <div className="grid grid-cols-12 gap-0 text-left">
          {/* Sidebar */}
          <aside className="col-span-3 hidden border-r border-slate-200/70 bg-white/40 p-4 md:block dark:border-white/10 dark:bg-slate-900/40">
            <div className="flex items-center gap-2 pb-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-cyan-500 to-indigo-500" />
              <span className="text-xs font-semibold tracking-tight text-slate-700 dark:text-slate-200">
                Q-Pass
              </span>
            </div>
            <ul className="space-y-1.5">
              {[
                { icon: LayoutDashboard, label: "Genel Bakış", active: true },
                { icon: Users, label: "Personel" },
                { icon: Clock, label: "PDKS" },
                { icon: FileBarChart2, label: "Raporlar" },
              ].map(({ icon: Icon, label, active }) => (
                <li
                  key={label}
                  className={
                    active
                      ? "flex items-center gap-2 rounded-md bg-gradient-to-r from-cyan-500/15 to-indigo-500/15 px-2 py-1.5 text-xs font-medium text-slate-900 ring-1 ring-inset ring-cyan-500/20 dark:text-white"
                      : "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-slate-600 dark:text-slate-400"
                  }
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </li>
              ))}
            </ul>
          </aside>

          {/* Main */}
          <div className="col-span-12 p-4 md:col-span-9 md:p-6">
            {/* KPI row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Aktif Personel", value: "1.284", delta: "+3.2%", tint: "from-cyan-500 to-sky-500" },
                { label: "Günlük Giriş", value: "1.119", delta: "+1.8%", tint: "from-indigo-500 to-purple-500" },
                { label: "Fazla Mesai", value: "62s", delta: "-4.1%", tint: "from-emerald-500 to-teal-500" },
              ].map((k) => (
                <div
                  key={k.label}
                  className="relative overflow-hidden rounded-xl border border-slate-200/70 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5"
                >
                  <div
                    className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${k.tint}`}
                  />
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {k.label}
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                    {k.value}
                  </p>
                  <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {k.delta}
                  </p>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div className="mt-4 rounded-xl border border-slate-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Haftalık PDKS Trendi
                </p>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                    Giriş
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    Çıkış
                  </span>
                </div>
              </div>
              <svg
                viewBox="0 0 400 120"
                className="mt-3 h-28 w-full"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="heroLine" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                  <linearGradient id="heroFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[20, 40, 60, 80, 100].map((y) => (
                  <line
                    key={y}
                    x1="0"
                    x2="400"
                    y1={y}
                    y2={y}
                    stroke="currentColor"
                    strokeOpacity="0.08"
                  />
                ))}
                <path
                  d="M0,85 C40,70 70,40 110,55 C150,70 180,95 220,80 C260,65 290,30 330,38 C360,44 380,30 400,22 L400,120 L0,120 Z"
                  fill="url(#heroFill)"
                />
                <path
                  d="M0,85 C40,70 70,40 110,55 C150,70 180,95 220,80 C260,65 290,30 330,38 C360,44 380,30 400,22"
                  fill="none"
                  stroke="url(#heroLine)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M0,95 C40,92 80,75 120,82 C160,89 200,70 240,72 C280,74 320,60 360,55 C380,52 390,50 400,48"
                  fill="none"
                  stroke="#6366f1"
                  strokeOpacity="0.45"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
              </svg>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

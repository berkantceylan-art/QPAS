import { Construction, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

type Props = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export default function Placeholder({ title, description, icon: Icon }: Props) {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">
          Modül
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
          {title}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {description}
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-20 text-center dark:border-white/10 dark:bg-slate-900/40"
      >
        <div className="pointer-events-none absolute inset-0 -z-10 bg-radial-fade opacity-50" />
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-500 shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
          <Icon className="h-7 w-7 text-white" strokeWidth={2.25} />
        </div>
        <h2 className="mt-6 text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
          Bu modül yapım aşamasında
        </h2>
        <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
          Çekirdek panel hazır; {title.toLowerCase()} özellikleri bir sonraki
          sürümde gelecek.
        </p>
        <span className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-indigo-200/80 bg-indigo-50/70 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:border-indigo-400/20 dark:bg-indigo-500/10 dark:text-indigo-300">
          <Construction className="h-3.5 w-3.5" />
          Yakında
        </span>
      </motion.div>
    </div>
  );
}

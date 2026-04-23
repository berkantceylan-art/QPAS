import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  actions: ReactNode;
};

export default function EntityRow({ title, subtitle, meta, actions }: Props) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 shadow-sm transition-shadow hover:shadow-md dark:border-white/10 dark:bg-slate-900/60">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
          {title}
        </p>
        {subtitle && (
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        )}
      </div>
      {meta && (
        <div className="hidden shrink-0 text-xs text-slate-500 sm:block dark:text-slate-400">
          {meta}
        </div>
      )}
      <div className="flex shrink-0 items-center gap-1">{actions}</div>
    </li>
  );
}

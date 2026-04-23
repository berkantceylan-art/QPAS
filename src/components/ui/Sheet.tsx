import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  side?: "right" | "bottom";
  className?: string;
};

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  side = "right",
  className,
}: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onOpenChange]);

  const isRight = side === "right";

  return (
    <AnimatePresence>
      {open && (
        <div
          className={cn(
            "fixed inset-0 z-50",
            isRight ? "flex justify-end" : "flex items-end",
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby="sheet-title"
        >
          <motion.button
            type="button"
            aria-label="Kapat"
            onClick={() => onOpenChange(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            initial={isRight ? { x: "100%" } : { y: "100%" }}
            animate={isRight ? { x: 0 } : { y: 0 }}
            exit={isRight ? { x: "100%" } : { y: "100%" }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "relative z-10 flex flex-col border-slate-200/70 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900",
              isRight
                ? "h-full w-full max-w-md border-l"
                : "max-h-[90vh] w-full rounded-t-2xl border-t",
              className,
            )}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 px-5 py-4 dark:border-white/10">
              <div className="min-w-0 flex-1">
                <h2
                  id="sheet-title"
                  className="text-base font-semibold tracking-tight text-slate-900 dark:text-white"
                >
                  {title}
                </h2>
                {description && (
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Kapat"
                className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
            {footer && (
              <div className="border-t border-slate-200/70 bg-slate-50/60 px-5 py-3 dark:border-white/10 dark:bg-white/5">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

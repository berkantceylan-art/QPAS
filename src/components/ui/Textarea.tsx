import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, rows = 3, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        "flex w-full rounded-lg border bg-white/80 px-3.5 py-2 text-sm text-slate-900 shadow-sm transition-colors",
        "placeholder:text-slate-400 resize-y",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-500 dark:focus-visible:ring-offset-slate-950",
        invalid
          ? "border-rose-400 focus-visible:ring-rose-500/60 dark:border-rose-500/70"
          : "border-slate-200 dark:border-white/10",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

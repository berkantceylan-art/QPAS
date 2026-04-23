import { createContext, useContext, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type TabsContextValue = {
  value: string;
  onValueChange: (value: string) => void;
  orientation: "horizontal" | "vertical";
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs.* must be used inside <Tabs>");
  return ctx;
}

type TabsProps = {
  value: string;
  onValueChange: (value: string) => void;
  orientation?: "horizontal" | "vertical";
  className?: string;
  children: ReactNode;
};

export function Tabs({
  value,
  onValueChange,
  orientation = "horizontal",
  className,
  children,
}: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange, orientation }}>
      <div
        className={cn(
          orientation === "vertical"
            ? "flex flex-col gap-6 sm:flex-row"
            : "flex flex-col gap-4",
          className,
        )}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
}

type TabsListProps = {
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
};

export function TabsList({ className, children, ariaLabel }: TabsListProps) {
  const { orientation } = useTabs();

  if (orientation === "vertical") {
    return (
      <div
        role="tablist"
        aria-orientation={orientation}
        aria-label={ariaLabel}
        className={cn(
          "flex w-full shrink-0 gap-1 overflow-x-auto sm:w-56 sm:flex-col sm:overflow-visible",
          className,
        )}
      >
        {children}
      </div>
    );
  }

  // horizontal mode: wrap with right-edge fade gradient to hint at scroll
  return (
    <div className="relative -mx-1 px-1">
      <div
        role="tablist"
        aria-orientation={orientation}
        aria-label={ariaLabel}
        className={cn(
          "flex w-full gap-1 overflow-x-auto pr-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
          className,
        )}
      >
        {children}
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white via-white/70 to-transparent dark:from-slate-900 dark:via-slate-900/70"
      />
    </div>
  );
}

type TabsTriggerProps = {
  value: string;
  className?: string;
  children: ReactNode;
  shortLabel?: ReactNode;
  icon?: ReactNode;
};

export function TabsTrigger({
  value,
  className,
  children,
  shortLabel,
  icon,
}: TabsTriggerProps) {
  const { value: active, onValueChange, orientation } = useTabs();
  const isActive = value === active;
  const isHorizontal = orientation === "horizontal";
  const ariaLabel =
    typeof children === "string" ? (children as string) : undefined;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={`tab-panel-${value}`}
      aria-label={ariaLabel}
      id={`tab-trigger-${value}`}
      tabIndex={isActive ? 0 : -1}
      onClick={() => onValueChange(value)}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60",
        isHorizontal ? "justify-center sm:justify-start" : "sm:justify-start",
        isActive
          ? "bg-gradient-to-r from-cyan-500 to-sky-500 text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5",
        className,
      )}
    >
      {icon && (
        <span
          className={cn(
            "flex items-center justify-center",
            isHorizontal ? "h-5 w-5 xs:h-4 xs:w-4" : "h-4 w-4",
          )}
        >
          {icon}
        </span>
      )}
      {isHorizontal ? (
        shortLabel !== undefined ? (
          <>
            <span className="xs:hidden">{shortLabel}</span>
            <span className="hidden xs:inline">{children}</span>
          </>
        ) : (
          <span>{children}</span>
        )
      ) : (
        <span>{children}</span>
      )}
    </button>
  );
}

type TabsContentProps = {
  value: string;
  className?: string;
  children: ReactNode;
};

export function TabsContent({ value, className, children }: TabsContentProps) {
  const { value: active } = useTabs();
  if (value !== active) return null;
  return (
    <div
      role="tabpanel"
      id={`tab-panel-${value}`}
      aria-labelledby={`tab-trigger-${value}`}
      className={cn("min-w-0 flex-1", className)}
    >
      {children}
    </div>
  );
}

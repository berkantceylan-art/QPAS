import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import type { PermissionAction, PermissionModule } from "@/lib/supabase";
import { MODULE_LABELS } from "@/lib/permissions";

type Props = {
  module: PermissionModule;
  action: PermissionAction;
  /** Yetkisiz durumda gösterilecek fallback. Verilmezse varsayılan kilitli kart gösterilir. */
  fallback?: ReactNode;
  /** true ise yetkisiz durumda hiçbir şey render etmez (gizler) */
  hide?: boolean;
  children: ReactNode;
};

/**
 * UI guard wrapper — kullanıcının belirtilen modül + aksiyon yetkisi yoksa
 * children'ı render etmez. Yerine kilitli bir kart gösterir veya tamamen gizler.
 *
 * Admin rolü her zaman bypass eder.
 *
 * @example
 * ```tsx
 * <HasPermission module="finance" action="read">
 *   <FinanceDashboard />
 * </HasPermission>
 * ```
 */
export default function HasPermission({
  module,
  action,
  fallback,
  hide = false,
  children,
}: Props) {
  const { hasPermission, loading } = usePermissions();

  if (loading) return null;

  if (hasPermission(module, action)) {
    return <>{children}</>;
  }

  if (hide) return null;

  if (fallback) return <>{fallback}</>;

  // Varsayılan kilitli kart
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white/40 px-6 py-12 dark:border-white/10 dark:bg-white/5">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/10">
        <Lock className="h-5 w-5 text-slate-400 dark:text-slate-500" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Erişim Kısıtlı
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          <strong>{MODULE_LABELS[module]}</strong> modülüne erişim yetkiniz
          bulunmuyor. Yöneticinizle iletişime geçin.
        </p>
      </div>
    </div>
  );
}

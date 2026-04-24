import type {
  FinanceRequestStatus,
  FinanceRequestType,
} from "./supabase";

export const TYPE_LABEL: Record<FinanceRequestType, string> = {
  advance: "Avans",
  loan: "Senetli Borç",
};

export const STATUS_LABEL: Record<FinanceRequestStatus, string> = {
  pending_manager: "Yönetici Onayı Bekliyor",
  pending_admin: "Admin Onayı Bekliyor",
  approved: "Onaylandı",
  rejected: "Reddedildi",
  cancelled: "İptal Edildi",
};

export const STATUS_BADGE: Record<FinanceRequestStatus, string> = {
  pending_manager:
    "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  pending_admin:
    "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  rejected: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  cancelled: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
};

const TRY = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 2,
});

export function formatTRY(n: number | null | undefined): string {
  if (n == null) return "—";
  return TRY.format(Number(n));
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

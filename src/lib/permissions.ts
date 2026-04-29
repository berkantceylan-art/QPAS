import type { PermissionAction, PermissionMap, PermissionModule } from "./supabase";
export type { PermissionMap };

/** Tüm modüller */
export const ALL_MODULES: PermissionModule[] = [
  "personnel",
  "finance",
  "shifts",
  "reports",
  "communication",
  "settings",
  "attendance",
];

/** Tüm aksiyonlar */
export const ALL_ACTIONS: PermissionAction[] = ["read", "write", "edit", "delete"];

/** Modül Türkçe etiketleri */
export const MODULE_LABELS: Record<PermissionModule, string> = {
  personnel: "Personel",
  finance: "Finans",
  shifts: "Vardiya",
  reports: "Raporlar",
  communication: "İletişim",
  settings: "Ayarlar",
  attendance: "Devam (PDKS)",
};

/** Aksiyon Türkçe etiketleri */
export const ACTION_LABELS: Record<PermissionAction, string> = {
  read: "Oku",
  write: "Yaz",
  edit: "Düzenle",
  delete: "Sil",
};

/** Admin rolü için tüm yetkiler (her modülde full access) */
export const DEFAULT_ADMIN_PERMISSIONS: PermissionMap = Object.fromEntries(
  ALL_MODULES.map((m) => [m, [...ALL_ACTIONS]]),
) as PermissionMap;

/** Yeni oluşturulan firma için varsayılan "Firma Yöneticisi" rolü */
export const DEFAULT_MANAGER_PERMISSIONS: PermissionMap = Object.fromEntries(
  ALL_MODULES.map((m) => [m, [...ALL_ACTIONS]]),
) as PermissionMap;

/** Yeni oluşturulan firma için varsayılan "Çalışan" rolü */
export const DEFAULT_EMPLOYEE_PERMISSIONS: PermissionMap = {
  personnel: ["read"],
  finance: ["read"],
  shifts: ["read"],
  reports: [],
  communication: ["read", "write"],
  settings: [],
  attendance: ["read", "write"],
};

/**
 * Kullanıcının belirtilen modülde belirtilen aksiyona izni olup olmadığını kontrol eder.
 */
export function hasPermission(
  permissions: PermissionMap | null | undefined,
  module: PermissionModule,
  action: PermissionAction,
): boolean {
  if (!permissions) return false;
  const modulePerms = permissions[module];
  if (!modulePerms) return false;
  return modulePerms.includes(action);
}

/**
 * Boş bir yetki haritası oluşturur (tüm modüller boş array).
 */
export function emptyPermissionMap(): PermissionMap {
  return Object.fromEntries(ALL_MODULES.map((m) => [m, []])) as PermissionMap;
}

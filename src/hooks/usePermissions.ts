import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "./useAuth";
import {
  supabase,
  type CustomRole,
  type PermissionAction,
  type PermissionMap,
  type PermissionModule,
} from "@/lib/supabase";
import {
  DEFAULT_ADMIN_PERMISSIONS,
  hasPermission as checkPermission,
} from "@/lib/permissions";

/**
 * Kullanıcının RBAC yetki haritasını ve yardımcı fonksiyonları döner.
 *
 * - Admin rolündeki kullanıcılar her zaman full access alır.
 * - Employee/Client rolündeki kullanıcılar employees tablosundaki custom_role_id
 *   üzerinden custom_roles tablosundan permissions JSONB'sini alır.
 */
export function usePermissions() {
  const { profile } = useAuth();
  const [role, setRole] = useState<CustomRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) {
      setRole(null);
      setLoading(false);
      return;
    }

    // Admin her zaman full access
    if (profile.role === "admin") {
      setRole(null);
      setLoading(false);
      return;
    }

    // Employee veya Client ise employee kaydından custom_role_id al
    if (!profile.company_id) {
      setRole(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      // Önce user_id ile employee kaydını bul
      const { data: emp } = await supabase
        .from("employees")
        .select("custom_role_id")
        .eq("user_id", profile.id)
        .maybeSingle();

      if (cancelled) return;

      if (!emp?.custom_role_id) {
        setRole(null);
        setLoading(false);
        return;
      }

      // custom_roles tablosundan rol bilgisini çek
      const { data: roleData } = await supabase
        .from("custom_roles")
        .select("*")
        .eq("id", emp.custom_role_id)
        .maybeSingle();

      if (cancelled) return;
      setRole((roleData as CustomRole) ?? null);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [profile]);

  const permissions: PermissionMap = useMemo(() => {
    if (profile?.role === "admin") return DEFAULT_ADMIN_PERMISSIONS;
    if (role?.permissions) return role.permissions;
    return {};
  }, [profile?.role, role]);

  const hasPermission = useCallback(
    (module: PermissionModule, action: PermissionAction): boolean => {
      if (profile?.role === "admin") return true;
      return checkPermission(permissions, module, action);
    },
    [profile?.role, permissions],
  );

  return { permissions, role, loading, hasPermission };
}

/**
 * Belirli bir modül + aksiyon için kısayol hook.
 */
export function useHasPermission(
  module: PermissionModule,
  action: PermissionAction,
): boolean {
  const { hasPermission } = usePermissions();
  return hasPermission(module, action);
}

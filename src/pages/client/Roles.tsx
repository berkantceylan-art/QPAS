import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Dialog } from "@/components/ui/Dialog";
import { cardReveal, staggerContainer } from "@/components/motion/variants";
import { PORTALS } from "@/lib/portals";
import { cn } from "@/lib/utils";
import {
  supabase,
  type CustomRole,
  type Employee,
  type PermissionAction,
  type PermissionModule,
} from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import {
  ALL_ACTIONS,
  ALL_MODULES,
  ACTION_LABELS,
  MODULE_LABELS,
  emptyPermissionMap,
  type PermissionMap,
} from "@/lib/permissions";

export default function ClientRoles() {
  const portal = PORTALS.client;
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [employees, setEmployees] = useState<
    Pick<Employee, "id" | "full_name" | "custom_role_id">[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [roleName, setRoleName] = useState("");
  const [permissions, setPermissions] = useState<PermissionMap>(
    emptyPermissionMap(),
  );
  const [saving, setSaving] = useState(false);

  // Atama dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignRoleId, setAssignRoleId] = useState("");
  const [assignEmpId, setAssignEmpId] = useState("");

  const fetchAll = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);

    const [rolesRes, empsRes] = await Promise.all([
      supabase
        .from("custom_roles")
        .select("*")
        .eq("company_id", companyId)
        .order("name"),
      supabase
        .from("employees")
        .select("id, full_name, custom_role_id")
        .eq("company_id", companyId)
        .eq("status", "active")
        .order("full_name"),
    ]);

    if (rolesRes.error) setError(rolesRes.error.message);
    setRoles((rolesRes.data ?? []) as CustomRole[]);
    setEmployees(
      (empsRes.data ?? []) as Pick<
        Employee,
        "id" | "full_name" | "custom_role_id"
      >[],
    );
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const openCreate = () => {
    setEditingRole(null);
    setRoleName("");
    setPermissions(emptyPermissionMap());
    setDialogOpen(true);
  };

  const openEdit = (role: CustomRole) => {
    setEditingRole(role);
    setRoleName(role.name);
    setPermissions({ ...emptyPermissionMap(), ...role.permissions });
    setDialogOpen(true);
  };

  const togglePerm = (mod: PermissionModule, action: PermissionAction) => {
    setPermissions((prev: PermissionMap) => {
      const next = { ...prev };
      const arr = [...(next[mod] ?? [])];
      const idx = arr.indexOf(action);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(action);
      next[mod] = arr;
      return next;
    });
  };

  const handleSave = async () => {
    if (!roleName.trim() || !companyId) return;
    setSaving(true);
    setError(null);

    if (editingRole) {
      const { error: err } = await supabase
        .from("custom_roles")
        .update({ name: roleName.trim(), permissions })
        .eq("id", editingRole.id);
      if (err) setError(err.message);
    } else {
      const { error: err } = await supabase
        .from("custom_roles")
        .insert({
          company_id: companyId,
          name: roleName.trim(),
          permissions,
        });
      if (err) setError(err.message);
    }

    setSaving(false);
    setDialogOpen(false);
    fetchAll();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu rolü silmek istediğinize emin misiniz?")) return;
    const { error: err } = await supabase
      .from("custom_roles")
      .delete()
      .eq("id", id);
    if (err) setError(err.message);
    fetchAll();
  };

  const handleAssign = async () => {
    if (!assignEmpId) return;
    setSaving(true);
    const { error: err } = await supabase
      .from("employees")
      .update({ custom_role_id: assignRoleId || null })
      .eq("id", assignEmpId);
    if (err) setError(err.message);
    setSaving(false);
    setAssignOpen(false);
    fetchAll();
  };

  const getEmployeesForRole = (roleId: string) =>
    employees.filter((e) => e.custom_role_id === roleId);

  const dialogTitle = editingRole ? "Rolü Düzenle" : "Yeni Rol Oluştur";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p
            className={cn(
              "text-sm font-semibold uppercase tracking-[0.18em]",
              portal.accentEyebrow,
            )}
          >
            RBAC
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Roller & Yetkiler
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Özel roller tanımlayın ve çalışanlara atayın.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAssignOpen(true)}
            className="gap-1.5"
          >
            <Users className="h-4 w-4" />
            Rol Ata
          </Button>
          <Button size="sm" onClick={openCreate} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Yeni Rol
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        </div>
      ) : roles.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white/40 p-12 text-center dark:border-white/10 dark:bg-white/5">
          <ShieldCheck className="h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Henüz rol tanımlanmamış.
          </p>
          <Button size="sm" onClick={openCreate} className="gap-1.5">
            <Plus className="h-4 w-4" />
            İlk Rolü Oluştur
          </Button>
        </div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="space-y-3"
        >
          {roles.map((role) => {
            const roleEmps = getEmployeesForRole(role.id);
            return (
              <motion.div
                key={role.id}
                variants={cardReveal}
                className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 dark:border-white/10 dark:bg-slate-900/60"
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-cyan-500" />
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {role.name}
                    </span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-white/10 dark:text-slate-400">
                      {roleEmps.length} çalışan
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(role)}
                      className="text-xs"
                    >
                      Düzenle
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(role.id)}
                      className="text-xs text-rose-500 hover:text-rose-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Yetki matrisi özeti */}
                <div className="overflow-x-auto border-t border-slate-100 dark:border-white/5">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="bg-slate-50/80 dark:bg-white/5">
                        <th className="px-3 py-1.5 text-left font-semibold text-slate-400">
                          Modül
                        </th>
                        {ALL_ACTIONS.map((a) => (
                          <th
                            key={a}
                            className="px-2 py-1.5 text-center font-semibold text-slate-400"
                          >
                            {ACTION_LABELS[a]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ALL_MODULES.map((mod) => (
                        <tr
                          key={mod}
                          className="border-t border-slate-50 dark:border-white/[0.03]"
                        >
                          <td className="px-3 py-1 font-medium text-slate-600 dark:text-slate-300">
                            {MODULE_LABELS[mod]}
                          </td>
                          {ALL_ACTIONS.map((a) => (
                            <td key={a} className="px-2 py-1 text-center">
                              {role.permissions[mod]?.includes(a) ? (
                                <span className="text-emerald-500">●</span>
                              ) : (
                                <span className="text-slate-200 dark:text-white/10">
                                  ○
                                </span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Atanmış çalışanlar */}
                {roleEmps.length > 0 && (
                  <div className="border-t border-slate-100 px-4 py-2 dark:border-white/5">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Atanmış Çalışanlar
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {roleEmps.map((e) => (
                        <span
                          key={e.id}
                          className="rounded-md bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-700 dark:text-cyan-300"
                        >
                          {e.full_name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* ── Create/Edit Dialog ── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={dialogTitle}
        className="max-w-lg"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Rol Adı
            </label>
            <Input
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="ör. İK Uzmanı, Vardiya Amiri"
            />
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200/70 dark:border-white/10">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-white/5">
                  <th className="px-3 py-2 text-left font-semibold text-slate-500">
                    Modül
                  </th>
                  {ALL_ACTIONS.map((a) => (
                    <th
                      key={a}
                      className="px-3 py-2 text-center font-semibold text-slate-500"
                    >
                      {ACTION_LABELS[a]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALL_MODULES.map((mod) => (
                  <tr
                    key={mod}
                    className="border-t border-slate-100 dark:border-white/5"
                  >
                    <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-200">
                      {MODULE_LABELS[mod]}
                    </td>
                    {ALL_ACTIONS.map((action) => (
                      <td key={action} className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={
                            permissions[mod]?.includes(action) ?? false
                          }
                          onChange={() => togglePerm(mod, action)}
                          className="h-4 w-4 rounded border-slate-300 text-cyan-500 focus:ring-cyan-500 dark:border-white/20"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDialogOpen(false)}
            >
              İptal
            </Button>
            <Button
              size="sm"
              disabled={!roleName.trim() || saving}
              onClick={handleSave}
              className="gap-1.5"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingRole ? "Kaydet" : "Oluştur"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ── Rol Atama Dialog ── */}
      <Dialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        title="Çalışana Rol Ata"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Çalışan
            </label>
            <Select
              value={assignEmpId}
              onChange={(e) => setAssignEmpId(e.target.value)}
            >
              <option value="">— Çalışan seçin —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.full_name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Rol
            </label>
            <Select
              value={assignRoleId}
              onChange={(e) => setAssignRoleId(e.target.value)}
            >
              <option value="">— Rol yok (varsayılan) —</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAssignOpen(false)}
            >
              İptal
            </Button>
            <Button
              size="sm"
              disabled={!assignEmpId || saving}
              onClick={handleAssign}
              className="gap-1.5"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Ata
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

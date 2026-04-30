import { useEffect, useState, useCallback } from "react";
import {
  AlertCircle,
  Clock,
  Coffee,
  Loader2,
  Moon,
  Pencil,
  Plus,
  Trash2,
  UtensilsCrossed,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Dialog } from "@/components/ui/Dialog";
import { supabase, type Shift } from "@/lib/supabase";
import { Check, X as XIcon, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  companyId: string;
  data: Shift[];
  onChange: (next: Shift[]) => void;
};

function formatTime(t: string | null): string {
  return t ? t.slice(0, 5) : "—";
}

function parseNumberOrNull(v: string): number | null {
  const trimmed = v.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

const DEFAULT_GRACE = 15;

type ShiftFormState = {
  name: string;
  startTime: string;
  endTime: string;
  grace: string;
  entryTolerance: string;
  exitTolerance: string;
  workingHours: string;
  breakMinutes: string;
  mealMinutes: string;
  isFlexible: boolean;
  isNightShift: boolean;
  saturdayActive: boolean;
  sundayActive: boolean;
  minHours: string;
  maxHours: string;
};

const DEFAULT_FORM: ShiftFormState = {
  name: "",
  startTime: "",
  endTime: "",
  grace: String(DEFAULT_GRACE),
  entryTolerance: "15",
  exitTolerance: "15",
  workingHours: "",
  breakMinutes: "15",
  mealMinutes: "30",
  isFlexible: false,
  isNightShift: false,
  saturdayActive: false,
  sundayActive: false,
  minHours: "",
  maxHours: "",
};

function shiftToForm(s: Shift): ShiftFormState {
  return {
    name: s.name,
    startTime: s.start_time?.slice(0, 5) ?? "",
    endTime: s.end_time?.slice(0, 5) ?? "",
    grace: String(s.grace_period_minutes ?? DEFAULT_GRACE),
    entryTolerance: String(s.entry_tolerance ?? 15),
    exitTolerance: String(s.exit_tolerance ?? 15),
    workingHours: s.working_hours != null ? String(s.working_hours) : "",
    breakMinutes: String(s.break_minutes ?? 15),
    mealMinutes: String(s.meal_minutes ?? 30),
    isFlexible: s.is_flexible,
    isNightShift: s.is_night_shift ?? false,
    saturdayActive: s.saturday_active ?? false,
    sundayActive: s.sunday_active ?? false,
    minHours: s.min_daily_hours != null ? String(s.min_daily_hours) : "",
    maxHours: s.max_daily_hours != null ? String(s.max_daily_hours) : "",
  };
}

function formToPayload(f: ShiftFormState, companyId: string) {
  const graceNum = parseNumberOrNull(f.grace);
  return {
    company_id: companyId,
    name: f.name.trim(),
    start_time: f.isFlexible ? null : f.startTime || null,
    end_time: f.isFlexible ? null : f.endTime || null,
    grace_period_minutes: graceNum != null ? Math.round(graceNum) : DEFAULT_GRACE,
    entry_tolerance: Number(f.entryTolerance) || 15,
    exit_tolerance: Number(f.exitTolerance) || 15,
    working_hours: parseNumberOrNull(f.workingHours),
    break_minutes: Number(f.breakMinutes) || 0,
    meal_minutes: Number(f.mealMinutes) || 0,
    is_flexible: f.isFlexible,
    is_night_shift: f.isNightShift,
    saturday_active: f.saturdayActive,
    sunday_active: f.sundayActive,
    min_daily_hours: f.isFlexible ? parseNumberOrNull(f.minHours) : null,
    max_daily_hours: f.isFlexible ? parseNumberOrNull(f.maxHours) : null,
  };
}

function Toggle({ checked, onChange, label, icon }: { checked: boolean; onChange: (v: boolean) => void; label: string; icon?: React.ReactNode }) {
  return (
    <label className={cn(
      "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all",
      checked
        ? "border-cyan-500/60 bg-cyan-500/10 text-slate-900 dark:text-white shadow-sm"
        : "border-slate-200 bg-white/70 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 hover:border-slate-300"
    )}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-3.5 w-3.5 accent-cyan-500" />
      {icon}
      {label}
    </label>
  );
}

function ShiftFormFields({ form, setForm, disabled }: { form: ShiftFormState; setForm: (f: ShiftFormState) => void; disabled: boolean }) {
  const update = (patch: Partial<ShiftFormState>) => setForm({ ...form, ...patch });

  return (
    <div className="space-y-4">
      {/* Row 1: Name */}
      <div className="space-y-1.5">
        <Label>Vardiya Adı</Label>
        <Input value={form.name} onChange={(e) => update({ name: e.target.value })} placeholder="örn. Gündüz" disabled={disabled} />
      </div>

      {/* Row 2: Toggles */}
      <div className="flex flex-wrap gap-2">
        <Toggle checked={form.isFlexible} onChange={(v) => update({ isFlexible: v })} label="Esnek Vardiya" icon={<Zap className="h-4 w-4" />} />
        <Toggle checked={form.isNightShift} onChange={(v) => update({ isNightShift: v })} label="Gece Vardiyası" icon={<Moon className="h-4 w-4" />} />
        <Toggle checked={form.saturdayActive} onChange={(v) => update({ saturdayActive: v })} label="Cumartesi" />
        <Toggle checked={form.sundayActive} onChange={(v) => update({ sundayActive: v })} label="Pazar" />
      </div>

      {/* Row 3: Time / Flex hours */}
      {form.isFlexible ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Min. saat / gün</Label>
            <Input type="number" step="0.5" min="0" value={form.minHours} onChange={(e) => update({ minHours: e.target.value })} disabled={disabled} placeholder="6" />
          </div>
          <div className="space-y-1.5">
            <Label>Max. saat / gün</Label>
            <Input type="number" step="0.5" min="0" value={form.maxHours} onChange={(e) => update({ maxHours: e.target.value })} disabled={disabled} placeholder="10" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Başlangıç</Label>
            <Input type="time" value={form.startTime} onChange={(e) => update({ startTime: e.target.value })} disabled={disabled} />
          </div>
          <div className="space-y-1.5">
            <Label>Bitiş</Label>
            <Input type="time" value={form.endTime} onChange={(e) => update({ endTime: e.target.value })} disabled={disabled} />
          </div>
          <div className="space-y-1.5">
            <Label>Çalışma Saati</Label>
            <Input type="number" step="0.5" min="0" value={form.workingHours} onChange={(e) => update({ workingHours: e.target.value })} disabled={disabled} placeholder="8" />
          </div>
        </div>
      )}

      {/* Row 4: Tolerances */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="space-y-1.5">
          <Label>Giriş Toleransı (dk)</Label>
          <Input type="number" min="0" max="120" value={form.entryTolerance} onChange={(e) => update({ entryTolerance: e.target.value })} disabled={disabled} />
        </div>
        <div className="space-y-1.5">
          <Label>Çıkış Toleransı (dk)</Label>
          <Input type="number" min="0" max="120" value={form.exitTolerance} onChange={(e) => update({ exitTolerance: e.target.value })} disabled={disabled} />
        </div>
        <div className="space-y-1.5">
          <Label><Coffee className="inline h-3.5 w-3.5 mr-1" />Mola (dk)</Label>
          <Input type="number" min="0" max="120" value={form.breakMinutes} onChange={(e) => update({ breakMinutes: e.target.value })} disabled={disabled} />
        </div>
        <div className="space-y-1.5">
          <Label><UtensilsCrossed className="inline h-3.5 w-3.5 mr-1" />Yemek (dk)</Label>
          <Input type="number" min="0" max="120" value={form.mealMinutes} onChange={(e) => update({ mealMinutes: e.target.value })} disabled={disabled} />
        </div>
      </div>
    </div>
  );
}

export default function ShiftsPanel({ companyId, data, onChange }: Props) {
  const [form, setForm] = useState<ShiftFormState>(DEFAULT_FORM);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Shift | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2) {
      setError("Ad en az 2 karakter");
      return;
    }
    setCreating(true);
    setError(null);
    const payload = formToPayload(form, companyId);
    const { data: created, error: insertError } = await supabase
      .from("shifts")
      .insert(payload)
      .select()
      .single();
    setCreating(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    onChange([...data, created].sort((a, b) => a.name.localeCompare(b.name)));
    setForm(DEFAULT_FORM);
  };

  const handleDelete = async (row: Shift) => {
    if (!confirm(`"${row.name}" vardiyasını silmek istediğine emin misin?`)) return;
    const { error: delError } = await supabase.from("shifts").delete().eq("id", row.id);
    if (delError) {
      setError(delError.message);
      return;
    }
    onChange(data.filter((d) => d.id !== row.id));
  };

  return (
    <div className="space-y-6">
      {/* Create Form */}
      <form onSubmit={handleCreate} className="space-y-4 rounded-2xl border border-slate-200/70 bg-white/60 p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Yeni Vardiya Oluştur</h3>
        <ShiftFormFields form={form} setForm={setForm} disabled={creating} />
        <div className="flex justify-end">
          <Button type="submit" disabled={creating} className="gap-1.5">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Vardiya Ekle
          </Button>
        </div>
      </form>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
          <span>{error}</span>
        </div>
      )}

      {/* Shifts List */}
      {data.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white/40 p-6 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
          Henüz vardiya tanımlı değil.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.map((d) => (
            <ShiftCard key={d.id} shift={d} onEdit={() => setEditing(d)} onDelete={() => handleDelete(d)} />
          ))}
        </div>
      )}

      <EditDialog
        row={editing}
        companyId={companyId}
        onClose={() => setEditing(null)}
        onSaved={(updated) => {
          onChange(data.map((d) => (d.id === updated.id ? updated : d)).sort((a, b) => a.name.localeCompare(b.name)));
          setEditing(null);
        }}
      />

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ArrowLeftRight className="h-5 w-5 text-indigo-500" />
          Vardiya Takas Talepleri (Yönetici Onayı)
        </h2>
        <ShiftSwapsList companyId={companyId} />
      </div>
    </div>
  );
}

function ShiftCard({ shift, onEdit, onDelete }: { shift: Shift; onEdit: () => void; onDelete: () => void }) {
  const badges: { label: string; color: string }[] = [];
  if (shift.is_flexible) badges.push({ label: "Esnek", color: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" });
  if (shift.is_night_shift) badges.push({ label: "Gece", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300" });
  if (shift.saturday_active) badges.push({ label: "Cmt", color: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300" });
  if (shift.sunday_active) badges.push({ label: "Paz", color: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300" });

  return (
    <div className="group relative rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-sm transition-all hover:shadow-md hover:border-slate-300 dark:border-white/10 dark:bg-slate-900/60 dark:hover:border-white/20">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl shadow-sm",
            shift.is_night_shift ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white" : "bg-gradient-to-br from-cyan-500 to-sky-600 text-white"
          )}>
            {shift.is_flexible ? <Zap className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">{shift.name}</h3>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
              {shift.is_flexible
                ? `${shift.min_daily_hours ?? "?"}–${shift.max_daily_hours ?? "?"}s esnek`
                : `${formatTime(shift.start_time)} – ${formatTime(shift.end_time)}`}
            </p>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button type="button" onClick={onEdit} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white">
            <Pencil className="h-4 w-4" />
          </button>
          <button type="button" onClick={onDelete} className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-300">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {badges.map((b) => (
            <span key={b.label} className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", b.color)}>
              {b.label}
            </span>
          ))}
        </div>
      )}

      {/* Stats Grid */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-white/5">
          <span className="text-slate-500 dark:text-slate-400">Giriş Toleransı</span>
          <p className="font-bold text-slate-900 dark:text-white">{shift.entry_tolerance ?? 15} dk</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-white/5">
          <span className="text-slate-500 dark:text-slate-400">Çıkış Toleransı</span>
          <p className="font-bold text-slate-900 dark:text-white">{shift.exit_tolerance ?? 15} dk</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-white/5">
          <span className="text-slate-500 dark:text-slate-400"><Coffee className="inline h-3 w-3 mr-1" />Mola</span>
          <p className="font-bold text-slate-900 dark:text-white">{shift.break_minutes ?? 15} dk</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-white/5">
          <span className="text-slate-500 dark:text-slate-400"><UtensilsCrossed className="inline h-3 w-3 mr-1" />Yemek</span>
          <p className="font-bold text-slate-900 dark:text-white">{shift.meal_minutes ?? 30} dk</p>
        </div>
      </div>

      {shift.working_hours != null && (
        <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs dark:bg-emerald-500/10">
          <span className="text-emerald-600 dark:text-emerald-400">Toplam Çalışma: <strong>{shift.working_hours} saat</strong></span>
        </div>
      )}
    </div>
  );
}

function ShiftSwapsList({ companyId }: { companyId: string }) {
  const [swaps, setSwaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSwaps = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("shift_swaps")
      .select("*, requester:employees!requester_id(full_name), target:employees!target_id(full_name)")
      .eq("company_id", companyId)
      .eq("status", "pending_manager")
      .order("created_at", { ascending: false });
    if (data) setSwaps(data);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    loadSwaps();
  }, [loadSwaps]);

  const handleApprove = async (id: string, accept: boolean) => {
    const status = accept ? "approved" : "rejected";
    await supabase.from("shift_swaps").update({ status }).eq("id", id);
    loadSwaps();
  };

  if (loading) return <div className="text-sm text-slate-500 py-4"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Yükleniyor...</div>;
  if (swaps.length === 0) return <div className="text-sm text-slate-500 py-4">Bekleyen takas talebi yok.</div>;

  return (
    <ul className="space-y-3">
      {swaps.map((s) => (
        <li key={s.id} className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-sm dark:border-indigo-500/30 dark:bg-indigo-500/5 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {s.requester?.full_name} <ArrowLeftRight className="inline h-3 w-3 text-slate-400 mx-1" /> {s.target?.full_name}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Tarih: {new Date(s.date_requested).toLocaleDateString("tr-TR")} {s.reason && ` | Mazeret: "${s.reason}"`}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="text-rose-600 hover:text-rose-700" onClick={() => handleApprove(s.id, false)}>
              <XIcon className="mr-1 h-3 w-3" /> Reddet
            </Button>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => handleApprove(s.id, true)}>
              <Check className="mr-1 h-3 w-3" /> Onayla
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function EditDialog({
  row,
  companyId,
  onClose,
  onSaved,
}: {
  row: Shift | null;
  companyId: string;
  onClose: () => void;
  onSaved: (updated: Shift) => void;
}) {
  const [form, setForm] = useState<ShiftFormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (row) {
      setForm(shiftToForm(row));
      setError(null);
    }
  }, [row]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!row) return;
    if (form.name.trim().length < 2) {
      setError("Ad en az 2 karakter");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = formToPayload(form, companyId);
    const { data, error: updateError } = await supabase
      .from("shifts")
      .update(payload)
      .eq("id", row.id)
      .select()
      .single();
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    onSaved(data);
  };

  return (
    <Dialog open={row !== null} onOpenChange={(next) => !next && onClose()} title="Vardiyayı Düzenle" className="max-w-xl sm:max-w-xl">
      <form onSubmit={handleSave} className="space-y-5">
        <ShiftFormFields form={form} setForm={setForm} disabled={saving} />
        {error && <p className="text-xs text-rose-500">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Vazgeç</Button>
          <Button type="submit" disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Kaydet
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

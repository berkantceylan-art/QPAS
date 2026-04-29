import { useEffect, useState, useCallback } from "react";
import {
  AlertCircle,
  Clock,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Dialog } from "@/components/ui/Dialog";
import { supabase, type Shift } from "@/lib/supabase";
import EntityRow from "./EntityRow";
import { Check, X as XIcon, ArrowLeftRight } from "lucide-react";

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

export default function ShiftsPanel({ companyId, data, onChange }: Props) {
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [grace, setGrace] = useState(String(DEFAULT_GRACE));
  const [isFlexible, setIsFlexible] = useState(false);
  const [minHours, setMinHours] = useState("");
  const [maxHours, setMaxHours] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Shift | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError("Ad en az 2 karakter");
      return;
    }
    setCreating(true);
    setError(null);
    const graceNum = parseNumberOrNull(grace);
    const { data: created, error: insertError } = await supabase
      .from("shifts")
      .insert({
        company_id: companyId,
        name: trimmedName,
        start_time: isFlexible ? null : startTime || null,
        end_time: isFlexible ? null : endTime || null,
        grace_period_minutes: graceNum != null ? Math.round(graceNum) : DEFAULT_GRACE,
        is_flexible: isFlexible,
        min_daily_hours: isFlexible ? parseNumberOrNull(minHours) : null,
        max_daily_hours: isFlexible ? parseNumberOrNull(maxHours) : null,
      })
      .select()
      .single();
    setCreating(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    onChange([...data, created].sort((a, b) => a.name.localeCompare(b.name)));
    setName("");
    setStartTime("");
    setEndTime("");
    setGrace(String(DEFAULT_GRACE));
    setIsFlexible(false);
    setMinHours("");
    setMaxHours("");
  };

  const handleDelete = async (row: Shift) => {
    if (!confirm(`"${row.name}" vardiyasını silmek istediğine emin misin?`))
      return;
    const { error: delError } = await supabase
      .from("shifts")
      .delete()
      .eq("id", row.id);
    if (delError) {
      setError(delError.message);
      return;
    }
    onChange(data.filter((d) => d.id !== row.id));
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleCreate}
        className="space-y-3 rounded-xl border border-slate-200/70 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5"
      >
        <div className="grid gap-3 sm:grid-cols-[1.5fr_auto]">
          <div className="space-y-1.5">
            <Label htmlFor="new-shift-name">Vardiya Adı</Label>
            <Input
              id="new-shift-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="örn. Gündüz"
              disabled={creating}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="block">Esnek</Label>
            <label
              className={`flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm transition-colors ${
                isFlexible
                  ? "border-cyan-500/60 bg-cyan-500/10 text-slate-900 dark:text-white"
                  : "border-slate-200 bg-white/70 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
              }`}
            >
              <input
                type="checkbox"
                checked={isFlexible}
                onChange={(e) => setIsFlexible(e.target.checked)}
                className="h-3.5 w-3.5"
              />
              <Zap className="h-4 w-4" />
              {isFlexible ? "Açık" : "Kapalı"}
            </label>
          </div>
        </div>

        {isFlexible ? (
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="new-shift-min">Min. saat / gün</Label>
              <Input
                id="new-shift-min"
                type="number"
                step="0.5"
                min="0"
                value={minHours}
                onChange={(e) => setMinHours(e.target.value)}
                placeholder="örn. 6"
                disabled={creating}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-shift-max">Max. saat / gün</Label>
              <Input
                id="new-shift-max"
                type="number"
                step="0.5"
                min="0"
                value={maxHours}
                onChange={(e) => setMaxHours(e.target.value)}
                placeholder="örn. 10"
                disabled={creating}
              />
            </div>
            <Button type="submit" disabled={creating} className="gap-1.5">
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Ekle
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_120px_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="new-shift-start">Başlangıç</Label>
              <Input
                id="new-shift-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={creating}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-shift-end">Bitiş</Label>
              <Input
                id="new-shift-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={creating}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-shift-grace">Tolerans (dk)</Label>
              <Input
                id="new-shift-grace"
                type="number"
                min="0"
                max="240"
                value={grace}
                onChange={(e) => setGrace(e.target.value)}
                placeholder="15"
                disabled={creating}
              />
            </div>
            <Button type="submit" disabled={creating} className="gap-1.5">
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Ekle
            </Button>
          </div>
        )}

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Esnek vardiyada gerçek giriş/çıkış süresi üzerinden hesap yapılır
          (gece 22:00-06:00 arası saatler ×1.5, haftalık 45 saat üstü mesai
          sayılır).
        </p>
      </form>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
          <span>{error}</span>
        </div>
      )}

      {data.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white/40 p-6 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
          Henüz vardiya tanımlı değil.
        </p>
      ) : (
        <ul className="space-y-2">
          {data.map((d) => (
            <EntityRow
              key={d.id}
              title={d.name}
              meta={
                d.is_flexible ? (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-0.5 font-mono text-amber-700 dark:text-amber-300">
                    <Zap className="h-3 w-3" />
                    Esnek
                    {d.min_daily_hours != null || d.max_daily_hours != null
                      ? ` · ${d.min_daily_hours ?? "?"}-${d.max_daily_hours ?? "?"}s`
                      : ""}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 font-mono">
                    <Clock className="h-3 w-3" />
                    {formatTime(d.start_time)} – {formatTime(d.end_time)} ·{" "}
                    {d.grace_period_minutes ?? DEFAULT_GRACE}dk tolerans
                  </span>
                )
              }
              actions={
                <>
                  <button
                    type="button"
                    onClick={() => setEditing(d)}
                    aria-label="Düzenle"
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(d)}
                    aria-label="Sil"
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              }
            />
          ))}
        </ul>
      )}

      <EditDialog
        row={editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) => {
          onChange(
            data
              .map((d) => (d.id === updated.id ? updated : d))
              .sort((a, b) => a.name.localeCompare(b.name)),
          );
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
      {swaps.map(s => (
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
  onClose,
  onSaved,
}: {
  row: Shift | null;
  onClose: () => void;
  onSaved: (updated: Shift) => void;
}) {
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [grace, setGrace] = useState(String(DEFAULT_GRACE));
  const [isFlexible, setIsFlexible] = useState(false);
  const [minHours, setMinHours] = useState("");
  const [maxHours, setMaxHours] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (row) {
      setName(row.name);
      setStartTime(row.start_time?.slice(0, 5) ?? "");
      setEndTime(row.end_time?.slice(0, 5) ?? "");
      setGrace(String(row.grace_period_minutes ?? DEFAULT_GRACE));
      setIsFlexible(row.is_flexible);
      setMinHours(row.min_daily_hours != null ? String(row.min_daily_hours) : "");
      setMaxHours(row.max_daily_hours != null ? String(row.max_daily_hours) : "");
      setError(null);
    }
  }, [row]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!row) return;
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError("Ad en az 2 karakter");
      return;
    }
    setSaving(true);
    setError(null);
    const graceNum = parseNumberOrNull(grace);
    const { data, error: updateError } = await supabase
      .from("shifts")
      .update({
        name: trimmedName,
        start_time: isFlexible ? null : startTime || null,
        end_time: isFlexible ? null : endTime || null,
        grace_period_minutes:
          graceNum != null ? Math.round(graceNum) : DEFAULT_GRACE,
        is_flexible: isFlexible,
        min_daily_hours: isFlexible ? parseNumberOrNull(minHours) : null,
        max_daily_hours: isFlexible ? parseNumberOrNull(maxHours) : null,
      })
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
    <Dialog
      open={row !== null}
      onOpenChange={(next) => !next && onClose()}
      title="Vardiyayı Düzenle"
    >
      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="edit-shift-name">Ad</Label>
          <Input
            id="edit-shift-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving}
            autoFocus
          />
        </div>

        <label
          className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
            isFlexible
              ? "border-cyan-500/60 bg-cyan-500/10 text-slate-900 dark:text-white"
              : "border-slate-200 bg-white/70 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
          }`}
        >
          <input
            type="checkbox"
            checked={isFlexible}
            onChange={(e) => setIsFlexible(e.target.checked)}
            className="h-3.5 w-3.5"
          />
          <Zap className="h-4 w-4" />
          Esnek vardiya (sabit saat yok)
        </label>

        {isFlexible ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-shift-min">Min. saat / gün</Label>
              <Input
                id="edit-shift-min"
                type="number"
                step="0.5"
                min="0"
                value={minHours}
                onChange={(e) => setMinHours(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-shift-max">Max. saat / gün</Label>
              <Input
                id="edit-shift-max"
                type="number"
                step="0.5"
                min="0"
                value={maxHours}
                onChange={(e) => setMaxHours(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-shift-start">Başlangıç</Label>
                <Input
                  id="edit-shift-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-shift-end">Bitiş</Label>
                <Input
                  id="edit-shift-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-shift-grace">Tolerans (dakika)</Label>
              <Input
                id="edit-shift-grace"
                type="number"
                min="0"
                max="240"
                value={grace}
                onChange={(e) => setGrace(e.target.value)}
                disabled={saving}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Geç giriş veya erken çıkışta esnek tutulacak süre.
              </p>
            </div>
          </div>
        )}
        {error && <p className="text-xs text-rose-500">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={saving}
          >
            Vazgeç
          </Button>
          <Button type="submit" disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Kaydet
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

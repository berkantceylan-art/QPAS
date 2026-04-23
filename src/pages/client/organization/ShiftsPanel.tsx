import { useEffect, useState } from "react";
import { AlertCircle, Clock, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Dialog } from "@/components/ui/Dialog";
import { supabase, type Shift } from "@/lib/supabase";
import EntityRow from "./EntityRow";

type Props = {
  companyId: string;
  data: Shift[];
  onChange: (next: Shift[]) => void;
};

function formatTime(t: string | null): string {
  return t ? t.slice(0, 5) : "—";
}

export default function ShiftsPanel({ companyId, data, onChange }: Props) {
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
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
    const { data: created, error: insertError } = await supabase
      .from("shifts")
      .insert({
        company_id: companyId,
        name: trimmedName,
        start_time: startTime || null,
        end_time: endTime || null,
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
        className="grid gap-2 rounded-xl border border-slate-200/70 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5 sm:grid-cols-[1.5fr_1fr_1fr_auto] sm:items-end"
      >
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
        <Button type="submit" disabled={creating} className="gap-1.5">
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Ekle
        </Button>
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
                <span className="inline-flex items-center gap-1.5 font-mono">
                  <Clock className="h-3 w-3" />
                  {formatTime(d.start_time)} – {formatTime(d.end_time)}
                </span>
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
    </div>
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (row) {
      setName(row.name);
      setStartTime(row.start_time?.slice(0, 5) ?? "");
      setEndTime(row.end_time?.slice(0, 5) ?? "");
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
    const { data, error: updateError } = await supabase
      .from("shifts")
      .update({
        name: trimmedName,
        start_time: startTime || null,
        end_time: endTime || null,
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

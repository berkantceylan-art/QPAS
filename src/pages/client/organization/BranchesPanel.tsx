import { useEffect, useState } from "react";
import { AlertCircle, Loader2, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Dialog } from "@/components/ui/Dialog";
import { supabase, type Branch } from "@/lib/supabase";
import EntityRow from "./EntityRow";

type Props = {
  companyId: string;
  data: Branch[];
  onChange: (next: Branch[]) => void;
};

export default function BranchesPanel({ companyId, data, onChange }: Props) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Branch | null>(null);

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
      .from("branches")
      .insert({
        company_id: companyId,
        name: trimmedName,
        address: address.trim() || null,
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
    setAddress("");
  };

  const handleDelete = async (row: Branch) => {
    if (!confirm(`"${row.name}" şubesini silmek istediğine emin misin?`))
      return;
    const { error: delError } = await supabase
      .from("branches")
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
        className="grid gap-2 rounded-xl border border-slate-200/70 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end"
      >
        <div className="space-y-1.5">
          <Label htmlFor="new-branch-name">Şube Adı</Label>
          <Input
            id="new-branch-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="örn. İstanbul Merkez"
            disabled={creating}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-branch-address">Adres (opsiyonel)</Label>
          <Input
            id="new-branch-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Adres…"
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
          Henüz şube tanımlı değil.
        </p>
      ) : (
        <ul className="space-y-2">
          {data.map((d) => (
            <EntityRow
              key={d.id}
              title={d.name}
              subtitle={d.address ?? undefined}
              meta={
                d.address && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
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
    </div>
  );
}

function EditDialog({
  row,
  onClose,
  onSaved,
}: {
  row: Branch | null;
  onClose: () => void;
  onSaved: (updated: Branch) => void;
}) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (row) {
      setName(row.name);
      setAddress(row.address ?? "");
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
      .from("branches")
      .update({ name: trimmedName, address: address.trim() || null })
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
      title="Şubeyi Düzenle"
    >
      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="edit-branch-name">Ad</Label>
          <Input
            id="edit-branch-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving}
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-branch-address">Adres</Label>
          <Input
            id="edit-branch-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={saving}
          />
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

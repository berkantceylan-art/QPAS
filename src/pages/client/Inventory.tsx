import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Box, Laptop, Loader2, Plus, Smartphone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Dialog } from "@/components/ui/Dialog";
import { PORTALS } from "@/lib/portals";
import { cn } from "@/lib/utils";
import { supabase, type InventoryItem } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

const ICONS: Record<string, React.ReactNode> = {
  Bilgisayar: <Laptop className="h-4 w-4" />,
  Telefon: <Smartphone className="h-4 w-4" />,
  "Diğer": <Box className="h-4 w-4" />,
};

function formatTRY(amount: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function Inventory() {
  const portal = PORTALS.client;
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("inventory")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    
    if (err) setError(err.message);
    else setItems(data as InventoryItem[]);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (row: InventoryItem) => {
    if (!confirm(`"${row.item_name}" demirbaşını silmek istediğinize emin misiniz?`)) return;
    const { error: delError } = await supabase.from("inventory").delete().eq("id", row.id);
    if (delError) setError(delError.message);
    else setItems((prev) => prev.filter((i) => i.id !== row.id));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={cn("text-sm font-semibold uppercase tracking-[0.18em]", portal.accentEyebrow)}>
            Operasyon
          </p>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            <Box className="h-7 w-7 text-sky-500" />
            Zimmet & Demirbaş
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Firma envanterini yönetin ve personellere zimmet ataması yapın.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Yeni Demirbaş
        </Button>
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
          Yükleniyor…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/40 p-12 text-center dark:border-white/10 dark:bg-white/5">
          <Box className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">Henüz demirbaş eklenmemiş.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
                    {ICONS[item.category] || ICONS["Diğer"]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{item.item_name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">S/N: {item.serial_no || "Belirtilmemiş"}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(item)}
                  className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className={cn(
                  "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
                  item.status === "available" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
                  item.status === "assigned" && "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
                  item.status === "maintenance" && "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400",
                )}>
                  {item.status === "available" ? "Müsait" : item.status === "assigned" ? "Zimmetli" : "Bakımda"}
                </span>
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                  {formatTRY(item.value)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {dialogOpen && companyId && (
        <CreateDialog
          companyId={companyId}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSuccess={load}
        />
      )}
    </div>
  );
}

function CreateDialog({ companyId, open, onClose, onSuccess }: { companyId: string; open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [serial, setSerial] = useState("");
  const [category, setCategory] = useState("Bilgisayar");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("inventory").insert({
      company_id: companyId,
      item_name: name,
      serial_no: serial,
      category,
      value: Number(value) || 0,
    });
    setLoading(false);
    if (!error) {
      onSuccess();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} title="Yeni Demirbaş Ekle">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Demirbaş Adı</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="MacBook Pro M2" required disabled={loading} />
        </div>
        <div className="space-y-1.5">
          <Label>Seri No</Label>
          <Input value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="C02....." disabled={loading} />
        </div>
        <div className="space-y-1.5">
          <Label>Kategori</Label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 dark:border-white/10 dark:bg-slate-900 dark:focus:border-cyan-400 dark:focus:ring-cyan-400"
          >
            <option>Bilgisayar</option>
            <option>Telefon</option>
            <option>Araç</option>
            <option>Diğer</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Tahmini Değer (₺)</Label>
          <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} disabled={loading} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>İptal</Button>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ekle"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

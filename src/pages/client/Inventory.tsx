import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Box,
  Car,
  CheckCircle2,
  Edit3,
  Laptop,
  Loader2,
  Monitor,
  Package,
  Plus,
  Search,
  Smartphone,
  Tablet,
  Trash2,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Dialog } from "@/components/ui/Dialog";
import { PORTALS } from "@/lib/portals";
import { cn } from "@/lib/utils";
import { supabase, type InventoryItem, type Employee } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

const CATEGORIES = [
  { value: "Bilgisayar", label: "Bilgisayar", icon: Laptop },
  { value: "Telefon", label: "Telefon", icon: Smartphone },
  { value: "Tablet", label: "Tablet", icon: Tablet },
  { value: "Monitör", label: "Monitör", icon: Monitor },
  { value: "Araç", label: "Araç", icon: Car },
  { value: "Aksesuar", label: "Aksesuar", icon: Package },
  { value: "Mobilya", label: "Mobilya", icon: Box },
  { value: "Diğer", label: "Diğer", icon: Box },
] as const;

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  available: { label: "Müsait", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" },
  assigned: { label: "Zimmetli", color: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" },
  maintenance: { label: "Bakımda", color: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400" },
  retired: { label: "Emekli", color: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400" },
};

const CONDITION_MAP: Record<string, { label: string; color: string }> = {
  new: { label: "Sıfır", color: "text-emerald-600" },
  good: { label: "İyi", color: "text-sky-600" },
  fair: { label: "Orta", color: "text-amber-600" },
  poor: { label: "Kötü", color: "text-orange-600" },
  broken: { label: "Arızalı", color: "text-rose-600" },
};

function formatTRY(amount: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 0 }).format(amount);
}

function getCategoryIcon(cat: string) {
  const found = CATEGORIES.find((c) => c.value === cat);
  const Icon = found?.icon || Box;
  return <Icon className="h-5 w-5" />;
}

export default function Inventory() {
  const portal = PORTALS.client;
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    const [itemsRes, empRes] = await Promise.all([
      supabase.from("inventory").select("*").eq("company_id", companyId).order("created_at", { ascending: false }),
      supabase.from("employees").select("id, full_name, status").eq("company_id", companyId).in("status", ["active", "passive"]).order("full_name"),
    ]);
    if (itemsRes.error) setError(itemsRes.error.message);
    else setItems(itemsRes.data as InventoryItem[]);
    if (empRes.data) setEmployees(empRes.data as Employee[]);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (row: InventoryItem) => {
    if (!confirm(`"${row.item_name}" demirbaşını silmek istediğinize emin misiniz?`)) return;
    const { error: delError } = await supabase.from("inventory").delete().eq("id", row.id);
    if (delError) setError(delError.message);
    else setItems((prev) => prev.filter((i) => i.id !== row.id));
  };

  const filtered = items.filter((item) => {
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const haystack = [item.item_name, item.serial_no, item.brand, item.model, item.category, item.notes].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const totalValue = items.reduce((sum, i) => sum + (i.value || 0), 0);
  const assignedCount = items.filter((i) => i.status === "assigned").length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={cn("text-sm font-semibold uppercase tracking-[0.18em]", portal.accentEyebrow)}>Operasyon</p>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            <Box className="h-7 w-7 text-sky-500" />
            Zimmet & Demirbaş
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Firma envanterini yönetin ve personellere zimmet ataması yapın.
          </p>
        </div>
        <Button onClick={() => { setEditingItem(null); setDialogOpen(true); }} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Yeni Demirbaş
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200/70 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
          <p className="text-xs text-slate-500">Toplam Varlık</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{items.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200/70 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
          <p className="text-xs text-slate-500">Zimmetli</p>
          <p className="text-2xl font-black text-amber-600">{assignedCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200/70 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
          <p className="text-xs text-slate-500">Toplam Değer</p>
          <p className="text-2xl font-black text-emerald-600">{formatTRY(totalValue)}</p>
        </div>
        <div className="rounded-xl border border-slate-200/70 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
          <p className="text-xs text-slate-500">Bakımda</p>
          <p className="text-2xl font-black text-rose-600">{items.filter((i) => i.status === "maintenance").length}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ara: ad, marka, seri no..." className="pl-9" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/60 dark:text-white">
          <option value="all">Tüm Durumlar</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/60 dark:text-white">
          <option value="all">Tüm Kategoriler</option>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
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
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/40 p-12 text-center dark:border-white/10 dark:bg-white/5">
          <Box className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{items.length === 0 ? "Henüz demirbaş eklenmemiş." : "Bu filtrede sonuç yok."}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const empName = employees.find((e) => e.id === item.assigned_to)?.full_name;
            return (
              <div key={item.id} className="group rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-sm transition-all hover:shadow-md hover:border-slate-300 dark:border-white/10 dark:bg-slate-900/60 dark:hover:border-white/20">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-sm">
                      {getCategoryIcon(item.category)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">{item.item_name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {[item.brand, item.model].filter(Boolean).join(" ") || item.category}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button onClick={() => { setEditingItem(item); setDialogOpen(true); }} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white">
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(item)} className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-300">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {item.serial_no && (
                  <p className="mt-2 rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-500 dark:bg-white/5 dark:text-slate-400 inline-block">
                    S/N: {item.serial_no}
                  </p>
                )}

                <div className="mt-3 flex items-center justify-between">
                  <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider", STATUS_MAP[item.status]?.color)}>
                    {STATUS_MAP[item.status]?.label}
                  </span>
                  <span className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300">{formatTRY(item.value)}</span>
                </div>

                {(item.condition || empName) && (
                  <div className="mt-3 flex items-center justify-between text-xs">
                    {item.condition && (
                      <span className={cn("font-semibold", CONDITION_MAP[item.condition]?.color)}>
                        {CONDITION_MAP[item.condition]?.label ?? item.condition}
                      </span>
                    )}
                    {empName && (
                      <span className="text-slate-500 dark:text-slate-400">👤 {empName}</span>
                    )}
                  </div>
                )}

                {item.warranty_end && (
                  <p className="mt-2 text-[10px] text-slate-400">
                    <Wrench className="inline h-3 w-3 mr-0.5" />
                    Garanti: {new Date(item.warranty_end).toLocaleDateString("tr-TR")}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {dialogOpen && companyId && (
        <ItemDialog
          companyId={companyId}
          item={editingItem}
          employees={employees}
          open={dialogOpen}
          onClose={() => { setDialogOpen(false); setEditingItem(null); }}
          onSuccess={load}
        />
      )}
    </div>
  );
}

function ItemDialog({
  companyId,
  item,
  employees,
  open,
  onClose,
  onSuccess,
}: {
  companyId: string;
  item: InventoryItem | null;
  employees: Employee[];
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = item !== null;
  const [name, setName] = useState(item?.item_name ?? "");
  const [serial, setSerial] = useState(item?.serial_no ?? "");
  const [brand, setBrand] = useState(item?.brand ?? "");
  const [model, setModel] = useState(item?.model ?? "");
  const [category, setCategory] = useState(item?.category ?? "Bilgisayar");
  const [value, setValue] = useState(item ? String(item.value) : "");
  const [status, setStatus] = useState(item?.status ?? "available");
  const [condition, setCondition] = useState(item?.condition ?? "good");
  const [purchaseDate, setPurchaseDate] = useState(item?.purchase_date ?? "");
  const [warrantyEnd, setWarrantyEnd] = useState(item?.warranty_end ?? "");
  const [assignedTo, setAssignedTo] = useState(item?.assigned_to ?? "");
  const [assignedDate, setAssignedDate] = useState(item?.assigned_date ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      company_id: companyId,
      item_name: name,
      serial_no: serial || null,
      brand: brand || null,
      model: model || null,
      category,
      value: Number(value) || 0,
      status,
      condition,
      purchase_date: purchaseDate || null,
      warranty_end: warrantyEnd || null,
      assigned_to: assignedTo || null,
      assigned_date: assignedDate || null,
      notes: notes || null,
    };

    let res;
    if (isEdit && item) {
      res = await supabase.from("inventory").update(payload).eq("id", item.id);
    } else {
      res = await supabase.from("inventory").insert(payload);
    }
    setLoading(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    onSuccess();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} title={isEdit ? "Demirbaş Düzenle" : "Yeni Demirbaş Ekle"} className="max-w-lg sm:max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5 col-span-2">
            <Label>Demirbaş Adı *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="MacBook Pro M2" required disabled={loading} />
          </div>
          <div className="space-y-1.5">
            <Label>Marka</Label>
            <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Apple" disabled={loading} />
          </div>
          <div className="space-y-1.5">
            <Label>Model</Label>
            <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="M2 Pro 16 inch" disabled={loading} />
          </div>
          <div className="space-y-1.5">
            <Label>Seri No</Label>
            <Input value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="C02....." disabled={loading} />
          </div>
          <div className="space-y-1.5">
            <Label>Kategori</Label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)} disabled={loading}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Durum</Label>
            <Select value={status} onChange={(e) => setStatus(e.target.value as any)} disabled={loading}>
              {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Fiziksel Durum</Label>
            <Select value={condition} onChange={(e) => setCondition(e.target.value as any)} disabled={loading}>
              {Object.entries(CONDITION_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tahmini Değer (₺)</Label>
            <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} disabled={loading} />
          </div>
          <div className="space-y-1.5">
            <Label>Alım Tarihi</Label>
            <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} disabled={loading} />
          </div>
          <div className="space-y-1.5">
            <Label>Garanti Bitiş</Label>
            <Input type="date" value={warrantyEnd} onChange={(e) => setWarrantyEnd(e.target.value)} disabled={loading} />
          </div>
        </div>

        <hr className="border-slate-100 dark:border-white/5" />

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Zimmetli Personel</Label>
            <Select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} disabled={loading}>
              <option value="">— Seçiniz —</option>
              {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Zimmet Tarihi</Label>
            <Input type="date" value={assignedDate} onChange={(e) => setAssignedDate(e.target.value)} disabled={loading} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Notlar</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ek bilgiler..." disabled={loading} />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>İptal</Button>
          <Button type="submit" disabled={loading} className="gap-1.5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? <CheckCircle2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {isEdit ? "Güncelle" : "Ekle"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

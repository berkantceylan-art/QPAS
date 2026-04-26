import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Dialog } from "@/components/ui/Dialog";
import { cardReveal, staggerContainer } from "@/components/motion/variants";
import { PORTALS } from "@/lib/portals";
import { supabase, type Company } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const createSchema = z.object({
  name: z.string().min(2, "En az 2 karakter"),
  slug: z
    .string()
    .min(2, "En az 2 karakter")
    .max(40, "En fazla 40 karakter")
    .regex(/^[a-z0-9-]+$/, "Sadece küçük harf, rakam ve tire kullan"),
});

type CreateValues = z.infer<typeof createSchema>;

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function Companies() {
  const admin = PORTALS.admin;
  const [rows, setRows] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchCompanies = async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      setLoadError(error.message);
    } else {
      setRows(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleCreated = (created: Company) => {
    setRows((prev) => [created, ...prev]);
  };

  const handleSaved = (updated: Company) => {
    setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setEditing(null);
  };

  const handleDelete = async (row: Company) => {
    if (
      !confirm(
        `"${row.name}" firmasını silmek üzeresin. Tüm bağlı çalışanlar, departmanlar ve ilgili kayıtlar SİLİNECEK. Devam edilsin mi?`,
      )
    )
      return;
    setActionError(null);
    const { error } = await supabase
      .from("companies")
      .delete()
      .eq("id", row.id);
    if (error) {
      setActionError(error.message);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p
            className={cn(
              "text-sm font-semibold uppercase tracking-[0.18em]",
              admin.accentEyebrow,
            )}
          >
            Modül
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Firmalar
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Müşteri şirketlerini oluştur ve yönet.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchCompanies}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw
              className={cn("h-4 w-4", loading && "animate-spin")}
            />
            Yenile
          </Button>
          <Button
            size="sm"
            onClick={() => setOpen(true)}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Yeni Firma
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
          <span>{loadError}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500 dark:text-slate-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Yükleniyor…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center dark:border-white/10 dark:bg-slate-900/40">
          <Building2 className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">
            Henüz firma yok.
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Yeni bir firma oluşturmak için yukarıdaki butonu kullan.
          </p>
        </div>
      ) : (
        <motion.ul
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="space-y-2"
        >
          {rows.map((row) => (
            <motion.li
              key={row.id}
              variants={cardReveal}
              className="flex items-center gap-4 rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3.5 shadow-sm transition-shadow hover:shadow-md dark:border-white/10 dark:bg-slate-900/60"
            >
              <span
                className={cn(
                  "flex h-10 w-10 flex-none items-center justify-center rounded-full bg-gradient-to-br text-sm font-semibold text-white shadow-md ring-1 ring-white/20",
                  admin.accentGradient,
                )}
              >
                <Building2 className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {row.name}
                </p>
                <p className="truncate font-mono text-xs text-slate-500 dark:text-slate-400">
                  {row.slug}
                </p>
              </div>
              <span
                className={cn(
                  "hidden sm:inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider",
                  row.status === "active"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                    : "bg-slate-500/10 text-slate-600 dark:text-slate-300",
                )}
              >
                {row.status === "active" ? "Aktif" : "Pasif"}
              </span>
              <span className="hidden md:inline text-xs text-slate-500 dark:text-slate-400">
                {formatDate(row.created_at)}
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEditing(row)}
                  aria-label="Düzenle"
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(row)}
                  aria-label="Sil"
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      )}

      {actionError && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
          <span>{actionError}</span>
        </div>
      )}

      <CreateCompanyDialog
        open={open}
        onOpenChange={setOpen}
        onCreated={handleCreated}
      />

      <EditCompanyDialog
        company={editing}
        onClose={() => setEditing(null)}
        onSaved={handleSaved}
      />
    </div>
  );
}

function EditCompanyDialog({
  company,
  onClose,
  onSaved,
}: {
  company: Company | null;
  onClose: () => void;
  onSaved: (updated: Company) => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState<Company["status"]>("active");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (company) {
      setName(company.name);
      setSlug(company.slug);
      setStatus(company.status);
      setError(null);
    }
  }, [company]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    if (name.trim().length < 2) {
      setError("Ad en az 2 karakter");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      setError("Slug sadece küçük harf, rakam ve tire içerebilir");
      return;
    }
    setSaving(true);
    setError(null);
    const { data, error: updateError } = await supabase
      .from("companies")
      .update({ name: name.trim(), slug: slug.trim(), status })
      .eq("id", company.id)
      .select()
      .single();
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    onSaved(data as Company);
  };

  return (
    <Dialog
      open={company !== null}
      onOpenChange={(next) => !next && onClose()}
      title="Firmayı Düzenle"
    >
      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="edit-co-name">Firma Adı</Label>
          <Input
            id="edit-co-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving}
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-co-slug">Slug</Label>
          <Input
            id="edit-co-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="font-mono"
            disabled={saving}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-co-status">Durum</Label>
          <select
            id="edit-co-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as Company["status"])}
            disabled={saving}
            className="flex h-10 w-full rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/60 dark:text-white"
          >
            <option value="active">Aktif</option>
            <option value="suspended">Pasif (askıya alındı)</option>
          </select>
        </div>
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
            <span>{error}</span>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
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

function CreateCompanyDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (created: Company) => void;
}) {
  const [apiError, setApiError] = useState<string | null>(null);
  const [result, setResult] = useState<Company | null>(null);
  const [manualSlugEdit, setManualSlugEdit] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      name: "",
      slug: "",
    },
  });

  const nameValue = watch("name");

  useEffect(() => {
    if (!open) {
      setApiError(null);
      setResult(null);
      setManualSlugEdit(false);
      reset();
    }
  }, [open, reset]);

  useEffect(() => {
    if (!manualSlugEdit && nameValue) {
      const auto = nameValue
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setValue("slug", auto);
    }
  }, [nameValue, manualSlugEdit, setValue]);

  const onSubmit = async (values: CreateValues) => {
    setApiError(null);
    const { data, error } = await supabase
      .from("companies")
      .insert({
        name: values.name,
        slug: values.slug,
      })
      .select()
      .single();
    if (error) {
      setApiError(error.message);
      return;
    }
    if (!data) {
      setApiError("Beklenmeyen yanıt");
      return;
    }
    setResult(data);
    onCreated(data);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={result ? "Firma oluşturuldu" : "Yeni Firma"}
      description={
        result
          ? "Firma başarıyla oluşturuldu."
          : "Yeni bir müşteri şirketi oluştur."
      }
    >
      {result ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 flex-none" />
            <span>
              <span className="font-semibold">{result.name}</span> firması
              hazır.
            </span>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Firma Adı
                </p>
                <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                  {result.name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-4 w-4 text-slate-400" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Slug
                </p>
                <p className="truncate font-mono text-sm font-medium text-slate-900 dark:text-white">
                  {result.slug}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" onClick={() => onOpenChange(false)}>
              Kapat
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Firma Adı</Label>
            <Input
              id="name"
              invalid={!!errors.name}
              placeholder="Örn. Acme Inc."
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-rose-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="slug">
              Slug
              {!manualSlugEdit && (
                <button
                  type="button"
                  className="ml-2 text-xs text-slate-500 underline hover:text-slate-700 dark:hover:text-slate-300"
                  onClick={() => setManualSlugEdit(true)}
                >
                  (elle düzenle)
                </button>
              )}
            </Label>
            <Input
              id="slug"
              invalid={!!errors.slug}
              placeholder="acme-inc"
              {...register("slug", {
                onBlur: () => {
                  if (watch("slug")) setManualSlugEdit(true);
                },
              })}
            />
            {errors.slug && (
              <p className="text-xs text-rose-500">{errors.slug.message}</p>
            )}
          </div>

          {apiError && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
              <span>{apiError}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Vazgeç
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-1.5">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Oluşturuluyor…
                </>
              ) : (
                <>
                  <Building2 className="h-4 w-4" />
                  Oluştur
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

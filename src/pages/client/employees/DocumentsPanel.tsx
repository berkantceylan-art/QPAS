import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  Download,
  FileText,
  HeartPulse,
  Loader2,
  ScrollText,
  ShieldAlert,
  Trash2,
  Upload,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  supabase,
  type DocType,
  type Employee,
  type EmployeeDocument,
} from "@/lib/supabase";
import { cn } from "@/lib/utils";

const BUCKET = "employee-documents";
const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/jpg",
];

const CANONICAL_TYPES: {
  type: DocType;
  label: string;
  desc: string;
  icon: typeof FileText;
}[] = [
  {
    type: "identity",
    label: "Kimlik Fotokopisi",
    desc: "TC kimlik / pasaport",
    icon: BadgeCheck,
  },
  {
    type: "health_report",
    label: "Sağlık Raporu",
    desc: "İşe giriş muayenesi",
    icon: HeartPulse,
  },
  {
    type: "contract",
    label: "İş Sözleşmesi",
    desc: "İmzalı kopya",
    icon: ScrollText,
  },
  {
    type: "criminal_record",
    label: "Adli Sicil Kaydı",
    desc: "Son 6 ay",
    icon: ShieldAlert,
  },
];

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^\w.\-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);
}

function formatSize(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Props = {
  employee: Employee;
};

export default function DocumentsPanel({ employee }: Props) {
  const [docs, setDocs] = useState<EmployeeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("employee_documents")
      .select("*")
      .eq("employee_id", employee.id)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (fetchError) {
      setError(fetchError.message);
      return;
    }
    setDocs((data as EmployeeDocument[]) ?? []);
  }, [employee.id]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleUpload = async (type: DocType, file: File, slotKey: string) => {
    setError(null);
    setSuccess(null);
    if (!ALLOWED_MIME.includes(file.type)) {
      setError("Sadece PDF, JPG veya PNG yüklenebilir");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("Dosya 10MB'dan büyük olamaz");
      return;
    }

    setUploading(slotKey);
    try {
      // For canonical types, remove the existing doc first (keep one per slot)
      if (type !== "other") {
        const existing = docs.find((d) => d.doc_type === type);
        if (existing) {
          await supabase.storage.from(BUCKET).remove([existing.file_path]);
          await supabase
            .from("employee_documents")
            .delete()
            .eq("id", existing.id);
        }
      }

      const docId = crypto.randomUUID();
      const safeName = sanitizeFileName(file.name);
      const path = `${employee.company_id}/${employee.id}/${docId}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data: inserted, error: insertError } = await supabase
        .from("employee_documents")
        .insert({
          employee_id: employee.id,
          company_id: employee.company_id,
          doc_type: type,
          file_path: path,
          file_name: file.name,
          mime_type: file.type,
          size_bytes: file.size,
        })
        .select()
        .single();

      if (insertError) {
        // roll back storage upload
        await supabase.storage.from(BUCKET).remove([path]);
        throw insertError;
      }

      setDocs((prev) => [inserted as EmployeeDocument, ...prev]);
      setSuccess(`${file.name} yüklendi.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError((e as Error).message || "Yükleme başarısız");
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (doc: EmployeeDocument) => {
    if (!confirm(`"${doc.file_name}" silinsin mi?`)) return;
    setError(null);
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([doc.file_path]);
    if (storageError) {
      setError(storageError.message);
      return;
    }
    const { error: dbError } = await supabase
      .from("employee_documents")
      .delete()
      .eq("id", doc.id);
    if (dbError) {
      setError(dbError.message);
      return;
    }
    setDocs((prev) => prev.filter((d) => d.id !== doc.id));
  };

  const handleDownload = async (doc: EmployeeDocument) => {
    const { data, error: urlError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(doc.file_path, 60);
    if (urlError || !data) {
      setError(urlError?.message || "İndirme bağlantısı oluşturulamadı");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const otherDocs = docs.filter((d) => d.doc_type === "other");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-500 dark:text-slate-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Belgeler yükleniyor…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {CANONICAL_TYPES.map(({ type, label, desc, icon: Icon }) => {
          const doc = docs.find((d) => d.doc_type === type);
          const slotKey = `canonical-${type}`;
          return (
            <DocSlot
              key={type}
              label={label}
              desc={desc}
              icon={<Icon className="h-5 w-5" />}
              doc={doc}
              uploading={uploading === slotKey}
              onPickFile={(file) => handleUpload(type, file, slotKey)}
              onDelete={doc ? () => handleDelete(doc) : undefined}
              onDownload={doc ? () => handleDownload(doc) : undefined}
            />
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-200/70 bg-white/80 p-4 dark:border-white/10 dark:bg-slate-900/60">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Diğer Belgeler
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Kategori dışı ekler ({otherDocs.length})
            </p>
          </div>
          <OtherUploadButton
            uploading={uploading === "other"}
            onPickFile={(file) => handleUpload("other", file, "other")}
          />
        </div>
        {otherDocs.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
            Henüz ek belge yok.
          </p>
        ) : (
          <ul className="space-y-2">
            {otherDocs.map((d) => (
              <li
                key={d.id}
                className="flex items-center gap-3 rounded-lg border border-slate-200/70 bg-slate-50/70 px-3 py-2 dark:border-white/10 dark:bg-white/5"
              >
                <FileText className="h-4 w-4 flex-none text-slate-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                    {d.file_name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatSize(d.size_bytes)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownload(d)}
                  aria-label="İndir"
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(d)}
                  aria-label="Sil"
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" />
          <span>{success}</span>
        </div>
      )}

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Maks. 10MB · PDF, JPG, PNG · önizleme bağlantıları 60 sn geçerli
      </p>
    </div>
  );
}

function DocSlot({
  label,
  desc,
  icon,
  doc,
  uploading,
  onPickFile,
  onDelete,
  onDownload,
}: {
  label: string;
  desc: string;
  icon: React.ReactNode;
  doc: EmployeeDocument | undefined;
  uploading: boolean;
  onPickFile: (file: File) => void;
  onDelete?: () => void;
  onDownload?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onPickFile(file);
  };

  if (doc) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200/70 bg-emerald-50/40 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/5">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
            {label}
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {doc.file_name} · {formatSize(doc.size_bytes)}
          </p>
        </div>
        <button
          type="button"
          onClick={onDownload}
          aria-label="İndir"
          className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <Download className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label="Değiştir"
          className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Sil"
          className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPickFile(file);
            e.target.value = "";
          }}
        />
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "flex flex-col gap-2 rounded-xl border-2 border-dashed p-4 text-sm transition-colors",
        dragging
          ? "border-cyan-500 bg-cyan-500/10"
          : "border-slate-200 bg-white/50 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {label}
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {desc}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Sürükle bırak veya
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="gap-1.5"
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <UploadCloud className="h-3.5 w-3.5" />
          )}
          Dosya seç
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPickFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function OtherUploadButton({
  uploading,
  onPickFile,
}: {
  uploading: boolean;
  onPickFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="gap-1.5"
      >
        {uploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <UploadCloud className="h-3.5 w-3.5" />
        )}
        Yükle
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPickFile(file);
          e.target.value = "";
        }}
      />
    </>
  );
}

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
  type DocumentRequirement,
} from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { useAuth } from "@/hooks/useAuth";

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
  {
    type: "diploma",
    label: "Diploma",
    desc: "Mezuniyet belgesi",
    icon: FileText,
  },
  {
    type: "military_status",
    label: "Askerlik Durumu",
    desc: "Askerlik belgesi",
    icon: ShieldAlert,
  },
  {
    type: "family_registry",
    label: "Nüfus Kayıt",
    desc: "Vukuatlı nüfus kayıt",
    icon: FileText,
  },
  {
    type: "kvkk_consent",
    label: "KVKK Onayı",
    desc: "İmzalı aydınlatma",
    icon: FileText,
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
  const { profile } = useAuth();
  const [docs, setDocs] = useState<EmployeeDocument[]>([]);
  const [reqs, setReqs] = useState<DocumentRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    const [docsRes, reqsRes] = await Promise.all([
      supabase
        .from("employee_documents")
        .select("*")
        .eq("employee_id", employee.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("document_requirements")
        .select("*")
        .eq("company_id", employee.company_id)
        .or(`department_id.eq.${employee.department_id || null},department_id.is.null`)
        .or(`job_title_id.eq.${employee.job_title_id || null},job_title_id.is.null`)
    ]);
    
    setLoading(false);
    if (docsRes.error) {
      setError(docsRes.error.message);
      return;
    }
    setDocs((docsRes.data as EmployeeDocument[]) ?? []);
    if (reqsRes.data) {
      setReqs(reqsRes.data as DocumentRequirement[]);
    }
  }, [employee.id, employee.company_id, employee.department_id, employee.job_title_id]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleUpload = async (type: DocType, files: FileList | null, slotKey: string) => {
    if (!files || files.length === 0) return;
    if (!ALLOWED_MIME.includes(files[0].type)) {
      setError("Sadece PDF, JPG veya PNG yüklenebilir");
      return;
    }
    
    setUploading(slotKey);
    try {
      let finalFile: File;

      if (files.length === 1 && files[0].type === "application/pdf") {
        finalFile = files[0];
      } else {
        // Merge images to PDF or single image to PDF
        const pdfDoc = await PDFDocument.create();
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const arrayBuffer = await file.arrayBuffer();
          if (file.type === "application/pdf") {
            const loadedPdf = await PDFDocument.load(arrayBuffer);
            const copiedPages = await pdfDoc.copyPages(loadedPdf, loadedPdf.getPageIndices());
            copiedPages.forEach((page) => pdfDoc.addPage(page));
          } else if (file.type.startsWith("image/")) {
            let image;
            if (file.type === "image/jpeg" || file.type === "image/jpg") {
              image = await pdfDoc.embedJpg(arrayBuffer);
            } else if (file.type === "image/png") {
              image = await pdfDoc.embedPng(arrayBuffer);
            }
            if (image) {
              const page = pdfDoc.addPage([image.width, image.height]);
              page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
            }
          }
        }
        const pdfBytes = await pdfDoc.save();
        finalFile = new File([pdfBytes.buffer as ArrayBuffer], `${type}_merged.pdf`, { type: "application/pdf" });
      }

      if (finalFile.size > MAX_SIZE) {
        throw new Error("Dosya 10MB'dan büyük olamaz");
      }
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
      const safeName = sanitizeFileName(finalFile.name);
      const path = `${employee.company_id}/${employee.id}/${docId}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, finalFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: finalFile.type,
        });

      if (uploadError) throw uploadError;

      const { data: inserted, error: insertError } = await supabase
        .from("employee_documents")
        .insert({
          employee_id: employee.id,
          company_id: employee.company_id,
          doc_type: type,
          file_path: path,
          file_name: finalFile.name,
          mime_type: finalFile.type,
          size_bytes: finalFile.size,
          expiry_date: null, // Default
        })
        .select()
        .single();

      if (insertError) {
        // roll back storage upload
        await supabase.storage.from(BUCKET).remove([path]);
        throw insertError;
      }

      setDocs((prev) => [inserted as EmployeeDocument, ...prev]);
      setSuccess(`${finalFile.name} yüklendi.`);
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
    if (profile?.id) {
      await supabase.from("document_audit_logs").insert({
        company_id: employee.company_id,
        user_id: profile.id,
        document_id: doc.id,
        action: "download"
      });
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const handleBulkDownload = async () => {
    if (docs.length === 0) return;
    setLoading(true);
    try {
      const zip = new JSZip();
      for (const doc of docs) {
        const { data } = await supabase.storage.from(BUCKET).download(doc.file_path);
        if (data) {
          zip.file(doc.file_name, data);
          if (profile?.id) {
            await supabase.from("document_audit_logs").insert({
              company_id: employee.company_id,
              user_id: profile.id,
              document_id: doc.id,
              action: "download"
            });
          }
        }
      }
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${employee.full_name.replace(/\s+/g, "_")}_Evraklar.zip`);
    } catch (e) {
      setError("Toplu indirme başarısız oldu.");
    } finally {
      setLoading(false);
    }
  };

  const otherDocs = docs.filter((d) => d.doc_type === "other");

  const requiredCount = reqs.filter(r => r.is_mandatory).length;
  const completedCount = reqs.filter(r => r.is_mandatory && docs.some(d => d.doc_type === r.doc_type)).length;
  const healthScore = requiredCount === 0 ? 100 : Math.round((completedCount / requiredCount) * 100);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-500 dark:text-slate-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Belgeler yükleniyor…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white">Evrak Tamamlanma Oranı</h3>
          <p className="text-sm text-slate-500">Zorunlu belgelere göre uyumluluk skoru</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={cn("text-2xl font-black", healthScore === 100 ? "text-emerald-500" : healthScore > 50 ? "text-amber-500" : "text-rose-500")}>
              %{healthScore}
            </span>
            {healthScore === 100 && <CheckCircle2 className="h-6 w-6 text-emerald-500" />}
          </div>
          {docs.length > 0 && (
            <Button onClick={handleBulkDownload} variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Tümünü İndir (ZIP)
            </Button>
          )}
        </div>
      </div>

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
              onPickFile={(files) => handleUpload(type, files, slotKey)}
              onDelete={doc ? () => handleDelete(doc) : undefined}
              onDownload={doc ? () => handleDownload(doc) : undefined}
              isRequired={reqs.some(r => r.is_mandatory && r.doc_type === type)}
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
            onPickFile={(files) => handleUpload("other", files, "other")}
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
  isRequired,
}: {
  label: string;
  desc: string;
  icon: React.ReactNode;
  doc: EmployeeDocument | undefined;
  uploading: boolean;
  onPickFile: (files: FileList) => void;
  onDelete?: () => void;
  onDownload?: () => void;
  isRequired?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length > 0) onPickFile(e.dataTransfer.files);
  };

  if (doc) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200/70 bg-emerald-50/40 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/5">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
            {label} {isRequired && <span className="text-rose-500">*</span>}
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
          multiple
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) onPickFile(e.target.files);
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
            {label} {isRequired && <span className="text-rose-500">*</span>}
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
        multiple
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onPickFile(e.target.files);
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
  onPickFile: (files: FileList) => void;
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
        multiple
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onPickFile(e.target.files);
          e.target.value = "";
        }}
      />
    </>
  );
}

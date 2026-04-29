import { useCallback, useRef, useState } from "react";
import Papa from "papaparse";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  SkipForward,
  Upload,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { PORTALS } from "@/lib/portals";
import { cn } from "@/lib/utils";
import { supabase, type Employee } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

/* ─── Sabitler ─────────────────────────────────────────── */

const MAPPABLE_FIELDS = [
  { value: "", label: "— Yok say —" },
  { value: "card_id", label: "Kart No / RFID" },
  { value: "employee_no", label: "Sicil No" },
  { value: "national_id", label: "TC Kimlik No" },
  { value: "date", label: "Tarih" },
  { value: "time", label: "Saat" },
  { value: "datetime", label: "Tarih + Saat (birleşik)" },
  { value: "direction", label: "Giriş/Çıkış" },
] as const;

type MappableField = (typeof MAPPABLE_FIELDS)[number]["value"];

type StepId = "upload" | "map" | "result";

type ImportError = { row: number; message: string };

/* ─── Yardımcı fonksiyonlar ───────────────────────────── */

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function tryParseDate(val: string): string | null {
  // ISO, dd.mm.yyyy, dd/mm/yyyy, yyyy-mm-dd
  const cleaned = val.trim();
  if (!cleaned) return null;

  // dd.mm.yyyy veya dd/mm/yyyy
  const dmy = cleaned.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;

  // yyyy-mm-dd
  const ymd = cleaned.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  if (ymd) return `${ymd[1]}-${ymd[2].padStart(2, "0")}-${ymd[3].padStart(2, "0")}`;

  return null;
}

function tryParseTime(val: string): string | null {
  const cleaned = val.trim();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  return `${match[1].padStart(2, "0")}:${match[2]}:${match[3] ?? "00"}`;
}

function tryParseDirection(val: string): "in" | "out" | null {
  const v = val.trim().toLowerCase();
  if (["giriş", "giris", "in", "g", "1", "0"].includes(v)) return "in";
  if (["çıkış", "cikis", "out", "ç", "c", "2"].includes(v)) return "out";
  return null;
}

/* ─── Component ───────────────────────────────────────── */

export default function AttendanceImport() {
  const portal = PORTALS.client;
  const { user, profile } = useAuth();

  /* State */
  const [step, setStep] = useState<StepId>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<MappableField[]>([]);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    errors: ImportError[];
    total: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /* Dosya yükleme */
  const handleFile = useCallback((f: File) => {
    setError(null);
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (ext !== "csv" && ext !== "txt") {
      setError("Sadece .csv ve .txt dosyaları desteklenir.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("Dosya boyutu 10 MB'ı aşamaz.");
      return;
    }

    Papa.parse(f, {
      skipEmptyLines: true,
      complete(results) {
        const rows = results.data as string[][];
        if (rows.length < 2) {
          setError("Dosyada en az 2 satır olmalı.");
          return;
        }
        setFile(f);
        setRawRows(rows);
        // Varsayılan mapping: her sütun "yok say"
        setMapping(Array(rows[0].length).fill(""));
        setStep("map");
      },
      error(err) {
        setError(`Dosya okunamadı: ${err.message}`);
      },
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  /* Eşleme geçerliliği */
  const mappingValid =
    mapping.some((m) => ["card_id", "employee_no", "national_id"].includes(m)) &&
    (mapping.includes("datetime") ||
      (mapping.includes("date") && mapping.includes("time")));

  /* İmport işlemi */
  const runImport = useCallback(async () => {
    if (!file || !profile?.company_id || !user) return;
    setProcessing(true);
    setError(null);

    const companyId = profile.company_id;
    const identifierField = mapping.find((m) =>
      ["card_id", "employee_no", "national_id"].includes(m),
    )!;
    const identifierIdx = mapping.indexOf(identifierField);
    const dateIdx = mapping.indexOf("date");
    const timeIdx = mapping.indexOf("time");
    const datetimeIdx = mapping.indexOf("datetime");
    const dirIdx = mapping.indexOf("direction");

    // Çalışan listesini çek
    const { data: employees } = await supabase
      .from("employees")
      .select("id, rfid_card_id, employee_no, national_id")
      .eq("company_id", companyId);

    const empList = (employees ?? []) as Pick<
      Employee,
      "id" | "rfid_card_id" | "employee_no" | "national_id"
    >[];

    const lookupEmployee = (identifier: string): string | null => {
      const v = identifier.trim();
      if (!v) return null;
      for (const e of empList) {
        if (identifierField === "card_id" && e.rfid_card_id === v) return e.id;
        if (identifierField === "employee_no" && e.employee_no === v) return e.id;
        if (identifierField === "national_id" && e.national_id === v) return e.id;
      }
      return null;
    };

    const imported: Array<{
      employee_id: string;
      logged_at: string;
      log_type: "in" | "out";
    }> = [];
    const errors: ImportError[] = [];
    let skipped = 0;

    // İlk satırı header olarak kabul et (opsiyonel)
    const startRow = rawRows[0].some((cell) => {
      const c = cell.toLowerCase();
      return ["tarih", "saat", "kart", "no", "date", "time", "card"].some((k) =>
        c.includes(k),
      );
    })
      ? 1
      : 0;

    for (let i = startRow; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowNum = i + 1;

      // Identifier
      const empId = lookupEmployee(row[identifierIdx] ?? "");
      if (!empId) {
        errors.push({
          row: rowNum,
          message: `Çalışan bulunamadı: "${row[identifierIdx]}"`,
        });
        continue;
      }

      // Tarih + Saat
      let loggedAt: string | null = null;
      if (datetimeIdx >= 0) {
        // Birleşik datetime
        const parts = (row[datetimeIdx] ?? "").trim().split(/[\s,T]+/);
        const d = tryParseDate(parts[0] ?? "");
        const t = tryParseTime(parts[1] ?? "");
        if (d && t) loggedAt = `${d}T${t}`;
      } else {
        const d = tryParseDate(row[dateIdx] ?? "");
        const t = tryParseTime(row[timeIdx] ?? "");
        if (d && t) loggedAt = `${d}T${t}`;
      }

      if (!loggedAt) {
        errors.push({ row: rowNum, message: "Tarih/Saat parse edilemedi." });
        continue;
      }

      // Giriş/Çıkış
      let logType: "in" | "out" = "in";
      if (dirIdx >= 0) {
        const dir = tryParseDirection(row[dirIdx] ?? "");
        if (dir) logType = dir;
      }

      imported.push({ employee_id: empId, logged_at: loggedAt, log_type: logType });
    }

    // Batch upsert (duplike kontrol: employee_id + logged_at)
    let insertedCount = 0;
    if (imported.length > 0) {
      const BATCH = 200;
      for (let i = 0; i < imported.length; i += BATCH) {
        const batch = imported.slice(i, i + BATCH).map((r) => ({
          company_id: companyId,
          employee_id: r.employee_id,
          method: "manual" as const,
          log_type: r.log_type,
          logged_at: r.logged_at,
          notes: `Import: ${file.name}`,
        }));

        const { data: insertedData, error: insertError } = await supabase
          .from("attendance_logs")
          .upsert(batch, {
            onConflict: "employee_id,logged_at",
            ignoreDuplicates: true,
          })
          .select("id");

        if (insertError) {
          // Duplike hata olabilir, devam et
          skipped += batch.length;
        } else {
          insertedCount += insertedData?.length ?? 0;
          skipped += batch.length - (insertedData?.length ?? 0);
        }
      }
    }

    const total = rawRows.length - startRow;

    // import_jobs tablosuna kaydet
    await supabase.from("import_jobs").insert({
      company_id: companyId,
      uploaded_by: user.id,
      file_name: file.name,
      file_size_bytes: file.size,
      status: errors.length > 0 && insertedCount === 0 ? "failed" : "completed",
      total_rows: total,
      imported_rows: insertedCount,
      skipped_rows: skipped,
      error_rows: errors.length,
      errors: errors.slice(0, 100),
      column_mapping: Object.fromEntries(mapping.map((m, i) => [String(i), m])),
      completed_at: new Date().toISOString(),
    });

    setResult({ imported: insertedCount, skipped, errors, total });
    setStep("result");
    setProcessing(false);
  }, [file, mapping, rawRows, profile, user]);

  /* Reset */
  const reset = () => {
    setStep("upload");
    setFile(null);
    setRawRows([]);
    setMapping([]);
    setResult(null);
    setError(null);
  };

  const previewRows = rawRows.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p
          className={cn(
            "text-sm font-semibold uppercase tracking-[0.18em]",
            portal.accentEyebrow,
          )}
        >
          Import
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
          Eski Cihaz Verisi Aktarımı
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          TXT veya CSV formatındaki PDKS verilerini sisteme aktarın.
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 text-xs font-semibold">
        {(["upload", "map", "result"] as StepId[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && (
              <div className="h-px w-6 bg-slate-200 dark:bg-white/10" />
            )}
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold transition-colors",
                step === s
                  ? "bg-cyan-500 text-white"
                  : i < ["upload", "map", "result"].indexOf(step)
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400",
              )}
            >
              {i + 1}
            </span>
            <span
              className={cn(
                "hidden sm:inline",
                step === s
                  ? "text-slate-900 dark:text-white"
                  : "text-slate-400 dark:text-slate-500",
              )}
            >
              {s === "upload"
                ? "Dosya Yükle"
                : s === "map"
                  ? "Sütun Eşle"
                  : "Sonuç"}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
          <span>{error}</span>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ── ADIM 1: Dosya Yükleme ── */}
        {step === "upload" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className="group cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 px-8 py-16 text-center transition-colors hover:border-cyan-400 hover:bg-cyan-50/30 dark:border-white/10 dark:bg-white/5 dark:hover:border-cyan-500/40 dark:hover:bg-cyan-500/5"
            >
              <Upload className="mx-auto h-10 w-10 text-slate-300 transition-colors group-hover:text-cyan-500 dark:text-slate-600" />
              <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Dosyayı buraya sürükleyin
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                veya tıklayarak seçin · .csv, .txt · Maks 10 MB
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>
          </motion.div>
        )}

        {/* ── ADIM 2: Sütun Eşleme ── */}
        {step === "map" && (
          <motion.div
            key="map"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Dosya bilgisi */}
            <div className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-white/80 p-3 dark:border-white/10 dark:bg-slate-900/60">
              <FileSpreadsheet className="h-8 w-8 text-cyan-500" />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {file?.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {file && formatBytes(file.size)} · {rawRows.length} satır ·{" "}
                  {rawRows[0]?.length ?? 0} sütun
                </p>
              </div>
            </div>

            {/* Önizleme tablosu */}
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                İlk {Math.min(5, rawRows.length)} satır böyle görünüyor — doğru
                mu?
              </h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200/70 dark:border-white/10">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-white/5">
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">
                        #
                      </th>
                      {(previewRows[0] ?? []).map((_, ci) => (
                        <th
                          key={ci}
                          className="px-3 py-2 text-left font-semibold text-slate-500"
                        >
                          Sütun {ci + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, ri) => (
                      <tr
                        key={ri}
                        className="border-t border-slate-100 dark:border-white/5"
                      >
                        <td className="px-3 py-1.5 font-mono text-slate-400">
                          {ri + 1}
                        </td>
                        {row.map((cell, ci) => (
                          <td
                            key={ci}
                            className="max-w-[160px] truncate px-3 py-1.5 text-slate-700 dark:text-slate-300"
                          >
                            {cell || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sütun Mapper */}
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Her sütunu bir alana eşleyin
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {mapping.map((val, ci) => (
                  <div
                    key={ci}
                    className="rounded-lg border border-slate-200/70 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5"
                  >
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Sütun {ci + 1}
                    </p>
                    <p className="mb-2 truncate text-xs text-slate-600 dark:text-slate-300">
                      Örnek: {previewRows[0]?.[ci] ?? "—"}
                    </p>
                    <Select
                      value={val}
                      onChange={(e) => {
                        const next = [...mapping];
                        next[ci] = e.target.value as MappableField;
                        setMapping(next);
                      }}
                    >
                      {MAPPABLE_FIELDS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                ))}
              </div>

              {!mappingValid && (
                <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ En az bir kimlik alanı (Kart No / Sicil No / TC) ve
                  tarih+saat alanları eşlenmelidir.
                </p>
              )}
            </div>

            {/* Butonlar */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                Geri
              </Button>
              <Button
                size="sm"
                disabled={!mappingValid || processing}
                onClick={runImport}
                className="gap-1.5"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    İşleniyor…
                  </>
                ) : (
                  <>
                    İçe Aktar
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── ADIM 3: Sonuç ── */}
        {step === "result" && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Başarılı */}
              <div className="flex items-center gap-3 rounded-xl border border-emerald-200/70 bg-emerald-50/60 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <div>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                    {result.imported}
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    Başarıyla aktarıldı
                  </p>
                </div>
              </div>

              {/* Atlanan */}
              <div className="flex items-center gap-3 rounded-xl border border-amber-200/70 bg-amber-50/60 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                <SkipForward className="h-8 w-8 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                    {result.skipped}
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Atlanan (duplike)
                  </p>
                </div>
              </div>

              {/* Hata */}
              <div className="flex items-center gap-3 rounded-xl border border-rose-200/70 bg-rose-50/60 p-4 dark:border-rose-500/20 dark:bg-rose-500/10">
                <XCircle className="h-8 w-8 text-rose-500" />
                <div>
                  <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">
                    {result.errors.length}
                  </p>
                  <p className="text-xs text-rose-600 dark:text-rose-400">
                    Hata
                  </p>
                </div>
              </div>
            </div>

            {/* Hata detayları */}
            {result.errors.length > 0 && (
              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                  Hata Detayları (ilk {Math.min(20, result.errors.length)})
                </h3>
                <div className="max-h-60 overflow-y-auto rounded-lg border border-rose-200/70 bg-white/60 dark:border-rose-500/20 dark:bg-white/5">
                  {result.errors.slice(0, 20).map((err, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 border-b border-rose-100 px-3 py-2 text-xs last:border-b-0 dark:border-rose-500/10"
                    >
                      <span className="font-mono text-rose-400">
                        Satır {err.row}
                      </span>
                      <span className="text-rose-600 dark:text-rose-300">
                        {err.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button size="sm" onClick={reset} className="gap-1.5">
              <Upload className="h-4 w-4" />
              Yeni Dosya Yükle
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

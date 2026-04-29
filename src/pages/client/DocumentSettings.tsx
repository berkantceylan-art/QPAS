import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Loader2, Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Dialog } from "@/components/ui/Dialog";
import { PORTALS } from "@/lib/portals";
import { cn } from "@/lib/utils";
import { supabase, type DocumentRequirement, type DocumentAuditLog, type DocType } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

const docTypes: { value: DocType; label: string }[] = [
  { value: "identity", label: "Kimlik Fotokopisi" },
  { value: "contract", label: "İş Sözleşmesi" },
  { value: "criminal_record", label: "Adli Sicil Kaydı" },
  { value: "health_report", label: "Sağlık Raporu" },
  { value: "diploma", label: "Diploma / Mezuniyet Belgesi" },
  { value: "military_status", label: "Askerlik Durum Belgesi" },
  { value: "family_registry", label: "Vukuatlı Nüfus Kayıt Örneği" },
  { value: "kvkk_consent", label: "KVKK Aydınlatma Metni" },
  { value: "other", label: "Diğer Evrak" },
];

export default function DocumentSettings() {
  const portal = PORTALS.client;
  const { profile } = useAuth();
  
  const [reqs, setReqs] = useState<DocumentRequirement[]>([]);
  const [logs, setLogs] = useState<DocumentAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tab, setTab] = useState<"rules" | "logs">("rules");

  const load = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    setError(null);
    
    const [reqsRes, logsRes] = await Promise.all([
      supabase.from("document_requirements").select("*, job_title:job_titles(name), department:departments(name)").eq("company_id", profile.company_id),
      supabase.from("document_audit_logs").select("*, user:profiles(full_name), document:employee_documents(file_name, doc_type)").eq("company_id", profile.company_id).order("created_at", { ascending: false }).limit(50)
    ]);

    if (reqsRes.error) setError(reqsRes.error.message);
    else setReqs(reqsRes.data as DocumentRequirement[]);

    if (logsRes.error) setError(logsRes.error.message);
    else setLogs(logsRes.data as DocumentAuditLog[]);

    setLoading(false);
  }, [profile?.company_id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm("Kuralı silmek istediğinize emin misiniz?")) return;
    const { error: err } = await supabase.from("document_requirements").delete().eq("id", id);
    if (err) setError(err.message);
    else load();
  };

  const getDocLabel = (type: string) => docTypes.find(d => d.value === type)?.label || type;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={cn("text-sm font-semibold uppercase tracking-[0.18em]", portal.accentEyebrow)}>
            Ayarlar
          </p>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            <ShieldCheck className="h-7 w-7 text-emerald-500" />
            Özlük Evrakları & KVKK
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Zorunlu özlük dosyası kurallarını belirleyin ve KVKK belge erişim denetim loglarını (Audit Logs) inceleyin.
          </p>
        </div>
        {tab === "rules" && (
          <Button onClick={() => setDialogOpen(true)} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4" />
            Kural Ekle
          </Button>
        )}
      </div>

      <div className="flex gap-4 border-b border-slate-200 dark:border-white/10">
        <button
          onClick={() => setTab("rules")}
          className={cn("px-4 py-2 text-sm font-semibold border-b-2 transition-colors", tab === "rules" ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}
        >
          Zorunlu Evrak Kuralları
        </button>
        <button
          onClick={() => setTab("logs")}
          className={cn("px-4 py-2 text-sm font-semibold border-b-2 transition-colors", tab === "logs" ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}
        >
          Denetim Logları (Audit)
        </button>
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
      ) : tab === "rules" ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
          {reqs.length === 0 ? (
            <div className="p-12 text-center text-slate-500">Henüz bir evrak kuralı eklenmemiş.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Evrak Türü</th>
                  <th className="px-4 py-3 font-medium">Geçerlilik (Departman / Unvan)</th>
                  <th className="px-4 py-3 font-medium">Zorunluluk</th>
                  <th className="px-4 py-3 font-medium text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {reqs.map((req) => (
                  <tr key={req.id}>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      {getDocLabel(req.doc_type)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {!req.department_id && !req.job_title_id ? "Tüm Şirket" : (
                        <span>
                          {req.department?.name && `Dep: ${req.department.name} `}
                          {req.job_title?.name && `Unvan: ${req.job_title.name}`}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {req.is_mandatory ? (
                        <span className="rounded bg-rose-100 px-2 py-0.5 text-xs text-rose-700 dark:bg-rose-500/20 dark:text-rose-400">Zorunlu</span>
                      ) : (
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-400">Opsiyonel</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDelete(req.id)} className="text-xs text-rose-500 hover:underline">Sil</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
          {logs.length === 0 ? (
            <div className="p-12 text-center text-slate-500">Henüz log kaydı yok.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Tarih</th>
                  <th className="px-4 py-3 font-medium">İşlem Yapan (Admin/HR)</th>
                  <th className="px-4 py-3 font-medium">İşlem</th>
                  <th className="px-4 py-3 font-medium">Belge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {new Date(log.created_at).toLocaleString('tr-TR')}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      {log.user?.full_name || "Sistem"}
                    </td>
                    <td className="px-4 py-3">
                      {log.action === "download" ? (
                        <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400">İndirme</span>
                      ) : (
                        <span className="rounded bg-sky-100 px-2 py-0.5 text-xs text-sky-700 dark:bg-sky-500/20 dark:text-sky-400">Görüntüleme</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {log.document?.file_name} <span className="text-xs ml-2 opacity-50">({getDocLabel(log.document?.doc_type as any)})</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {dialogOpen && profile?.company_id && (
        <CreateRuleDialog companyId={profile.company_id} open={dialogOpen} onClose={() => setDialogOpen(false)} onSuccess={load} />
      )}
    </div>
  );
}

function CreateRuleDialog({ companyId, open, onClose, onSuccess }: any) {
  const [docType, setDocType] = useState<DocType>("identity");
  const [targetType, setTargetType] = useState<"all" | "department" | "job">("all");
  const [deptId, setDeptId] = useState("");
  const [jobId, setJobId] = useState("");
  
  const [depts, setDepts] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      supabase.from("departments").select("id, name").eq("company_id", companyId).then(({data}) => {
        if(data && data.length > 0) { setDepts(data); setDeptId(data[0].id); }
      });
      supabase.from("job_titles").select("id, name").eq("company_id", companyId).then(({data}) => {
        if(data && data.length > 0) { setJobs(data); setJobId(data[0].id); }
      });
    }
  }, [open, companyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("document_requirements").insert({
      company_id: companyId,
      doc_type: docType,
      department_id: targetType === "department" ? deptId : null,
      job_title_id: targetType === "job" ? jobId : null,
      is_mandatory: true
    });
    setLoading(false);
    if (!error) {
      onSuccess();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} title="Yeni Evrak Kuralı">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Evrak Türü</Label>
          <select value={docType} onChange={(e) => setDocType(e.target.value as any)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900" required disabled={loading}>
            {docTypes.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Kural Kimlere Uygulanacak?</Label>
          <select value={targetType} onChange={(e) => setTargetType(e.target.value as any)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900" disabled={loading}>
            <option value="all">Tüm Şirket (Herkes)</option>
            <option value="department">Belirli Bir Departman</option>
            <option value="job">Belirli Bir Unvan</option>
          </select>
        </div>
        
        {targetType === "department" && (
          <div className="space-y-1.5">
            <Label>Departman</Label>
            <select value={deptId} onChange={(e) => setDeptId(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900" required disabled={loading}>
              {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        )}

        {targetType === "job" && (
          <div className="space-y-1.5">
            <Label>Unvan</Label>
            <select value={jobId} onChange={(e) => setJobId(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900" required disabled={loading}>
              {jobs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>İptal</Button>
          <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ekle"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

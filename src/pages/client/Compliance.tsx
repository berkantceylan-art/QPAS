import { useCallback, useEffect, useState } from "react";
import { AlertCircle, FileSignature, HeartPulse, Loader2, Plus, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Dialog } from "@/components/ui/Dialog";
import { PORTALS } from "@/lib/portals";
import { cn } from "@/lib/utils";
import { supabase, type Certification } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export default function Compliance() {
  const portal = PORTALS.client;
  const { profile } = useAuth();
  
  const [certs, setCerts] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("certifications")
      .select("*, employee:employees!employee_id(id, full_name)")
      .eq("company_id", profile.company_id)
      .order("expiry_date", { ascending: true });
    
    if (err) setError(err.message);
    else setCerts(data as Certification[]);
    setLoading(false);
  }, [profile?.company_id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm("Sertifikayı silmek istediğinize emin misiniz?")) return;
    const { error: err } = await supabase.from("certifications").delete().eq("id", id);
    if (err) setError(err.message);
    else load();
  };

  const getStatusDisplay = (cert: Certification) => {
    if (!cert.expiry_date) return <span className="text-slate-500">Süresiz</span>;
    const expDate = new Date(cert.expiry_date);
    const today = new Date();
    const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return <span className="rounded bg-rose-100 px-2 py-0.5 text-xs text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 font-semibold">Süresi Doldu</span>;
    } else if (diffDays <= 15) {
      return <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 font-semibold">{diffDays} Gün Kaldı</span>;
    }
    return <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">Aktif</span>;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "ohs_medical": return <HeartPulse className="h-5 w-5 text-rose-500" />;
      case "ohs_training": return <ShieldAlert className="h-5 w-5 text-amber-500" />;
      default: return <FileSignature className="h-5 w-5 text-indigo-500" />;
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case "ohs_medical": return "Periyodik Muayene";
      case "ohs_training": return "İSG Eğitimi";
      default: return "Mesleki Eğitim";
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={cn("text-sm font-semibold uppercase tracking-[0.18em]", portal.accentEyebrow)}>
            İSG & Eğitim
          </p>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            <ShieldAlert className="h-7 w-7 text-rose-500" />
            Uyumluluk & Sertifikalar
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Personel periyodik muayeneleri, İSG eğitimleri ve sertifika bitiş sürelerini takip edin.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-1.5 bg-rose-600 hover:bg-rose-700">
          <Plus className="h-4 w-4" />
          Kayıt Ekle
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
      ) : certs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/40 p-12 text-center dark:border-white/10 dark:bg-white/5">
          <ShieldAlert className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">Henüz sertifika veya İSG kaydı eklenmemiş.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Personel</th>
                  <th className="px-4 py-3 font-medium">Tür</th>
                  <th className="px-4 py-3 font-medium">Belge / Eğitim Adı</th>
                  <th className="px-4 py-3 font-medium">Bitiş Tarihi</th>
                  <th className="px-4 py-3 font-medium">Durum</th>
                  <th className="px-4 py-3 font-medium text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {certs.map((cert) => (
                  <tr key={cert.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                      {cert.employee?.full_name}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(cert.type)}
                        <span className="text-slate-600 dark:text-slate-300">{getTypeName(cert.type)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {cert.name} <br/> <span className="text-xs text-slate-400">{cert.provider}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                      {cert.expiry_date ? new Date(cert.expiry_date).toLocaleDateString('tr-TR') : "Süresiz"}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusDisplay(cert)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDelete(cert.id)} className="text-xs text-rose-500 hover:underline">Sil</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {dialogOpen && profile?.company_id && (
        <CreateDialog companyId={profile.company_id} open={dialogOpen} onClose={() => setDialogOpen(false)} onSuccess={load} />
      )}
    </div>
  );
}

function CreateDialog({ companyId, open, onClose, onSuccess }: any) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [type, setType] = useState("ohs_medical");
  const [name, setName] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [provider, setProvider] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      supabase.from("employees").select("id, full_name").eq("company_id", companyId).eq("status", "active").then(({data}) => {
        if (data && data.length > 0) {
          setEmployees(data);
          setEmployeeId(data[0].id);
        }
      });
    }
  }, [open, companyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("certifications").insert({
      company_id: companyId,
      employee_id: employeeId,
      type,
      name,
      issue_date: issueDate || null,
      expiry_date: expiryDate || null,
      provider: provider || null,
    });
    setLoading(false);
    if (!error) {
      onSuccess();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} title="Yeni Kayıt Ekle">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Personel</Label>
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900" required disabled={loading}>
            {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Kayıt Türü</Label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900" required disabled={loading}>
            <option value="ohs_medical">Periyodik Sağlık Muayenesi</option>
            <option value="ohs_training">İSG Eğitimi</option>
            <option value="professional_training">Mesleki/Sertifikalı Eğitim</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Belge/Eğitim Adı</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required disabled={loading} placeholder="Temel İSG Eğitimi" />
        </div>
        <div className="space-y-1.5">
          <Label>Veren Kurum (Opsiyonel)</Label>
          <Input value={provider} onChange={(e) => setProvider(e.target.value)} disabled={loading} placeholder="Ortak Sağlık Güvenlik Birimi A.Ş." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Veriliş Tarihi</Label>
            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} disabled={loading} />
          </div>
          <div className="space-y-1.5">
            <Label>Bitiş Tarihi</Label>
            <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} disabled={loading} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>İptal</Button>
          <Button type="submit" disabled={loading} className="bg-rose-600 hover:bg-rose-700">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ekle"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

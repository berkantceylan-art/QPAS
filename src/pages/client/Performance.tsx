import { useCallback, useEffect, useState } from "react";
import { AlertCircle, BarChart3, Loader2, Plus, Target } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Dialog } from "@/components/ui/Dialog";
import { PORTALS } from "@/lib/portals";
import { cn } from "@/lib/utils";
import { supabase, type PerformanceReview } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export default function Performance() {
  const portal = PORTALS.client;
  const { profile } = useAuth();
  
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("performance_reviews")
      .select("*, employee:employees!employee_id(id, full_name), reviewer:employees!reviewer_id(id, full_name)")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false });
    
    if (err) setError(err.message);
    else setReviews(data as PerformanceReview[]);
    setLoading(false);
  }, [profile?.company_id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleComplete = async (id: string) => {
    if (!confirm("Değerlendirmeyi tamamlamak istediğinize emin misiniz? Tamamlanan değerlendirmeler personel tarafından görülebilir.")) return;
    const { error: err } = await supabase.from("performance_reviews").update({ status: "completed" }).eq("id", id);
    if (err) setError(err.message);
    else load();
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    if (score >= 85) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400";
    if (score >= 65) return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400";
    return "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400";
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={cn("text-sm font-semibold uppercase tracking-[0.18em]", portal.accentEyebrow)}>
            İnsan Kaynakları
          </p>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            <Target className="h-7 w-7 text-indigo-500" />
            Performans Değerlendirme
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Personellerinizin dönemsel KPI ve hedef bazlı performans notlarını yönetin.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4" />
          Yeni Değerlendirme
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
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/40 p-12 text-center dark:border-white/10 dark:bg-white/5">
          <BarChart3 className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">Henüz performans değerlendirmesi yok.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((rev) => (
            <div key={rev.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{rev.period_name}</span>
                <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold", getScoreColor(rev.kpi_score))}>
                  {rev.kpi_score !== null ? `${rev.kpi_score} Puan` : "Puan Girilmedi"}
                </span>
              </div>
              
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">{rev.employee?.full_name}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Değerlendiren: {rev.reviewer?.full_name || "Yönetici"}
              </p>

              <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm italic text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                "{rev.feedback_notes || "Geri bildirim girilmemiş."}"
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className={cn("text-xs font-medium", rev.status === 'completed' ? "text-emerald-600" : "text-amber-600")}>
                  {rev.status === 'completed' ? "Tamamlandı" : "Taslak"}
                </span>
                {rev.status === 'draft' && (
                  <Button size="sm" variant="outline" onClick={() => handleComplete(rev.id)}>Tamamla</Button>
                )}
              </div>
            </div>
          ))}
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
  const [periodName, setPeriodName] = useState("");
  const [kpiScore, setKpiScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      supabase.from("employees").select("id, full_name").eq("company_id", companyId).eq("status", "active").then(({data}) => {
        if (data && data.length > 0) {
          setEmployees(data);
          setEmployeeId(data[0].id);
        }
      });
      // Default period
      const date = new Date();
      setPeriodName(`${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`);
    }
  }, [open, companyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("performance_reviews").insert({
      company_id: companyId,
      employee_id: employeeId,
      period_name: periodName,
      kpi_score: kpiScore ? Number(kpiScore) : null,
      feedback_notes: feedback || null,
      status: "draft"
    });
    setLoading(false);
    if (!error) {
      onSuccess();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} title="Yeni Performans Değerlendirmesi">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Personel</Label>
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900" required disabled={loading}>
            {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Dönem</Label>
            <Input value={periodName} onChange={(e) => setPeriodName(e.target.value)} required disabled={loading} placeholder="2026-Q1" />
          </div>
          <div className="space-y-1.5">
            <Label>KPI Puanı (0-100)</Label>
            <Input type="number" min="0" max="100" value={kpiScore} onChange={(e) => setKpiScore(e.target.value)} disabled={loading} placeholder="85" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Geri Bildirim / Notlar</Label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            disabled={loading}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm min-h-[100px] dark:border-white/10 dark:bg-slate-900"
            placeholder="Personel bu dönem hedeflerini %90 oranında tutturmuştur."
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>İptal</Button>
          <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Taslak Olarak Kaydet"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

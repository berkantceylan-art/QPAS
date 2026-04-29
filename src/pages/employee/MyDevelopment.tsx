import { useCallback, useEffect, useState } from "react";
import { AlertCircle, BarChart3, GraduationCap, Loader2, ShieldAlert } from "lucide-react";
import { PORTALS } from "@/lib/portals";
import { cn } from "@/lib/utils";
import { supabase, type Certification, type PerformanceReview } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export default function MyDevelopment() {
  const portal = PORTALS.employee;
  const { profile } = useAuth();
  
  const [certs, setCerts] = useState<Certification[]>([]);
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    setError(null);
    
    const [certsRes, revsRes] = await Promise.all([
      supabase.from("certifications").select("*").eq("employee_id", profile.id).order("expiry_date", { ascending: true }),
      supabase.from("performance_reviews").select("*, reviewer:employees!reviewer_id(full_name)").eq("employee_id", profile.id).eq("status", "completed").order("created_at", { ascending: false })
    ]);

    if (certsRes.error) setError(certsRes.error.message);
    else setCerts(certsRes.data as Certification[]);

    if (revsRes.error) setError(revsRes.error.message);
    else setReviews(revsRes.data as PerformanceReview[]);

    setLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-slate-500";
    if (score >= 85) return "text-emerald-500";
    if (score >= 65) return "text-amber-500";
    return "text-rose-500";
  };

  return (
    <div className="space-y-10">
      <div>
        <p className={cn("text-sm font-semibold uppercase tracking-[0.18em]", portal.accentEyebrow)}>
          Gelişim
        </p>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
          <GraduationCap className="h-7 w-7 text-indigo-500" />
          Gelişimim
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Sertifikalarınız, periyodik muayeneleriniz ve performans değerlendirmeleriniz.
        </p>
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
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          
          {/* İSG ve Sertifikalar */}
          <div className="space-y-4">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <ShieldAlert className="h-5 w-5 text-rose-500" /> Sertifikalar & Uyumluluk
            </h2>
            {certs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white/40 p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                Kayıtlı sertifika yok.
              </div>
            ) : (
              <ul className="space-y-3">
                {certs.map(c => {
                  let alert = false;
                  if (c.expiry_date) {
                    const days = Math.ceil((new Date(c.expiry_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                    if (days <= 15) alert = true;
                  }
                  return (
                    <li key={c.id} className={cn("rounded-xl border p-4 shadow-sm", alert ? "border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10" : "border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900")}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-white">{c.name}</h3>
                          <p className="text-xs text-slate-500">{c.provider || "Bilinmiyor"}</p>
                        </div>
                        <span className="text-xs font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                          Bitiş: {c.expiry_date ? new Date(c.expiry_date).toLocaleDateString('tr-TR') : "Süresiz"}
                        </span>
                      </div>
                      {alert && (
                        <p className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
                          <AlertCircle className="inline h-3 w-3 mr-1" /> Bu belgenin süresi dolmak üzere veya doldu.
                        </p>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Performans Değerlendirmeleri */}
          <div className="space-y-4">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <BarChart3 className="h-5 w-5 text-emerald-500" /> Performans Notları
            </h2>
            {reviews.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white/40 p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                Henüz tamamlanmış bir performans değerlendirmeniz yok.
              </div>
            ) : (
              <ul className="space-y-4">
                {reviews.map(r => (
                  <li key={r.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{r.period_name}</span>
                      <span className={cn("text-lg font-black", getScoreColor(r.kpi_score))}>
                        {r.kpi_score !== null ? `${r.kpi_score} / 100` : "-"}
                      </span>
                    </div>
                    <p className="text-sm italic text-slate-600 dark:text-slate-400">"{r.feedback_notes || "Geri bildirim yok."}"</p>
                    <p className="text-xs text-slate-400 mt-4 text-right">Değerlendiren: {r.reviewer?.full_name || "Yönetici"}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

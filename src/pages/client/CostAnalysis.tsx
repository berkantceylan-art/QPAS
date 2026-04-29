import { useCallback, useEffect, useState } from "react";
import { AlertCircle, FileBarChart, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Label } from "@/components/ui/Label";
import { PORTALS } from "@/lib/portals";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export default function CostAnalysis() {
  const portal = PORTALS.client;
  const { profile } = useAuth();
  
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [data, setData] = useState<any[]>([]);

  const load = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    setError(null);

    // 1. O ayın tüm bordrolarını ve departman bilgilerini çek
    const { data: payrolls, error: pErr } = await supabase
      .from("payrolls")
      .select("net_salary, sgk_employer, income_tax, stamp_tax, total_employer_cost, employee:employees(department_id)")
      .eq("company_id", profile.company_id)
      .eq("year", year)
      .eq("month", month);

    if (pErr) {
      setError(pErr.message);
      setLoading(false);
      return;
    }

    if (!payrolls || payrolls.length === 0) {
      setData([]);
      setLoading(false);
      return;
    }

    // 2. Departman ID'lerine göre grupla
    const depMap: Record<string, { name: string, net: number, sgk: number, tax: number, total: number }> = {};
    
    // Geçici departman listesi (Gerçekte departments tablosundan adlar çekilmeli ama simülasyon için ID'leri "Dept: ID" olarak veya boşsa "Bilinmeyen" olarak tutalım)
    payrolls.forEach(p => {
      const emp = p.employee as any;
      const depId = emp?.department_id || "Bilinmeyen";
      if (!depMap[depId]) {
        depMap[depId] = { name: `Departman: ${depId.substring(0,6)}...`, net: 0, sgk: 0, tax: 0, total: 0 };
        if (depId === "Bilinmeyen") depMap[depId].name = "Bilinmeyen Departman";
      }
      
      depMap[depId].net += (p.net_salary || 0);
      depMap[depId].sgk += (p.sgk_employer || 0);
      depMap[depId].tax += ((p.income_tax || 0) + (p.stamp_tax || 0));
      depMap[depId].total += (p.total_employer_cost || 0);
    });

    // 3. Recharts formatına dönüştür
    const chartData = Object.values(depMap).map(d => ({
      name: d.name,
      Net: Math.round(d.net),
      SGK: Math.round(d.sgk),
      Vergi: Math.round(d.tax),
      Maliyet: Math.round(d.total)
    }));

    setData(chartData);
    setLoading(false);

  }, [profile?.company_id, year, month]);

  useEffect(() => {
    load();
  }, [load]);

  const formatTRY = (value: number) => {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="space-y-8">
      <div>
        <p className={cn("text-sm font-semibold uppercase tracking-[0.18em]", portal.accentEyebrow)}>
          Raporlar
        </p>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
          <FileBarChart className="h-7 w-7 text-indigo-500" />
          Maliyet Analizi (Heatmap)
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Departman bazında toplam personel maliyetlerini (Maaş, SGK, Vergi) görselleştirin.
        </p>
      </div>

      <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <Label>Yıl:</Label>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="rounded-lg border px-3 py-1.5 text-sm dark:bg-slate-800 dark:border-white/10">
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Label>Ay:</Label>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="rounded-lg border px-3 py-1.5 text-sm dark:bg-slate-800 dark:border-white/10">
            {Array.from({length: 12}).map((_, i) => <option key={i+1} value={i+1}>{i+1}. Ay</option>)}
          </select>
        </div>
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
          Grafik Hazırlanıyor…
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/40 p-12 text-center dark:border-white/10 dark:bg-white/5">
          <FileBarChart className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">Seçilen dönemde analiz edilecek bordro verisi bulunamadı.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <h2 className="mb-6 text-lg font-bold text-slate-900 dark:text-white">Departman Bazlı Yük Dağılımı</h2>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₺${val/1000}k`} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  formatter={(value: any) => formatTRY(Number(value))}
                />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                <Bar dataKey="Net" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                <Bar dataKey="SGK" stackId="a" fill="#f59e0b" />
                <Bar dataKey="Vergi" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

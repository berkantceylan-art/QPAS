import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Calculator, FileText, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PORTALS } from "@/lib/portals";
import { cn } from "@/lib/utils";
import { supabase, type Payroll } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

const MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

function formatTRY(amount: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(amount);
}

export default function PayrollDashboard() {
  const portal = PORTALS.client;
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPayrolls = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from("payrolls")
      .select("*, employee:employees(id, full_name, department_id)")
      .eq("company_id", companyId)
      .eq("period_year", year)
      .eq("period_month", month)
      .order("employee(full_name)", { ascending: true }); // A-Z

    if (err) setError(err.message);
    else setPayrolls(data as unknown as Payroll[]);
    
    setLoading(false);
  }, [companyId, year, month]);

  useEffect(() => {
    fetchPayrolls();
  }, [fetchPayrolls]);

  const handleCalculate = async () => {
    if (!companyId) return;
    if (!confirm(`${MONTHS[month - 1]} ${year} dönemi bordroları yeniden hesaplanacak. Mevcut taslaklar güncellenecek. Emin misiniz?`)) return;
    
    setCalculating(true);
    setError(null);

    const { error: rpcError } = await supabase.rpc("calculate_payroll", {
      p_company_id: companyId,
      p_year: year,
      p_month: month
    });

    setCalculating(false);
    
    if (rpcError) {
      setError(rpcError.message);
    } else {
      fetchPayrolls();
    }
  };

  const handlePrintAll = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between print:hidden">
        <div>
          <p className={cn("text-sm font-semibold uppercase tracking-[0.18em]", portal.accentEyebrow)}>
            Finans Modülü
          </p>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            <FileText className="h-7 w-7 text-indigo-500" />
            Bordro & Maaş Yönetimi
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Personel maaşlarını, elden ödenecek farkları ve toplam işveren maliyetlerini inceleyin.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-2 mr-4 bg-white/50 dark:bg-slate-900/50 p-1 rounded-lg border border-slate-200 dark:border-white/10">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="rounded-md border-transparent bg-transparent px-3 py-1.5 text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:ring-indigo-500 dark:text-slate-200"
            >
              {MONTHS.map((m, i) => (
                <option key={i+1} value={i+1}>{m}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-md border-transparent bg-transparent px-3 py-1.5 text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:ring-indigo-500 dark:text-slate-200"
            >
              {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <Button
            size="sm"
            onClick={handleCalculate}
            disabled={calculating || loading}
            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700"
          >
            {calculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
            Hesapla
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={handlePrintAll}
            disabled={payrolls.length === 0}
            className="gap-1.5"
          >
            <Printer className="h-4 w-4" />
            Tümünü Yazdır
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700 print:hidden dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500 print:hidden">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Yükleniyor…
        </div>
      ) : payrolls.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/40 p-12 text-center print:hidden dark:border-white/10 dark:bg-white/5">
          <FileText className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">Seçili dönemde bordro bulunamadı</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Bu aya ait bordroları oluşturmak için "Hesapla" butonuna tıklayın.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm print:border-none print:shadow-none dark:border-white/10 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-sm print:text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 print:bg-transparent dark:border-white/10 dark:bg-white/5">
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Personel</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">
                    <span className="block">Resmi Bordro</span>
                    <span className="text-[10px] font-normal text-slate-400">Bankaya Yatan</span>
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">
                    <span className="block">Toplam Hakediş</span>
                    <span className="text-[10px] font-normal text-slate-400">Anlaşılan Maaş</span>
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">
                    <span className="block">Elden (Fark)</span>
                    <span className="text-[10px] font-normal text-slate-400">Nakit Ödeme</span>
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">
                    <span className="block">Maliyet</span>
                    <span className="text-[10px] font-normal text-slate-400">İşveren Maliyeti</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {payrolls.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 print:break-inside-avoid dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                      {p.employee?.full_name}
                      {p.status === "draft" && (
                        <span className="ml-2 inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 print:hidden dark:bg-amber-500/20 dark:text-amber-300">
                          Taslak
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                      <div className="font-mono">{formatTRY(p.official_net)}</div>
                      <div className="text-[10px] text-slate-400">Brüt: {formatTRY(p.official_gross)}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-900 font-semibold dark:text-white">
                      <div className="font-mono">{formatTRY(p.total_agreed_salary)}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                      <div className="font-mono">{formatTRY(p.cash_difference)}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-rose-600 dark:text-rose-400 font-medium">
                      <div className="font-mono">{formatTRY(p.total_employer_cost)}</div>
                      <div className="text-[10px] text-slate-400">SGK: {formatTRY(p.sgk_employer)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-bold print:bg-transparent dark:bg-white/5">
                <tr className="border-t-2 border-slate-200 dark:border-white/10">
                  <td className="px-4 py-3 text-slate-900 dark:text-white">Genel Toplam</td>
                  <td className="px-4 py-3 text-right text-slate-900 dark:text-white font-mono">
                    {formatTRY(payrolls.reduce((sum, p) => sum + p.official_net, 0))}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-900 dark:text-white font-mono">
                    {formatTRY(payrolls.reduce((sum, p) => sum + p.total_agreed_salary, 0))}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatTRY(payrolls.reduce((sum, p) => sum + p.cash_difference, 0))}
                  </td>
                  <td className="px-4 py-3 text-right text-rose-600 dark:text-rose-400 font-mono">
                    {formatTRY(payrolls.reduce((sum, p) => sum + p.total_employer_cost, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Print Only: Bordro Pusulaları */}
      <div className="hidden print:block space-y-8 mt-16">
        <h2 className="text-2xl font-bold mb-8">Personel Maaş Pusulaları - {MONTHS[month-1]} {year}</h2>
        {payrolls.map(p => (
          <div key={p.id} className="border border-black p-6 rounded-lg break-inside-avoid shadow-none">
            <div className="flex justify-between border-b border-black pb-4 mb-4">
              <div>
                <h3 className="font-bold text-lg uppercase">{p.employee?.full_name}</h3>
                <p className="text-sm">Dönem: {MONTHS[month-1]} {year}</p>
                <p className="text-sm">Çalışılan Gün: {p.worked_days}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">Maaş Pusulası</p>
                <p className="text-sm italic">Bu belge bilgilendirme amaçlıdır.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-8 text-sm">
              <div>
                <h4 className="font-bold border-b border-black mb-2">Kazançlar</h4>
                <div className="flex justify-between mb-1">
                  <span>Resmi Brüt Ücret</span>
                  <span>{formatTRY(p.official_gross)}</span>
                </div>
                <div className="flex justify-between mb-1 font-bold">
                  <span>Toplam Hakediş (Anlaşılan)</span>
                  <span>{formatTRY(p.total_agreed_salary)}</span>
                </div>
              </div>
              
              <div>
                <h4 className="font-bold border-b border-black mb-2">Yasal Kesintiler</h4>
                <div className="flex justify-between mb-1">
                  <span>SGK İşçi Payı</span>
                  <span>{formatTRY(p.sgk_employee)}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>Gelir Vergisi</span>
                  <span>{formatTRY(p.income_tax)}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>Damga Vergisi</span>
                  <span>{formatTRY(p.stamp_tax)}</span>
                </div>
                {p.advance_deduction > 0 && (
                  <div className="flex justify-between mb-1 text-rose-600">
                    <span>Avans/Borç Kesintisi</span>
                    <span>{formatTRY(p.advance_deduction)}</span>
                  </div>
                )}
                <div className="flex justify-between mb-1 font-bold border-t border-black pt-1">
                  <span>Toplam Kesinti</span>
                  <span>{formatTRY(p.sgk_employee + p.income_tax + p.stamp_tax + p.advance_deduction)}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t-2 border-black pt-4 grid grid-cols-2 gap-8">
              <div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Resmi Net (Bankaya Yatan)</span>
                  <span>{formatTRY(p.official_net)}</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Elden Ödenecek Fark</span>
                  <span>{formatTRY(p.cash_difference)}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex justify-between text-xs italic">
              <span>İşveren İmzası</span>
              <span>Personel İmzası</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

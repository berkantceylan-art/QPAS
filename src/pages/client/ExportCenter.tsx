import { useState } from "react";
import { AlertCircle, Download, FileText, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { PORTALS } from "@/lib/portals";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export default function ExportCenter() {
  const portal = PORTALS.client;
  const { profile } = useAuth();
  
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateBankCSV = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    setError(null);

    try {
      // 1. O ayın bordrolarını çek (Bordroların hesaplanmış olması gerekir)
      const { data: payrolls, error: pErr } = await supabase
        .from("payrolls")
        .select("*, employee:employees(full_name, iban)")
        .eq("company_id", profile.company_id)
        .eq("year", year)
        .eq("month", month);

      if (pErr) throw pErr;
      if (!payrolls || payrolls.length === 0) {
        throw new Error("Seçilen döneme ait hesaplanmış bordro bulunamadı. Lütfen önce bordroları hesaplayın.");
      }

      // 2. CSV oluştur (IBAN;Tutar;AdSoyad;Aciklama)
      // Tutar olarak personelin eline net geçmesi gereken "total_agreed_salary" veya "net_salary" alınabilir. 
      // Burada "Resmi Banka" (official_salary üzerinden hesaplanan net_salary) tutarını alacağız çünkü yasal banka EFT'sidir.
      const csvRows = ["IBAN;TUTAR;AD SOYAD;ACIKLAMA"];
      let totalAmount = 0;

      payrolls.forEach(p => {
        const iban = p.employee?.iban || "IBAN_YOK";
        const name = p.employee?.full_name || "Bilinmeyen Personel";
        // Resmi bankaya yatacak olan net maaş
        const amount = p.net_salary || 0; 
        totalAmount += amount;
        
        csvRows.push(`${iban};${amount.toFixed(2)};${name};Maaş Ödemesi ${month}/${year}`);
      });

      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Banka_Odeme_Dosyasi_${year}_${month}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert(`Toplam ${payrolls.length} personel için ${totalAmount.toLocaleString('tr-TR', {style:'currency', currency:'TRY'})} tutarında dosya oluşturuldu.`);

    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const generateAccountingCSV = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    setError(null);

    try {
      const { data: payrolls, error: pErr } = await supabase
        .from("payrolls")
        .select("*, employee:employees(full_name, national_id)")
        .eq("company_id", profile.company_id)
        .eq("year", year)
        .eq("month", month);

      if (pErr) throw pErr;
      if (!payrolls || payrolls.length === 0) {
        throw new Error("Seçilen döneme ait hesaplanmış bordro bulunamadı.");
      }

      // Muhasebe CSV (TC;Ad;Brüt;SGK İşçi;SGK İşveren;Gelir Vergisi;Damga Vergisi;Net)
      const csvRows = ["TC_KIMLIK;AD_SOYAD;BRUT_UCRET;SGK_ISCI;SGK_ISVEREN;GELIR_VERGISI;DAMGA_VERGISI;NET_ODENEN;TOPLAM_MALIYET"];
      
      payrolls.forEach(p => {
        const tc = p.employee?.national_id || "";
        const name = p.employee?.full_name || "";
        csvRows.push(`${tc};${name};${p.gross_salary};${p.sgk_employee};${p.sgk_employer};${p.income_tax};${p.stamp_tax};${p.net_salary};${p.total_employer_cost}`);
      });

      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Muhasebe_Aktarimi_${year}_${month}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-8">
      <div>
        <p className={cn("text-sm font-semibold uppercase tracking-[0.18em]", portal.accentEyebrow)}>
          Finansal Çıktılar
        </p>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
          <Send className="h-7 w-7 text-sky-500" />
          Dışa Aktarım Merkezi
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Bankalara maaş talimatı vermek veya muhasebe sistemlerine aktarım yapmak için gerekli CSV/TXT dosyalarını oluşturun.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
          <span>{error}</span>
        </div>
      )}

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

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400 mb-4">
            <FileText className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Genel EFT/Banka Dosyası</h2>
          <p className="text-sm text-slate-500 mt-2 mb-6">
            Personellerin sistemde kayıtlı IBAN numaralarına resmi maaş tutarlarını yatırmak için tüm bankalarla uyumlu CSV formatını indir.
          </p>
          <Button onClick={generateBankCSV} disabled={loading} className="w-full gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Banka Formatında İndir
          </Button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 mb-4">
            <FileText className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Muhasebe Aktarımı (Logo, SAP)</h2>
          <p className="text-sm text-slate-500 mt-2 mb-6">
            Aylık bordro maliyetlerini (SGK Payları, Vergiler, Brüt Ücret) muhasebe programlarına çekmek için kolonlu CSV raporu üretin.
          </p>
          <Button onClick={generateAccountingCSV} disabled={loading} className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Muhasebe Dosyası İndir
          </Button>
        </div>
      </div>
    </div>
  );
}

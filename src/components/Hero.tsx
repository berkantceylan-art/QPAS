import { ArrowRight, BarChart3, Shield, Sparkles, Zap } from "lucide-react";
import { Button } from "./ui/Button";

const TRUST_ITEMS = [
  { icon: Shield, label: "ISO 27001 Güvenlik" },
  { icon: Zap, label: "%99.9 Uptime SLA" },
  { icon: BarChart3, label: "Canlı Analitik" },
];

export default function Hero() {
  return (
    <section
      id="top"
      className="relative isolate overflow-hidden pt-12 pb-24 sm:pt-20 sm:pb-32"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-radial-fade" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-40 mask-fade-y dark:opacity-25" />

      <div className="section flex flex-col items-center text-center">
        <span className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-slate-200/80 bg-white/70 px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          <Sparkles className="h-3.5 w-3.5 text-cyan-500" />
          Yeni Nesil ERP Platformu
        </span>

        <h1
          className="mt-6 max-w-4xl animate-fade-up text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl md:text-7xl dark:text-white"
          style={{ animationDelay: "80ms" }}
        >
          Akıllı Geçiş,{" "}
          <span className="gradient-text">Kusursuz Yönetim</span>
        </h1>

        <p
          className="mt-6 max-w-2xl animate-fade-up text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-400"
          style={{ animationDelay: "160ms" }}
        >
          Q-Pass ERP; PDKS takibi, İK analitiği ve modüler ERP çözümlerini tek
          platformda birleştirir. Operasyonlarınızı hızlandırın, kararlarınızı
          veriyle güçlendirin.
        </p>

        <div
          className="mt-10 flex animate-fade-up flex-col items-center gap-3 sm:flex-row"
          style={{ animationDelay: "240ms" }}
        >
          <Button size="lg" className="w-full sm:w-auto">
            Ücretsiz Demo Al
            <ArrowRight className="h-4 w-4" />
          </Button>
          <a href="#portals" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full">
              Portalları Keşfet
            </Button>
          </a>
        </div>

        <div
          className="mt-16 flex animate-fade-up flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-600 dark:text-slate-400"
          style={{ animationDelay: "320ms" }}
        >
          {TRUST_ITEMS.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-cyan-500" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

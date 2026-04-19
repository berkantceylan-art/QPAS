import { Check, Sparkles, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "./ui/Button";
import { cn } from "@/lib/utils";
import { cardReveal, staggerContainer } from "./motion/variants";

type Tier = {
  name: string;
  price: string;
  period: string;
  tagline: string;
  features: string[];
  cta: string;
  featured?: boolean;
};

const TIERS: Tier[] = [
  {
    name: "Başlangıç",
    price: "₺0",
    period: "/ 14 gün deneme",
    tagline: "KOBİ'ler için temel PDKS ve İK ihtiyaçları.",
    features: [
      "50 kullanıcıya kadar",
      "Temel PDKS & vardiya",
      "E-posta desteği",
      "Mobil self-servis",
    ],
    cta: "Ücretsiz başla",
  },
  {
    name: "İşletme",
    price: "₺1.490",
    period: "/ ay",
    tagline: "Büyüyen ekipler için tam ERP ve analitik.",
    features: [
      "Sınırsız kullanıcı",
      "Gelişmiş İK analitiği",
      "ERP modül paketi",
      "API & webhook entegrasyonları",
      "Öncelikli destek",
    ],
    cta: "Demo talep et",
    featured: true,
  },
  {
    name: "Kurumsal",
    price: "Özel",
    period: "fiyatlandırma",
    tagline: "Büyük organizasyonlar için ölçeklenebilir çözüm.",
    features: [
      "SSO & gelişmiş güvenlik",
      "Özel entegrasyonlar",
      "Adanmış hesap yöneticisi",
      "24/7 SLA destek",
      "On-premise seçeneği",
    ],
    cta: "Bize ulaşın",
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="relative py-24 sm:py-32">
      <div className="section">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400">
            Fiyatlandırma
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Ekibinize göre ölçeklenen planlar
          </h2>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-400">
            Şeffaf fiyatlandırma, gizli ücret yok. İstediğiniz zaman yükseltin
            veya iptal edin.
          </p>
        </div>

        <motion.div
          className="mt-16 grid gap-6 md:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
        >
          {TIERS.map((tier) => (
            <motion.div
              key={tier.name}
              variants={cardReveal}
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className={cn(
                "group relative flex h-full flex-col overflow-hidden rounded-2xl p-7 transition-shadow duration-300",
                tier.featured
                  ? "border border-transparent bg-white/80 shadow-xl shadow-indigo-500/10 ring-1 ring-cyan-500/30 dark:bg-slate-900/60 dark:ring-cyan-400/30"
                  : "glass",
              )}
            >
              {tier.featured && (
                <>
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-500"
                  />
                  <span className="absolute right-6 top-6 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow-md">
                    <Sparkles className="h-3 w-3" />
                    En Popüler
                  </span>
                </>
              )}

              <div>
                <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                  {tier.name}
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {tier.tagline}
                </p>
              </div>

              <div className="mt-6 flex items-baseline gap-1.5">
                <span
                  className={cn(
                    "text-4xl font-bold tracking-tight",
                    tier.featured
                      ? "gradient-text"
                      : "text-slate-900 dark:text-white",
                  )}
                >
                  {tier.price}
                </span>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {tier.period}
                </span>
              </div>

              <ul className="mt-6 space-y-3 text-sm">
                {tier.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2.5 text-slate-700 dark:text-slate-300"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-full",
                        tier.featured
                          ? "bg-gradient-to-br from-cyan-500 to-indigo-500 text-white"
                          : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200",
                      )}
                    >
                      <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 pt-2">
                <Button
                  variant={tier.featured ? "default" : "outline"}
                  className="w-full"
                >
                  {tier.cta}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

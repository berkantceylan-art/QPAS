import { Boxes, Clock, LineChart, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardDescription, CardHeader, CardTitle } from "./ui/Card";
import { cardReveal, staggerContainer } from "./motion/variants";

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient: string;
};

const FEATURES: Feature[] = [
  {
    icon: Clock,
    title: "PDKS Takibi",
    description:
      "Giriş-çıkış, mesai ve izin hareketlerini gerçek zamanlı izleyin. QR, kart ve biyometrik cihazlarla entegre çalışır.",
    gradient: "from-cyan-500 to-sky-500",
  },
  {
    icon: LineChart,
    title: "İK Analitiği",
    description:
      "Devamsızlık, performans ve bordro metriklerini tek panelde görselleştirin. Veriye dayalı kararlar alın.",
    gradient: "from-indigo-500 to-purple-500",
  },
  {
    icon: Boxes,
    title: "ERP Modülleri",
    description:
      "Finans, satınalma, stok ve üretim modüllerini ihtiyacınıza göre seçin. Esnek, ölçeklenebilir mimari.",
    gradient: "from-emerald-500 to-teal-500",
  },
];

export default function Features() {
  return (
    <section id="features" className="relative py-24 sm:py-32">
      <div className="section">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400">
            Özellikler
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Tüm operasyonlarınız, tek bir platformda
          </h2>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-400">
            Q-Pass, sahada ve ofiste birbirinden bağımsız çalışan süreçleri
            modüler bir ekosistemde birleştirir.
          </p>
        </div>

        <motion.div
          className="mt-16 grid gap-6 md:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
        >
          {FEATURES.map(({ icon: Icon, title, description, gradient }) => (
            <motion.div key={title} variants={cardReveal}>
              <Card className="group relative h-full overflow-hidden p-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 hover:border-slate-300 dark:hover:border-white/20">
                <CardHeader>
                  <div
                    className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg shadow-black/5 ring-1 ring-white/20`}
                  >
                    <Icon className="h-6 w-6 text-white" strokeWidth={2.25} />
                  </div>
                  <CardTitle>{title}</CardTitle>
                  <CardDescription className="leading-relaxed">
                    {description}
                  </CardDescription>
                </CardHeader>
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r ${gradient} opacity-0 transition-opacity group-hover:opacity-60`}
                />
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

import {
  ArrowUpRight,
  BookOpen,
  Code2,
  GraduationCap,
  Users,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { cardReveal, staggerContainer } from "./motion/variants";

type Resource = {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient: string;
  href: string;
};

const RESOURCES: Resource[] = [
  {
    icon: BookOpen,
    title: "Dokümantasyon",
    description: "Kurulum, yapılandırma ve modül kılavuzları.",
    gradient: "from-cyan-500 to-sky-500",
    href: "#!",
  },
  {
    icon: Code2,
    title: "API Referansı",
    description: "REST & webhook uç noktaları, örnek istekler.",
    gradient: "from-indigo-500 to-purple-500",
    href: "#!",
  },
  {
    icon: GraduationCap,
    title: "Kılavuzlar",
    description: "Uygulamalı rehberler ve en iyi pratikler.",
    gradient: "from-emerald-500 to-teal-500",
    href: "#!",
  },
  {
    icon: Users,
    title: "Topluluk",
    description: "Geliştirici forumu ve ürün duyuruları.",
    gradient: "from-amber-500 to-rose-500",
    href: "#!",
  },
];

export default function Docs() {
  return (
    <section id="docs" className="relative py-24 sm:py-32">
      <div className="section">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
            Dokümantasyon
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Geliştirici ve yönetici kaynakları
          </h2>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-400">
            Kurulumdan ileri düzey entegrasyonlara kadar ihtiyacınız olan her şey.
          </p>
        </div>

        <motion.div
          className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
        >
          {RESOURCES.map(({ icon: Icon, title, description, gradient, href }) => (
            <motion.a
              key={title}
              href={href}
              variants={cardReveal}
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="group relative flex h-full flex-col overflow-hidden rounded-2xl glass p-6 transition-shadow duration-300 hover:shadow-xl hover:shadow-indigo-500/10"
            >
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r ${gradient} opacity-0 transition-opacity group-hover:opacity-70`}
              />
              <div
                className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg shadow-black/5 ring-1 ring-white/20`}
              >
                <Icon className="h-5 w-5 text-white" strokeWidth={2.25} />
              </div>
              <h3 className="mt-5 text-base font-semibold tracking-tight text-slate-900 dark:text-white">
                {title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {description}
              </p>
              <div className="mt-5 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                <span>Keşfet</span>
                <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </motion.a>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

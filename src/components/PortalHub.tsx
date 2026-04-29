import {
  ArrowRight,
  Briefcase,
  KeyRound,
  ShieldCheck,
  Smartphone,
  UserCircle2,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { cardReveal, staggerContainer } from "./motion/variants";

const MotionLink = motion.create(Link);

type Portal = {
  icon: LucideIcon;
  title: string;
  tagline: string;
  description: string;
  features: string[];
  gradient: string;
  ring: string;
  href: string;
  badge?: string;
};

const PORTALS: Portal[] = [
  {
    icon: ShieldCheck,
    title: "Admin Paneli",
    tagline: "Full System Control",
    description:
      "Kullanıcılar, roller, modüller ve tüm kurumsal ayarlar üzerinde tam kontrol.",
    features: ["Rol & Yetki Yönetimi", "Sistem Denetim Kayıtları", "Global Ayarlar"],
    gradient: "from-indigo-500 via-violet-500 to-purple-500",
    ring: "group-hover:shadow-[0_0_60px_-10px_rgba(139,92,246,0.45)]",
    href: "/admin/login",
  },
  {
    icon: Briefcase,
    title: "Müşteri Portalı",
    tagline: "Business Management & Reports",
    description:
      "İşletmenizi yönetin, canlı raporlarla finans ve operasyon verisini anlık takip edin.",
    features: ["Detaylı Raporlar", "Ekip Yönetimi", "Faturalama & Sözleşme"],
    gradient: "from-cyan-500 via-sky-500 to-teal-500",
    ring: "group-hover:shadow-[0_0_60px_-10px_rgba(6,182,212,0.45)]",
    href: "/client/login",
  },
  {
    icon: UserCircle2,
    title: "Çalışan Self-Servis",
    tagline: "Daily Logs & Shift Tracking",
    description:
      "Özlük, bordro, puantaj, izin, avans ve BES; rolünüze bağlı ek modüller otomatik açılır.",
    features: [
      "Mobil PDKS (QR / NFC / Geofencing)",
      "Bordro, Puantaj & Özlük",
      "İzin, Avans & BES Talepleri",
      "Rol Bazlı Modül Erişimi",
    ],
    gradient: "from-amber-500 via-orange-500 to-rose-500",
    ring: "group-hover:shadow-[0_0_60px_-10px_rgba(251,146,60,0.45)]",
    href: "/employee/login",
    badge: "Mobil",
  },
];

const TRUST_BADGES = [
  { icon: KeyRound, label: "Tek Hesap (SSO)" },
  { icon: UsersRound, label: "Rol Bazlı Yetki (RBAC)" },
  { icon: Smartphone, label: "Mobil PDKS Desteği" },
];

export default function PortalHub() {
  return (
    <section
      id="portals"
      className="relative isolate py-24 sm:py-32"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-radial-fade opacity-70" />

      <div className="section">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
            Portal Erişim Merkezi
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Tek hesap, rolünüze özel modüller
          </h2>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-400">
            Tek bir giriş; self-servis her zaman açık, yetkili olduğunuz modüller
            rolünüze göre otomatik görünür.
          </p>
        </div>

        <motion.div
          className="mt-16 grid gap-6 md:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
        >
          {PORTALS.map(
            ({
              icon: Icon,
              title,
              tagline,
              description,
              features,
              gradient,
              ring,
              href,
              badge,
            }) => (
              <MotionLink
                key={title}
                to={href}
                variants={cardReveal}
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl glass p-7 transition-shadow duration-300 ${ring}`}
              >
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br ${gradient} opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-20`}
                />
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${gradient} opacity-70`}
                />

                {badge && (
                  <span
                    className={`absolute right-5 top-5 inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${gradient} px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow-md`}
                  >
                    <Smartphone className="h-3 w-3" />
                    {badge}
                  </span>
                )}

                <div className="relative">
                  <div
                    className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} shadow-lg ring-1 ring-white/20`}
                  >
                    <Icon className="h-7 w-7 text-white" strokeWidth={2.25} />
                  </div>
                  <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    {tagline}
                  </p>
                  <h3 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {description}
                  </p>

                  <ul className="mt-5 space-y-2 text-sm">
                    {features.map((f) => (
                      <li
                        key={f}
                        className="flex items-center gap-2 text-slate-700 dark:text-slate-300"
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full bg-gradient-to-br ${gradient}`}
                        />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="relative mt-8 flex items-center justify-between border-t border-slate-200/60 pt-5 dark:border-white/10">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    Giriş Yap
                  </span>
                  <span
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-white shadow-md transition-transform duration-300 group-hover:translate-x-1`}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </MotionLink>
            ),
          )}
        </motion.div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-600 dark:text-slate-400">
          {TRUST_BADGES.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

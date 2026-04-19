import { Github, KeyRound, Linkedin, Twitter } from "lucide-react";

const COLUMNS = [
  {
    title: "Ürün",
    links: ["PDKS", "İK Analitiği", "ERP Modülleri", "Entegrasyonlar"],
  },
  {
    title: "Şirket",
    links: ["Hakkımızda", "Kariyer", "İletişim", "Basın"],
  },
  {
    title: "Yasal",
    links: ["Gizlilik", "KVKK", "Şartlar", "Güvenlik"],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-slate-200/70 bg-slate-50/60 dark:border-white/10 dark:bg-slate-950/80">
      <div className="section py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <a href="#top" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-500 shadow-md shadow-indigo-500/30">
                <KeyRound className="h-4 w-4 text-white" strokeWidth={2.5} />
              </span>
              <span className="text-lg font-bold tracking-tight">
                Q-<span className="gradient-text">Pass</span>
              </span>
            </a>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Akıllı geçiş, kusursuz yönetim. Kurumsal süreçlerinizi modern,
              güvenli ve ölçeklenebilir bir platformda birleştirin.
            </p>
            <div className="mt-5 flex gap-3">
              {[
                { Icon: Github, label: "GitHub" },
                { Icon: Linkedin, label: "LinkedIn" },
                { Icon: Twitter, label: "Twitter" },
              ].map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200/70 bg-white/60 text-slate-600 transition-colors hover:border-cyan-500/40 hover:text-cyan-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:border-cyan-400/40 dark:hover:text-cyan-400"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-2.5 text-sm">
                {col.links.map((l) => (
                  <li key={l}>
                    <a
                      href="#"
                      className="text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-slate-200/70 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center dark:border-white/10 dark:text-slate-400">
          <p>© {new Date().getFullYear()} Q-Pass. Tüm hakları saklıdır.</p>
          <p>Made with care in İstanbul.</p>
        </div>
      </div>
    </footer>
  );
}

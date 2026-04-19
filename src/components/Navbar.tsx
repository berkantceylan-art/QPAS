import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound, Menu, Moon, Sun, X } from "lucide-react";
import { Button } from "./ui/Button";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "#features", label: "Özellikler" },
  { href: "#portals", label: "Portallar" },
  { href: "#pricing", label: "Fiyatlandırma" },
  { href: "#docs", label: "Dokümantasyon" },
];

export default function Navbar() {
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "border-b border-slate-200/70 bg-white/75 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/75"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="section flex h-16 items-center justify-between">
        <a href="#top" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-500 shadow-md shadow-indigo-500/30">
            <KeyRound className="h-4 w-4 text-white" strokeWidth={2.5} />
          </span>
          <span className="text-lg font-bold tracking-tight">
            Q-<span className="gradient-text">Pass</span>
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label="Temayı değiştir"
            className="rounded-full"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
          <Link to="/admin/login" className="hidden sm:inline-flex">
            <Button variant="ghost" size="sm">
              Giriş Yap
            </Button>
          </Link>
          <Button size="sm" className="hidden sm:inline-flex">
            Demo Al
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menüyü aç/kapat"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-200/70 bg-white/95 backdrop-blur-xl md:hidden dark:border-white/10 dark:bg-slate-950/95">
          <div className="section flex flex-col gap-1 py-3">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-2 flex gap-2">
              <Link
                to="/admin/login"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                <Button variant="outline" size="sm" className="w-full">
                  Giriş Yap
                </Button>
              </Link>
              <Button size="sm" className="flex-1">
                Demo Al
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  KeyRound,
  LogOut,
  Menu,
  Moon,
  Sun,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import type { PortalConfig } from "@/lib/portals";
import NotificationBell from "./NotificationBell";

function initials(name: string | null | undefined, email: string) {
  const source = (name && name.trim()) || email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  const letters =
    parts.length >= 2
      ? parts[0][0] + parts[1][0]
      : parts[0]?.slice(0, 2) ?? "?";
  return letters.toUpperCase();
}

function SidebarContent({
  portal,
  onNavigate,
}: {
  portal: PortalConfig;
  onNavigate?: () => void;
}) {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  return (
    <div className="flex h-full flex-col">
      <Link
        to={portal.basePath}
        onClick={onNavigate}
        className="flex h-16 items-center gap-2.5 border-b border-slate-200/70 px-6 dark:border-white/10"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-500 shadow-md shadow-indigo-500/30">
          <KeyRound className="h-4 w-4 text-white" strokeWidth={2.5} />
        </span>
        <span className="text-lg font-bold tracking-tight">
          Q-<span className="gradient-text">Pass</span>
        </span>
        <span
          className={`ml-auto rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${portal.accentBadge}`}
        >
          {portal.brandLabel}
        </span>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <ul className="space-y-1">
          {portal.nav.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? `bg-gradient-to-r ${portal.accentGradient} bg-opacity-15 text-slate-900 ring-1 ring-inset ${portal.accentRing} dark:text-white`
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white",
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-slate-200/70 p-3 dark:border-white/10">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span
            className={`flex h-9 w-9 flex-none items-center justify-center rounded-full bg-gradient-to-br ${portal.accentGradient} text-xs font-semibold text-white shadow-md`}
          >
            {user ? initials(profile?.full_name, user.email ?? "?") : "?"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {profile?.full_name || user?.email?.split("@")[0] || portal.brandLabel}
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {user?.email}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            aria-label="Çıkış yap"
            className="rounded-full"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function currentBreadcrumb(pathname: string, portal: PortalConfig) {
  const found = portal.nav.find((n) =>
    n.end ? pathname === n.to : pathname.startsWith(n.to),
  );
  return found?.label ?? portal.brandLabel;
}

export default function PortalLayout({ portal }: { portal: PortalConfig }) {
  const { theme, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const breadcrumb = currentBreadcrumb(location.pathname, portal);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] border-r border-slate-200/70 bg-white/80 backdrop-blur-xl lg:block dark:border-white/10 dark:bg-slate-900/60">
        <SidebarContent portal={portal} />
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Menüyü kapat"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 left-0 w-[280px] border-r border-slate-200/70 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950">
            <SidebarContent
              portal={portal}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/70 bg-white/75 px-4 backdrop-blur-xl sm:px-6 dark:border-white/10 dark:bg-slate-950/75">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menüyü aç/kapat"
            className="lg:hidden"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>

          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-slate-500 dark:text-slate-400">
              {portal.brandLabel}
            </span>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {breadcrumb}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
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
            <NotificationBell />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

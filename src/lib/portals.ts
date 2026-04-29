import {
  AlertTriangle,
  Briefcase,
  Building2,
  CalendarClock,
  Clock,
  Coins,
  FileBarChart2,
  FileSignature,
  FileText,
  Fingerprint,
  HandCoins,
  LayoutDashboard,
  Megaphone,
  MessagesSquare,
  Network,
  Receipt,
  Scale,
  Settings,
  ShieldCheck,
  SmartphoneNfc,
  UserCircle2,
  Users,
  UsersRound,
  Wallet,
  Box,
  ArrowLeftRight,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "./supabase";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
};

export type PortalConfig = {
  id: "admin" | "client" | "employee";
  role: UserRole;
  basePath: string;
  loginPath: string;
  brandLabel: string;
  accentGradient: string;
  accentRing: string;
  accentEyebrow: string;
  accentText: string;
  accentBadge: string;
  dashboardEyebrow: string;
  nav: NavItem[];
  login: {
    eyebrow: string;
    eyebrowIcon: LucideIcon;
    title: string;
    subtitle: string;
    mismatchError: string;
    decorativeIcon: LucideIcon;
    decorativeIconGradient: string;
    decorativeTitle: string;
    decorativeDescription: string;
    decorativeBullets: string[];
  };
};

export const PORTALS: Record<PortalConfig["id"], PortalConfig> = {
  admin: {
    id: "admin",
    role: "admin",
    basePath: "/admin",
    loginPath: "/admin/login",
    brandLabel: "Admin",
    accentGradient: "from-cyan-500 to-indigo-500",
    accentRing: "ring-cyan-500/20",
    accentEyebrow: "text-cyan-600 dark:text-cyan-400",
    accentText: "text-cyan-600 dark:text-cyan-400",
    accentBadge:
      "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
    dashboardEyebrow: "Genel Bakış",
    nav: [
      { to: "/admin", label: "Genel Bakış", icon: LayoutDashboard, end: true },
      { to: "/admin/users", label: "Kullanıcılar", icon: Users },
      { to: "/admin/companies", label: "Firmalar", icon: Building2 },
      { to: "/admin/finance", label: "Senet Onayları", icon: FileSignature },
      { to: "/admin/roles", label: "Roller", icon: ShieldCheck },
      { to: "/admin/audit", label: "Denetim Kayıtları", icon: FileBarChart2 },
      { to: "/admin/settings", label: "Ayarlar", icon: Settings },
    ],
    login: {
      eyebrow: "Admin Paneli",
      eyebrowIcon: ShieldCheck,
      title: "Tekrar hoş geldin",
      subtitle: "Yönetim paneline erişmek için admin hesabınla giriş yap.",
      mismatchError: "Bu hesabın admin yetkisi yok.",
      decorativeIcon: ShieldCheck,
      decorativeIconGradient: "from-indigo-500 via-violet-500 to-purple-500",
      decorativeTitle: "Kurumsal kontrol merkezi",
      decorativeDescription:
        "Kullanıcılar, roller, denetim kayıtları ve sistem ayarları tek bir güvenli panelden.",
      decorativeBullets: [
        "Rol bazlı yetki & SSO",
        "Gerçek zamanlı denetim kayıtları",
        "Tüm modüller üzerinde tam kontrol",
      ],
    },
  },
  client: {
    id: "client",
    role: "client",
    basePath: "/client",
    loginPath: "/client/login",
    brandLabel: "Müşteri",
    accentGradient: "from-cyan-500 via-sky-500 to-teal-500",
    accentRing: "ring-sky-500/20",
    accentEyebrow: "text-sky-600 dark:text-sky-400",
    accentText: "text-sky-600 dark:text-sky-400",
    accentBadge: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
    dashboardEyebrow: "İşletme Özeti",
    nav: [
      { to: "/client", label: "Genel Bakış", icon: LayoutDashboard, end: true },
      { to: "/client/employees", label: "Çalışanlar", icon: UsersRound },
      { to: "/client/attendance", label: "Devam", icon: Fingerprint },
      { to: "/client/messages", label: "Mesajlar", icon: MessagesSquare },
      { to: "/client/announcements", label: "Duyurular", icon: Megaphone },
      { to: "/client/emergency", label: "Acil Çağrılar", icon: AlertTriangle },
      { to: "/client/finance", label: "Finans", icon: Wallet },
      { to: "/client/finance/payroll", label: "Bordrolar", icon: FileText },
      { to: "/client/organization", label: "Organizasyon", icon: Network },
      { to: "/client/roles", label: "Roller", icon: ShieldCheck },
      { to: "/client/inventory", label: "Demirbaş", icon: Box },
      { to: "/client/reports", label: "Raporlar", icon: FileBarChart2 },
      { to: "/client/billing", label: "Faturalama", icon: Receipt },
      { to: "/client/settings", label: "Ayarlar", icon: Settings },
      { to: "/client/settings/legal", label: "Yasal Ayarlar", icon: Scale },
    ],
    login: {
      eyebrow: "Müşteri Portalı",
      eyebrowIcon: Briefcase,
      title: "İşletmene hoş geldin",
      subtitle:
        "Ekibini yönet, canlı raporlarla finans ve operasyon verisini anlık takip et.",
      mismatchError: "Bu hesabın müşteri portalı yetkisi yok.",
      decorativeIcon: Briefcase,
      decorativeIconGradient: "from-cyan-500 via-sky-500 to-teal-500",
      decorativeTitle: "İşletmenin kontrol merkezi",
      decorativeDescription:
        "Detaylı raporlar, ekip yönetimi ve faturalama — hepsi tek bir portalda, canlı.",
      decorativeBullets: [
        "Canlı KPI & finans raporları",
        "Ekip yönetimi ve izin onayları",
        "Faturalama, sözleşme & abonelik",
      ],
    },
  },
  employee: {
    id: "employee",
    role: "employee",
    basePath: "/employee",
    loginPath: "/employee/login",
    brandLabel: "Çalışan",
    accentGradient: "from-amber-500 via-orange-500 to-rose-500",
    accentRing: "ring-orange-500/20",
    accentEyebrow: "text-orange-600 dark:text-orange-400",
    accentText: "text-orange-600 dark:text-orange-400",
    accentBadge: "bg-orange-500/10 text-orange-600 dark:text-orange-300",
    dashboardEyebrow: "Kişisel Panel",
    nav: [
      { to: "/employee", label: "Genel Bakış", icon: LayoutDashboard, end: true },
      { to: "/employee/pdks", label: "Mobil PDKS", icon: SmartphoneNfc },
      { to: "/employee/messages", label: "Mesajlar", icon: MessagesSquare },
      { to: "/employee/announcements", label: "Duyurular", icon: Megaphone },
      { to: "/employee/emergency", label: "Acil Çağrı", icon: AlertTriangle },
      { to: "/employee/payroll", label: "Bordro & Puantaj", icon: Wallet },
      { to: "/employee/requests", label: "Talepler", icon: HandCoins },
      { to: "/employee/swap", label: "Takas Talebi", icon: ArrowLeftRight },
      { to: "/employee/assets", label: "Demirbaş", icon: Box },
      { to: "/employee/profile", label: "Özlük", icon: UserCircle2 },
    ],
    login: {
      eyebrow: "Çalışan Portalı",
      eyebrowIcon: UserCircle2,
      title: "Günaydın, hazır mısın?",
      subtitle:
        "Giriş-çıkış, bordro, izin, avans ve BES — hepsi tek yerde, mobil uyumlu.",
      mismatchError: "Bu hesabın çalışan portalı yetkisi yok.",
      decorativeIcon: UserCircle2,
      decorativeIconGradient: "from-amber-500 via-orange-500 to-rose-500",
      decorativeTitle: "Günün her anı yanında",
      decorativeDescription:
        "QR / NFC / konum doğrulamalı PDKS, bordro ve talepler — mobil cepte.",
      decorativeBullets: [
        "Mobil PDKS (QR / NFC / konum)",
        "Bordro, puantaj ve özlük bilgileri",
        "İzin, avans & BES talepleri",
      ],
    },
  },
};

// Icons re-exported for dashboard / placeholder reuse
export const PortalIcons = {
  Building2,
  CalendarClock,
  Clock,
  Coins,
  FileText,
};

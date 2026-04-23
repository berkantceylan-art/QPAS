import { Route, Routes } from "react-router-dom";
import {
  FileBarChart2,
  HandCoins,
  Receipt,
  Settings,
  ShieldCheck,
  UserCircle2,
  UsersRound,
  Wallet,
} from "lucide-react";

import LandingPage from "./pages/LandingPage";
import NotFound from "./pages/NotFound";

// Shared portal primitives
import PortalLogin from "./pages/portal/PortalLogin";
import Placeholder from "./pages/portal/Placeholder";
import PortalLayout from "./components/portal/PortalLayout";
import RequireRole from "./components/portal/RequireRole";
import { PORTALS } from "./lib/portals";

// Dashboards
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminCompanies from "./pages/admin/Companies";
import ClientDashboard from "./pages/client/Dashboard";
import EmployeeDashboard from "./pages/employee/Dashboard";
import EmployeePdks from "./pages/employee/Pdks";

const admin = PORTALS.admin;
const client = PORTALS.client;
const employee = PORTALS.employee;

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      {/* ── Admin portal ──────────────────────────── */}
      <Route path="/admin/login" element={<PortalLogin portal={admin} />} />
      <Route
        path="/admin"
        element={
          <RequireRole portal={admin}>
            <PortalLayout portal={admin} />
          </RequireRole>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="companies" element={<AdminCompanies />} />
        <Route
          path="roles"
          element={
            <Placeholder
              portal={admin}
              title="Roller"
              description="Rol tanımları ve modül bazlı yetki matrisi."
              icon={ShieldCheck}
            />
          }
        />
        <Route
          path="audit"
          element={
            <Placeholder
              portal={admin}
              title="Denetim Kayıtları"
              description="Sistemdeki kritik işlemlerin tam denetim zinciri."
              icon={FileBarChart2}
            />
          }
        />
        <Route
          path="settings"
          element={
            <Placeholder
              portal={admin}
              title="Ayarlar"
              description="Kurum bilgileri, güvenlik politikaları ve entegrasyonlar."
              icon={Settings}
            />
          }
        />
      </Route>

      {/* ── Client portal ─────────────────────────── */}
      <Route path="/client/login" element={<PortalLogin portal={client} />} />
      <Route
        path="/client"
        element={
          <RequireRole portal={client}>
            <PortalLayout portal={client} />
          </RequireRole>
        }
      >
        <Route index element={<ClientDashboard />} />
        <Route
          path="reports"
          element={
            <Placeholder
              portal={client}
              title="Raporlar"
              description="Detaylı finans, personel ve operasyon raporlarınız."
              icon={FileBarChart2}
            />
          }
        />
        <Route
          path="team"
          element={
            <Placeholder
              portal={client}
              title="Ekip"
              description="Ekibinizi yönetin, rol atayın ve aktiviteleri izleyin."
              icon={UsersRound}
            />
          }
        />
        <Route
          path="billing"
          element={
            <Placeholder
              portal={client}
              title="Faturalama"
              description="Faturalar, sözleşmeler ve ödeme geçmişi."
              icon={Receipt}
            />
          }
        />
        <Route
          path="settings"
          element={
            <Placeholder
              portal={client}
              title="Ayarlar"
              description="Şirket bilgileri, bildirimler ve entegrasyonlar."
              icon={Settings}
            />
          }
        />
      </Route>

      {/* ── Employee portal ───────────────────────── */}
      <Route
        path="/employee/login"
        element={<PortalLogin portal={employee} />}
      />
      <Route
        path="/employee"
        element={
          <RequireRole portal={employee}>
            <PortalLayout portal={employee} />
          </RequireRole>
        }
      >
        <Route index element={<EmployeeDashboard />} />
        <Route path="pdks" element={<EmployeePdks />} />
        <Route
          path="payroll"
          element={
            <Placeholder
              portal={employee}
              title="Bordro & Puantaj"
              description="Aylık bordro, puantaj cetveli ve ödeme geçmişi."
              icon={Wallet}
            />
          }
        />
        <Route
          path="requests"
          element={
            <Placeholder
              portal={employee}
              title="Talepler"
              description="İzin, avans ve BES taleplerinizi takip edin."
              icon={HandCoins}
            />
          }
        />
        <Route
          path="profile"
          element={
            <Placeholder
              portal={employee}
              title="Özlük"
              description="Kişisel bilgiler, sözleşme ve belge yönetimi."
              icon={UserCircle2}
            />
          }
        />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

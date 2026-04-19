import { Route, Routes } from "react-router-dom";
import { FileBarChart2, Settings, ShieldCheck, Users } from "lucide-react";
import LandingPage from "./pages/LandingPage";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/admin/AdminLogin";
import Dashboard from "./pages/admin/Dashboard";
import Placeholder from "./pages/admin/Placeholder";
import AdminLayout from "./components/admin/AdminLayout";
import RequireAdmin from "./components/admin/RequireAdmin";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        }
      >
        <Route index element={<Dashboard />} />
        <Route
          path="users"
          element={
            <Placeholder
              title="Kullanıcılar"
              description="Sistemdeki tüm kullanıcıları yönetin, rol atayın ve erişimi kontrol edin."
              icon={Users}
            />
          }
        />
        <Route
          path="roles"
          element={
            <Placeholder
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
              title="Ayarlar"
              description="Kurum bilgileri, güvenlik politikaları ve entegrasyonlar."
              icon={Settings}
            />
          }
        />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@/lib/supabase";
import type { PortalConfig } from "@/lib/portals";

type Props = {
  portal: PortalConfig;
  children: React.ReactNode;
};

export default function RequireRole({ portal, children }: Props) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to={portal.loginPath}
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  const allowed: UserRole[] =
    portal.role === "admin" ? ["admin"] : [portal.role, "admin"];

  if (!profile || !allowed.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

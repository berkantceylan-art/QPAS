import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Moon,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { fadeUp, staggerContainer } from "@/components/motion/variants";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";
import type { PortalConfig } from "@/lib/portals";

const loginSchema = z.object({
  email: z.string().min(1, "E-posta gerekli").email("Geçerli bir e-posta girin"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function PortalLogin({ portal }: { portal: PortalConfig }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, loading, signIn } = useAuth();
  const { theme, toggle } = useTheme();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (!loading && user && profile) {
      const canAccess =
        profile.role === "admin" || profile.role === portal.role;
      if (canAccess) {
        const from = (location.state as { from?: string } | null)?.from;
        navigate(
          from && from.startsWith(portal.basePath) ? from : portal.basePath,
          { replace: true },
        );
      }
    }
  }, [loading, user, profile, navigate, location.state, portal]);

  const onSubmit = async (values: LoginValues) => {
    setFormError(null);
    const { error } = await signIn(values.email, values.password);
    if (error) {
      setFormError("E-posta veya şifre hatalı.");
      return;
    }
    // Auth state change will trigger profile load via AuthProvider.
    // We still need to verify the role matches this portal.
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) {
      setFormError("Oturum oluşturulamadı.");
      return;
    }
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", uid)
      .maybeSingle();

    const allowed: string[] =
      portal.role === "admin"
        ? ["admin"]
        : [portal.role, "admin"];
    if (!profileRow || !allowed.includes(profileRow.role)) {
      await supabase.auth.signOut();
      setFormError(portal.login.mismatchError);
      return;
    }
    navigate(portal.basePath, { replace: true });
  };

  const {
    eyebrow,
    eyebrowIcon: EyebrowIcon,
    title,
    subtitle,
    decorativeIcon: DecorativeIcon,
    decorativeIconGradient,
    decorativeTitle,
    decorativeDescription,
    decorativeBullets,
  } = portal.login;

  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      {/* Top utility bar */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-6 py-5 lg:px-10">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-500 shadow-md shadow-indigo-500/30">
            <KeyRound className="h-4 w-4 text-white" strokeWidth={2.5} />
          </span>
          <span className="text-lg font-bold tracking-tight">
            Q-<span className="gradient-text">Pass</span>
          </span>
        </Link>
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
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Landing'e Dön</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Form side */}
      <div className="relative flex items-center justify-center px-6 py-24 sm:px-10">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-radial-fade opacity-80 lg:hidden" />
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="w-full max-w-md"
        >
          <motion.div variants={fadeUp}>
            <span
              className={`inline-flex items-center gap-2 rounded-full border border-slate-300/40 dark:border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider ${portal.accentBadge}`}
            >
              <EyebrowIcon className="h-3.5 w-3.5" />
              {eyebrow}
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="mt-5 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white"
          >
            {title}
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="mt-2 text-sm text-slate-600 dark:text-slate-400"
          >
            {subtitle}
          </motion.p>

          <motion.form
            variants={fadeUp}
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="mt-8 space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@qpass.io"
                invalid={!!errors.email}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-rose-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Şifre</Label>
                <a
                  href="#!"
                  className={`text-xs font-medium ${portal.accentText} hover:opacity-80`}
                >
                  Şifremi unuttum
                </a>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  invalid={!!errors.password}
                  className="pr-10"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-rose-500">{errors.password.message}</p>
              )}
            </div>


            {formError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                {formError}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Giriş yapılıyor…
                </>
              ) : (
                <>Giriş Yap</>
              )}
            </Button>

            <p className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400">
              Hesap oluşturma sadece sistem yöneticisi tarafından yapılır.
            </p>
          </motion.form>
        </motion.div>
      </div>

      {/* Decorative side */}
      <div className="relative hidden overflow-hidden lg:block">
        <div className="pointer-events-none absolute inset-0 bg-radial-fade" />
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-40 mask-fade-y dark:opacity-25" />
        <div className="relative flex h-full flex-col items-center justify-center px-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="glass rounded-3xl p-10 text-center shadow-2xl shadow-slate-900/10"
          >
            <div
              className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${decorativeIconGradient} shadow-lg ring-1 ring-white/20`}
            >
              <DecorativeIcon className="h-8 w-8 text-white" strokeWidth={2.25} />
            </div>
            <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {decorativeTitle}
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {decorativeDescription}
            </p>

            <ul className="mt-8 space-y-3 text-left text-sm">
              {decorativeBullets.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300"
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full bg-gradient-to-br ${decorativeIconGradient}`}
                  />
                  {f}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

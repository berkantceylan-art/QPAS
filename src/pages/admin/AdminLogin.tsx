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
  ShieldCheck,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { fadeUp, staggerContainer } from "@/components/motion/variants";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";

const loginSchema = z.object({
  email: z.string().min(1, "E-posta gerekli").email("Geçerli bir e-posta girin"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
  remember: z.boolean().optional(),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, loading } = useAuth();
  const { theme, toggle } = useTheme();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: true },
  });

  useEffect(() => {
    if (!loading && user && profile?.role === "admin") {
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from.startsWith("/admin") ? from : "/admin", {
        replace: true,
      });
    }
  }, [loading, user, profile, navigate, location.state]);

  const onSubmit = async (values: LoginValues) => {
    setFormError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    if (error) {
      setFormError("E-posta veya şifre hatalı.");
      return;
    }
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

    if (!profileRow || profileRow.role !== "admin") {
      await supabase.auth.signOut();
      setFormError("Bu hesabın admin yetkisi yok.");
      return;
    }
    navigate("/admin", { replace: true });
  };

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
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-indigo-50/70 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:border-indigo-400/20 dark:bg-indigo-500/10 dark:text-indigo-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin Paneli
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="mt-5 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white"
          >
            Tekrar hoş geldin
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="mt-2 text-sm text-slate-600 dark:text-slate-400"
          >
            Yönetim paneline erişmek için admin hesabınla giriş yap.
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
                  href="#"
                  className="text-xs font-medium text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300"
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
                <p className="text-xs text-rose-500">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 dark:border-white/20 dark:bg-slate-900"
                  {...register("remember")}
                />
                Beni hatırla
              </label>
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
            className="glass rounded-3xl p-10 text-center shadow-2xl shadow-indigo-500/10"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-500 shadow-lg shadow-purple-500/30 ring-1 ring-white/20">
              <ShieldCheck className="h-8 w-8 text-white" strokeWidth={2.25} />
            </div>
            <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Kurumsal kontrol merkezi
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Kullanıcılar, roller, denetim kayıtları ve sistem ayarları tek bir
              güvenli panelden.
            </p>

            <ul className="mt-8 space-y-3 text-left text-sm">
              {[
                "Rol bazlı yetki & SSO",
                "Gerçek zamanlı denetim kayıtları",
                "Tüm modüller üzerinde tam kontrol",
              ].map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-500" />
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

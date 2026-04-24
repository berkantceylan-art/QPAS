import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, LifeBuoy, PhoneCall, Siren, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  supabase,
  type EmergencyKind,
  type EmergencyRequest,
} from "@/lib/supabase";
import { cn } from "@/lib/utils";

type Toast = {
  id: string;
  kind: EmergencyKind;
  note: string | null;
  employee_name: string;
  created_at: string;
};

const KIND_LABEL: Record<EmergencyKind, string> = {
  call_hr: "İK'yı Ara",
  help: "Yardım",
  sos: "SOS",
};

const KIND_ICON: Record<EmergencyKind, typeof PhoneCall> = {
  call_hr: PhoneCall,
  help: LifeBuoy,
  sos: Siren,
};

const KIND_GRADIENT: Record<EmergencyKind, string> = {
  call_hr: "from-sky-500 to-blue-500",
  help: "from-amber-500 to-orange-500",
  sos: "from-rose-500 to-red-600",
};

export default function EmergencyToastProvider({
  children,
  targetHref,
}: {
  children: ReactNode;
  targetHref: string;
}) {
  const { profile } = useAuth();
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    if (!profile?.company_id) return;
    const companyId = profile.company_id;
    const channel = supabase
      .channel(`emergency:${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "emergency_requests",
          filter: `company_id=eq.${companyId}`,
        },
        async (payload) => {
          const row = payload.new as EmergencyRequest;
          let employeeName = "Bir çalışan";
          const { data: emp } = await supabase
            .from("employees")
            .select("full_name")
            .eq("id", row.employee_id)
            .maybeSingle();
          if (emp?.full_name) employeeName = emp.full_name;
          const toast: Toast = {
            id: row.id,
            kind: row.kind,
            note: row.note,
            employee_name: employeeName,
            created_at: row.created_at,
          };
          setToasts((prev) => [toast, ...prev].slice(0, 4));
          playBeep(row.kind);
          const ttl = row.kind === "sos" ? 30000 : 12000;
          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== toast.id));
          }, ttl);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.company_id]);

  const dismiss = (id: string) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2">
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const Icon = KIND_ICON[t.kind];
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 24, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 24, scale: 0.96 }}
                transition={{ duration: 0.25 }}
                className={cn(
                  "pointer-events-auto overflow-hidden rounded-2xl border-2 border-white/40 shadow-2xl ring-1 ring-black/5",
                )}
              >
                <div
                  className={cn(
                    "flex items-start gap-3 bg-gradient-to-r p-4 text-white",
                    KIND_GRADIENT[t.kind],
                  )}
                >
                  <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-white/20 ring-2 ring-white/40">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80">
                      <AlertTriangle className="mr-1 inline h-3 w-3" />
                      Yeni {KIND_LABEL[t.kind]}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-bold">
                      {t.employee_name}
                    </p>
                    {t.note && (
                      <p className="mt-0.5 line-clamp-2 text-xs italic text-white/90">
                        "{t.note}"
                      </p>
                    )}
                    <Link
                      to={targetHref}
                      onClick={() => dismiss(t.id)}
                      className="mt-2 inline-flex items-center gap-1 rounded-md bg-white/20 px-2 py-1 text-xs font-semibold hover:bg-white/30"
                    >
                      Acil Çağrılara Git →
                    </Link>
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss(t.id)}
                    aria-label="Kapat"
                    className="flex h-7 w-7 flex-none items-center justify-center rounded-lg text-white/70 hover:bg-white/20 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </>
  );
}

function playBeep(kind: EmergencyKind) {
  try {
    const AudioCtx =
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext ?? window.AudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = kind === "sos" ? 880 : 660;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      ctx.currentTime + (kind === "sos" ? 0.55 : 0.25),
    );
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (kind === "sos" ? 0.6 : 0.3));
  } catch {
    // silent fail — audio not critical
  }
}

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Megaphone,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import {
  supabase,
  type Announcement,
  type AnnouncementRead,
} from "@/lib/supabase";
import { cardReveal, staggerContainer } from "@/components/motion/variants";
import { cn } from "@/lib/utils";

type AnnouncementRow = Announcement & {
  author?: { id: string; full_name: string | null } | null;
};

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function EmployeeAnnouncements() {
  const { user } = useAuth();
  const [rows, setRows] = useState<AnnouncementRow[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    const [ann, reads] = await Promise.all([
      supabase
        .from("announcements")
        .select("*, author:profiles!announcements_created_by_fkey(id, full_name)")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("announcement_reads").select("*").eq("user_id", user.id),
    ]);
    if (ann.error) setError(ann.error.message);
    setRows((ann.data as AnnouncementRow[]) ?? []);
    setReadIds(
      new Set(
        ((reads.data as AnnouncementRead[]) ?? []).map((r) => r.announcement_id),
      ),
    );
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = async (announcementId: string) => {
    if (!user?.id) return;
    if (readIds.has(announcementId)) return;
    const { error: upsertError } = await supabase
      .from("announcement_reads")
      .upsert(
        { announcement_id: announcementId, user_id: user.id },
        { onConflict: "announcement_id,user_id" },
      );
    if (!upsertError) {
      setReadIds((prev) => new Set(prev).add(announcementId));
    }
  };

  const unreadCount = rows.filter((r) => !readIds.has(r.id)).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400">
            Modül
          </p>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            <Megaphone className="h-7 w-7 text-orange-500" />
            Duyurular
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-600 dark:text-rose-300">
                {unreadCount} okunmadı
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Firma yöneticinizin paylaştığı duyurular.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading} className="gap-1.5">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Yenile
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500 dark:text-slate-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Yükleniyor…
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white/40 p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
          Henüz duyuru yok.
        </p>
      ) : (
        <motion.ul
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="space-y-3"
        >
          {rows.map((a) => {
            const isRead = readIds.has(a.id);
            return (
              <motion.li
                key={a.id}
                variants={cardReveal}
                onClick={() => !isRead && markRead(a.id)}
                className={cn(
                  "cursor-pointer rounded-2xl border px-4 py-3.5 shadow-sm transition-colors",
                  isRead
                    ? "border-slate-200/70 bg-white/80 dark:border-white/10 dark:bg-slate-900/60"
                    : "border-orange-200 bg-orange-50/60 hover:bg-orange-50 dark:border-orange-500/30 dark:bg-orange-500/5 dark:hover:bg-orange-500/10",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {a.title}
                      </p>
                      {!isRead && (
                        <span className="inline-flex h-2 w-2 rounded-full bg-orange-500" />
                      )}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
                      {a.body}
                    </p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {a.author?.full_name ?? "—"} · {formatDate(a.created_at)}
                    </p>
                  </div>
                  {isRead && (
                    <CheckCircle2 className="h-4 w-4 flex-none text-emerald-500" />
                  )}
                </div>
              </motion.li>
            );
          })}
        </motion.ul>
      )}
    </div>
  );
}

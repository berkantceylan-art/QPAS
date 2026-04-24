import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Loader2,
  MessagesSquare,
  RefreshCw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { supabase, type ChatThread } from "@/lib/supabase";
import { PORTALS } from "@/lib/portals";
import { cardReveal, staggerContainer } from "@/components/motion/variants";
import { cn } from "@/lib/utils";
import ChatView from "../comms/ChatView";

type ThreadRow = ChatThread & {
  employee?: { id: string; full_name: string } | null;
};

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    if (sameDay) {
      return new Intl.DateTimeFormat("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    }
    return new Intl.DateTimeFormat("tr-TR", {
      day: "numeric",
      month: "short",
    }).format(d);
  } catch {
    return iso;
  }
}

function initials(name: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters =
    parts.length >= 2
      ? parts[0][0] + parts[parts.length - 1][0]
      : parts[0]?.slice(0, 2) ?? "?";
  return letters.toUpperCase();
}

export default function ClientMessages() {
  const client = PORTALS.client;
  const { user } = useAuth();
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ThreadRow | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("chat_threads")
      .select("*, employee:employees(id, full_name)")
      .order("last_message_at", {
        ascending: false,
        nullsFirst: false,
      })
      .limit(200);
    if (fetchError) setError(fetchError.message);
    setThreads((data as ThreadRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: update thread list when any message lands
  useEffect(() => {
    const channel = supabase
      .channel("client-threads")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        () => {
          load();
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_threads" },
        () => {
          load();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter(
      (t) =>
        t.employee?.full_name?.toLowerCase().includes(q) ||
        t.last_message_preview?.toLowerCase().includes(q),
    );
  }, [threads, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p
            className={cn(
              "text-sm font-semibold uppercase tracking-[0.18em]",
              client.accentEyebrow,
            )}
          >
            Modül
          </p>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            <MessagesSquare className="h-7 w-7 text-cyan-500" />
            Çalışan Mesajları
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Firmanızdaki çalışanlarla doğrudan mesajlaşın.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={load}
          disabled={loading}
          className="gap-1.5"
        >
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

      <div className="grid gap-4 lg:grid-cols-[320px_1fr] lg:items-start">
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Çalışan ara…"
              className="pl-9"
            />
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500 dark:text-slate-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Yükleniyor…
            </div>
          ) : filtered.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-white/40 p-6 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
              {threads.length === 0
                ? "Henüz çalışan sohbeti yok. Çalışan mesaj gönderdiğinde burada görünür."
                : "Bu filtrede sohbet yok."}
            </p>
          ) : (
            <motion.ul
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="space-y-2"
            >
              {filtered.map((t) => {
                const isSelected = selected?.id === t.id;
                const preview = t.last_message_preview ?? "— Sohbet başlangıcı";
                return (
                  <motion.li
                    key={t.id}
                    variants={cardReveal}
                    onClick={() => setSelected(t)}
                    className={cn(
                      "cursor-pointer rounded-xl border px-3 py-2.5 shadow-sm transition-colors",
                      isSelected
                        ? "border-cyan-500/60 bg-cyan-500/10 dark:bg-cyan-500/10"
                        : "border-slate-200/70 bg-white/80 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900/60 dark:hover:bg-white/5",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex h-10 w-10 flex-none items-center justify-center rounded-full bg-gradient-to-br text-xs font-semibold text-white shadow-sm",
                          client.accentGradient,
                        )}
                      >
                        {initials(t.employee?.full_name ?? null)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                            {t.employee?.full_name ?? "—"}
                          </p>
                          <span className="shrink-0 text-[10px] text-slate-500 dark:text-slate-400">
                            {formatWhen(t.last_message_at)}
                          </span>
                        </div>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {preview}
                        </p>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </motion.ul>
          )}
        </div>

        <div className="h-[70vh] lg:h-[calc(100vh-12rem)]">
          {selected && user ? (
            <div className="flex h-full flex-col space-y-3">
              <div className="rounded-xl border border-slate-200/70 bg-white/80 px-4 py-2.5 dark:border-white/10 dark:bg-slate-900/60">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {selected.employee?.full_name ?? "—"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Bu sohbeti aynı firmadaki tüm yöneticiler görebilir.
                </p>
              </div>
              <div className="min-h-0 flex-1">
                <ChatView
                  threadId={selected.id}
                  companyId={selected.company_id}
                  currentUserId={user.id}
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/40 p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
              Mesajlaşmak için soldan bir çalışan seç.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

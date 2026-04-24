import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { supabase, type ChatMessage } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type MessageRow = ChatMessage & {
  sender?: { id: string; full_name: string | null; role: string } | null;
};

type Props = {
  threadId: string;
  companyId: string;
  currentUserId: string;
  emptyLabel?: string;
};

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    const today = new Date();
    const sameDay =
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate();
    if (sameDay) {
      return new Intl.DateTimeFormat("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    }
    return new Intl.DateTimeFormat("tr-TR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return iso;
  }
}

export default function ChatView({
  threadId,
  companyId,
  currentUserId,
  emptyLabel = "Henüz mesaj yok. İlk mesajı sen gönder.",
}: Props) {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from("chat_messages")
        .select("*, sender:profiles(id, full_name, role)")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (!mounted) return;
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setMessages((data as MessageRow[]) ?? []);
      }
      setLoading(false);
      scrollToBottom();
    })();
    return () => {
      mounted = false;
    };
  }, [threadId, scrollToBottom]);

  useEffect(() => {
    const channel = supabase
      .channel(`chat:${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        async (payload) => {
          const incoming = payload.new as ChatMessage;
          if (!incoming.sender_id) return;
          const { data: sender } = await supabase
            .from("profiles")
            .select("id, full_name, role")
            .eq("id", incoming.sender_id)
            .maybeSingle();
          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [
              ...prev,
              { ...incoming, sender: sender as MessageRow["sender"] },
            ];
          });
          scrollToBottom();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, scrollToBottom]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    setError(null);
    const { error: insertError } = await supabase.from("chat_messages").insert({
      thread_id: threadId,
      company_id: companyId,
      sender_id: currentUserId,
      body,
    });
    setSending(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setDraft("");
  };

  return (
    <div className="flex h-full min-h-[400px] flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 dark:border-white/10 dark:bg-slate-900/60">
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Mesajlar yükleniyor…
          </div>
        ) : messages.length === 0 ? (
          <p className="flex h-full items-center justify-center text-center text-sm text-slate-500 dark:text-slate-400">
            {emptyLabel}
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === currentUserId;
            const senderRole = m.sender?.role ?? "";
            const roleLabel =
              senderRole === "employee"
                ? "Çalışan"
                : senderRole === "client"
                  ? "Yönetici"
                  : senderRole === "admin"
                    ? "Admin"
                    : "";
            return (
              <div
                key={m.id}
                className={cn(
                  "flex w-full",
                  mine ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                    mine
                      ? "rounded-br-sm bg-gradient-to-br from-cyan-500 to-sky-500 text-white"
                      : "rounded-bl-sm border border-slate-200/70 bg-white text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white",
                  )}
                >
                  {!mine && m.sender?.full_name && (
                    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {m.sender.full_name}
                      {roleLabel && ` · ${roleLabel}`}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words leading-relaxed">
                    {m.body}
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-right text-[10px]",
                      mine
                        ? "text-white/70"
                        : "text-slate-400 dark:text-slate-500",
                    )}
                  >
                    {formatWhen(m.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {error && (
        <div className="border-t border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSend}
        className="border-t border-slate-200/70 bg-slate-50/60 p-2 dark:border-white/10 dark:bg-white/5"
      >
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            placeholder="Mesaj yaz… (Enter gönder · Shift+Enter yeni satır)"
            disabled={sending}
            className="max-h-32 min-h-[40px] resize-none"
          />
          <Button
            type="submit"
            size="sm"
            disabled={sending || !draft.trim()}
            className="gap-1.5"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Gönder
          </Button>
        </div>
      </form>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Loader2, MessagesSquare, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase, type ChatThread } from "@/lib/supabase";
import ChatView from "../comms/ChatView";

export default function EmployeeMessages() {
  const { user } = useAuth();
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data, error: rpcError } = await supabase.rpc(
        "chat_get_or_create_thread",
      );
      if (!mounted) return;
      if (rpcError) {
        setError(rpcError.message);
      } else {
        setThread(data as ChatThread);
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 dark:text-slate-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Sohbet yükleniyor…
      </div>
    );
  }

  if (error || !thread || !user) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
        {error ?? "Sohbet açılamadı."}
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col space-y-4 sm:h-[calc(100vh-10rem)]">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400">
          Modül
        </p>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
          <MessagesSquare className="h-7 w-7 text-orange-500" />
          İK ile Sohbet
        </h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          Sadece firma yöneticinle görüşüyorsun — mesajlar şifrelenmiş kanal
          üzerinden anlık iletilir.
        </p>
      </div>
      <div className="min-h-0 flex-1">
        <ChatView
          threadId={thread.id}
          companyId={thread.company_id}
          currentUserId={user.id}
          emptyLabel="İlk mesajını yaz — yöneticin anında görür."
        />
      </div>
    </div>
  );
}

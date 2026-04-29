import { useCallback, useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase, type SystemNotification } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export default function NotificationBell() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!profile?.company_id) return;
    
    // Yalnızca okunmamış ve son 30 günlük bildirimleri al
    const { data, error } = await supabase
      .from("system_notifications")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      setNotifications(data as SystemNotification[]);
      setUnreadCount(data.filter((n) => !n.is_read).length);
    }
  }, [profile?.company_id]);

  useEffect(() => {
    fetchNotifications();

    if (!profile?.company_id) return;

    // Realtime subscription for new notifications
    const channel = supabase
      .channel("system_notifications_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "system_notifications",
          filter: `company_id=eq.${profile.company_id}`,
        },
        (payload) => {
          const newNotif = payload.new as SystemNotification;
          setNotifications((prev) => [newNotif, ...prev].slice(0, 20));
          setUnreadCount((c) => c + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications, profile?.company_id]);

  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    await supabase.from("system_notifications").update({ is_read: true }).eq("id", id);
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0 || !profile?.company_id) return;
    setLoading(true);
    
    // Görünen okunmamışları bul
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    
    if (unreadIds.length > 0) {
      await supabase.from("system_notifications").update({ is_read: true }).in("id", unreadIds);
    }
    
    setLoading(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-2 top-2 flex h-2 w-2 items-center justify-center rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm sm:hidden"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-full z-50 mt-2 w-80 sm:w-96 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-white/5 dark:bg-white/5">
                <h3 className="font-semibold text-slate-900 dark:text-white">Bildirimler</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      disabled={loading}
                      className="text-xs font-medium text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300"
                    >
                      Tümünü okundu işaretle
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="max-h-[60vh] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                    <Bell className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      Yeni bildirim yok
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-white/5">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={cn(
                          "relative px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-white/5",
                          !n.is_read && "bg-cyan-50/50 dark:bg-cyan-500/5"
                        )}
                      >
                        {!n.is_read && (
                          <div className="absolute left-2 top-4 h-1.5 w-1.5 rounded-full bg-cyan-500" />
                        )}
                        <div className="ml-2">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {n.title}
                          </p>
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                            {n.message}
                          </p>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400">
                              {new Date(n.created_at).toLocaleDateString("tr-TR", { hour: '2-digit', minute:'2-digit' })}
                            </span>
                            <div className="flex gap-2">
                              {!n.is_read && (
                                <button
                                  onClick={() => markAsRead(n.id)}
                                  className="text-[10px] font-medium text-cyan-600 dark:text-cyan-400"
                                >
                                  Okundu yap
                                </button>
                              )}
                              {n.link && (
                                <Link
                                  to={n.link}
                                  onClick={() => {
                                    markAsRead(n.id);
                                    setIsOpen(false);
                                  }}
                                  className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400"
                                >
                                  İncele →
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Eye,
  Loader2,
  Megaphone,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Dialog } from "@/components/ui/Dialog";
import { useAuth } from "@/hooks/useAuth";
import {
  supabase,
  type Announcement,
  type AnnouncementRead,
} from "@/lib/supabase";
import { PORTALS } from "@/lib/portals";
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

export default function ClientAnnouncements() {
  const client = PORTALS.client;
  const { profile } = useAuth();
  const [rows, setRows] = useState<AnnouncementRow[]>([]);
  const [readCounts, setReadCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const annRes = await supabase
      .from("announcements")
      .select("*, author:profiles!announcements_created_by_fkey(id, full_name)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (annRes.error) {
      setError(annRes.error.message);
      setLoading(false);
      return;
    }
    const list = (annRes.data as AnnouncementRow[]) ?? [];
    setRows(list);
    if (list.length > 0) {
      const ids = list.map((r) => r.id);
      const readsRes = await supabase
        .from("announcement_reads")
        .select("announcement_id")
        .in("announcement_id", ids);
      const counts = new Map<string, number>();
      for (const r of (readsRes.data as AnnouncementRead[]) ?? []) {
        counts.set(r.announcement_id, (counts.get(r.announcement_id) ?? 0) + 1);
      }
      setReadCounts(counts);
    } else {
      setReadCounts(new Map());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (a: Announcement) => {
    if (!confirm(`"${a.title}" duyurusunu silmek istediğine emin misin?`))
      return;
    const { error: delError } = await supabase
      .from("announcements")
      .delete()
      .eq("id", a.id);
    if (delError) {
      setError(delError.message);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== a.id));
  };

  if (!profile?.company_id) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
        Hesabınız bir firmaya bağlı değil.
      </div>
    );
  }

  return (
    <div className="space-y-8">
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
            <Megaphone className="h-7 w-7 text-cyan-500" />
            Duyurular
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Çalışanlarınıza firma içi duyurular yayınlayın.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <Button
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Yeni Duyuru
          </Button>
        </div>
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
          Henüz duyuru yok. İlk duyuruyu yayınla.
        </p>
      ) : (
        <motion.ul
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="space-y-3"
        >
          {rows.map((a) => (
            <motion.li
              key={a.id}
              variants={cardReveal}
              className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3.5 shadow-sm dark:border-white/10 dark:bg-slate-900/60"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {a.title}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
                    {a.body}
                  </p>
                  <p className="mt-2 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span>
                      {a.author?.full_name ?? "—"} · {formatDate(a.created_at)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {readCounts.get(a.id) ?? 0} okundu
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(a)}
                  aria-label="Sil"
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      )}

      <CreateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        companyId={profile.company_id}
        onCreated={load}
      />
    </div>
  );
}

function CreateDialog({
  open,
  onOpenChange,
  companyId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setBody("");
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 2 || body.trim().length < 2) {
      setError("Başlık ve içerik en az 2 karakter olmalı");
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: insertError } = await supabase.from("announcements").insert({
      company_id: companyId,
      title: title.trim(),
      body: body.trim(),
    });
    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    onCreated();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Yeni Duyuru"
      description="Firmanızdaki tüm çalışanlara yayımlanır."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="ann-title">Başlık</Label>
          <Input
            id="ann-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="örn. Pazartesi toplantısı"
            disabled={submitting}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ann-body">İçerik</Label>
          <Textarea
            id="ann-body"
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Duyuru metni…"
            disabled={submitting}
          />
        </div>
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
            <span>{error}</span>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Vazgeç
          </Button>
          <Button type="submit" disabled={submitting} className="gap-1.5">
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Megaphone className="h-4 w-4" />
            )}
            Yayımla
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

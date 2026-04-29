import { useCallback, useEffect, useState } from "react";
import { AlertCircle, ArrowLeftRight, Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Dialog } from "@/components/ui/Dialog";
import { PORTALS } from "@/lib/portals";
import { cn } from "@/lib/utils";
import { supabase, type ShiftSwap } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export default function ShiftSwapPage() {
  const portal = PORTALS.employee;
  const { profile } = useAuth();
  
  const [swaps, setSwaps] = useState<ShiftSwap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    if (!profile?.company_id || !profile?.id) return;
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from("shift_swaps")
      .select("*, requester:employees!requester_id(id, full_name), target:employees!target_id(id, full_name)")
      .eq("company_id", profile.company_id)
      .or(`requester_id.eq.${profile.id},target_id.eq.${profile.id}`)
      .order("created_at", { ascending: false });

    if (err) setError(err.message);
    else setSwaps(data as any[]);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRespond = async (swapId: string, accept: boolean) => {
    if (!confirm(accept ? "Takas talebini onaylıyor musunuz?" : "Takas talebini reddediyor musunuz?")) return;
    
    // If peer accepts, it goes to pending_manager. If rejects, it goes to rejected.
    const newStatus = accept ? "pending_manager" : "rejected";
    
    const { error: err } = await supabase
      .from("shift_swaps")
      .update({ status: newStatus })
      .eq("id", swapId);

    if (err) setError(err.message);
    else load();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_peer":
        return <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">Arkadaş Onayı Bekliyor</span>;
      case "pending_manager":
        return <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">Müdür Onayı Bekliyor</span>;
      case "approved":
        return <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">Onaylandı</span>;
      case "rejected":
        return <span className="rounded bg-rose-100 px-2 py-0.5 text-xs text-rose-700 dark:bg-rose-500/20 dark:text-rose-400">Reddedildi</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={cn("text-sm font-semibold uppercase tracking-[0.18em]", portal.accentEyebrow)}>
            Operasyon
          </p>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            <ArrowLeftRight className="h-7 w-7 text-indigo-500" />
            Vardiya Takası
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Çalışma arkadaşlarınızla vardiya değişim taleplerinizi yönetin.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700">
          Yeni Talep
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Yükleniyor…
        </div>
      ) : swaps.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/40 p-12 text-center dark:border-white/10 dark:bg-white/5">
          <ArrowLeftRight className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">Henüz takas talebi yok.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {swaps.map((s) => {
            const isTarget = s.target_id === profile?.id;
            const isPendingMe = isTarget && s.status === "pending_peer";

            return (
              <div key={s.id} className={cn(
                "rounded-xl border p-5 shadow-sm transition-all",
                isPendingMe ? "border-indigo-300 bg-indigo-50/50 dark:border-indigo-500/30 dark:bg-indigo-500/5" : "border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900"
              )}>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">{new Date(s.date_requested).toLocaleDateString('tr-TR')}</span>
                  {getStatusBadge(s.status)}
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex-1 rounded-lg bg-slate-50 p-2 text-center text-sm font-medium dark:bg-slate-800">
                    {s.requester?.full_name}
                  </div>
                  <ArrowLeftRight className="h-4 w-4 text-slate-400" />
                  <div className="flex-1 rounded-lg bg-slate-50 p-2 text-center text-sm font-medium dark:bg-slate-800">
                    {s.target?.full_name}
                  </div>
                </div>

                {s.reason && (
                  <p className="mt-3 text-xs italic text-slate-500 dark:text-slate-400">"{s.reason}"</p>
                )}

                {isPendingMe && (
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => handleRespond(s.id, false)}>
                      <X className="mr-1 h-3 w-3" /> Reddet
                    </Button>
                    <Button size="sm" className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={() => handleRespond(s.id, true)}>
                      <Check className="mr-1 h-3 w-3" /> Onayla
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {dialogOpen && profile && (
        <CreateSwapDialog 
          companyId={profile.company_id!} 
          requesterId={profile.id!} 
          open={dialogOpen} 
          onClose={() => setDialogOpen(false)} 
          onSuccess={load} 
        />
      )}
    </div>
  );
}

function CreateSwapDialog({ companyId, requesterId, open, onClose, onSuccess }: any) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [targetId, setTargetId] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      supabase.from("employees").select("id, full_name").eq("company_id", companyId).eq("status", "active").neq("id", requesterId).then(({data}) => {
        if (data) {
          setEmployees(data);
          setTargetId(data[0]?.id || "");
        }
      });
    }
  }, [open, companyId, requesterId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("shift_swaps").insert({
      company_id: companyId,
      requester_id: requesterId,
      target_id: targetId,
      date_requested: dateStr,
      reason
    });
    setLoading(false);
    if (!error) {
      onSuccess();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} title="Vardiya Değişim Talebi">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Kiminle değişmek istiyorsunuz?</Label>
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-white/10 dark:bg-slate-900"
            required
          >
            {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Hangi tarih için?</Label>
          <Input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} required disabled={loading} />
        </div>
        <div className="space-y-1.5">
          <Label>Mazeretiniz (Opsiyonel)</Label>
          <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} disabled={loading} placeholder="Örn: Hastane randevum var." />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>İptal</Button>
          <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Talep Gönder"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

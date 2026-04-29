import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Box, Check, CheckCircle2, Laptop, Loader2, PenTool, Smartphone } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { PORTALS } from "@/lib/portals";
import { cn } from "@/lib/utils";
import { supabase, type AssetAssignment } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

const ICONS: Record<string, React.ReactNode> = {
  Bilgisayar: <Laptop className="h-5 w-5" />,
  Telefon: <Smartphone className="h-5 w-5" />,
  "Diğer": <Box className="h-5 w-5" />,
};

export default function MyAssets() {
  const portal = PORTALS.employee;
  const { profile } = useAuth();
  
  const [assignments, setAssignments] = useState<AssetAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [signingAssignment, setSigningAssignment] = useState<AssetAssignment | null>(null);

  const load = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    setError(null);

    // Join with inventory to get details
    const { data, error: err } = await supabase
      .from("asset_assignments")
      .select("*, inventory(*)")
      .eq("employee_id", profile.id)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (err) setError(err.message);
    else setAssignments(data as AssetAssignment[]);
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-8">
      <div>
        <p className={cn("text-sm font-semibold uppercase tracking-[0.18em]", portal.accentEyebrow)}>
          Demirbaş
        </p>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
          <Box className="h-7 w-7 text-emerald-500" />
          Zimmetlerim
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Üzerinizde bulunan firma demirbaşları ve dijital imza durumları.
        </p>
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
      ) : assignments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/40 p-12 text-center dark:border-white/10 dark:bg-white/5">
          <Box className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">Üzerinizde zimmetli demirbaş bulunmuyor.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {assignments.map((a) => (
            <div key={a.id} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  {ICONS[a.inventory?.category || "Diğer"] || ICONS["Diğer"]}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{a.inventory?.item_name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">S/N: {a.inventory?.serial_no || "Yok"}</p>
                  
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">
                      Teslim: {new Date(a.given_date).toLocaleDateString('tr-TR')}
                    </span>
                    {a.digital_signature ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" /> İmzalandı
                      </span>
                    ) : (
                      <Button size="sm" onClick={() => setSigningAssignment(a)} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 h-8 text-xs">
                        <PenTool className="h-3.5 w-3.5" /> İmzala
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {signingAssignment && (
        <SignatureModal
          assignment={signingAssignment}
          onClose={() => setSigningAssignment(null)}
          onSuccess={load}
        />
      )}
    </div>
  );
}

function SignatureModal({ assignment, onClose, onSuccess }: { assignment: AssetAssignment; onClose: () => void; onSuccess: () => void }) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) return;
    
    setSaving(true);
    // Get Base64 image
    const dataURL = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');

    const { error } = await supabase.from("asset_assignments").update({
      digital_signature: dataURL,
      signature_date: new Date().toISOString()
    }).eq("id", assignment.id);

    setSaving(false);
    if (!error) {
      onSuccess();
      onClose();
    }
  };

  return (
    <Dialog open={true} onOpenChange={(o) => !o && onClose()} title="Zimmet Formu İmzası" description="Lütfen aşağıdaki alana parmağınızla veya farenizle imzanızı atın.">
      <div className="space-y-4">
        <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-900/50 dark:text-slate-400">
          <p>
            <strong>{assignment.inventory?.item_name}</strong> (S/N: {assignment.inventory?.serial_no}) cihazını eksiksiz ve çalışır durumda teslim aldığımı kabul ve beyan ederim.
          </p>
        </div>

        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950 overflow-hidden">
          <SignatureCanvas
            ref={sigCanvas}
            penColor="black"
            canvasProps={{ className: "w-full h-48 cursor-crosshair" }}
          />
        </div>

        <div className="flex justify-between pt-2">
          <Button type="button" variant="ghost" onClick={() => sigCanvas.current?.clear()} disabled={saving}>
            Temizle
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>İptal</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              İmzayı Kaydet
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

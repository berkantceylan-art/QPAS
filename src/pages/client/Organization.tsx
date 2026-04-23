import { useEffect, useState } from "react";
import {
  Building,
  Clock,
  Loader2,
  Network,
  UsersRound,
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/Tabs";
import { PORTALS } from "@/lib/portals";
import { useAuth } from "@/hooks/useAuth";
import {
  supabase,
  type Branch,
  type Department,
  type JobTitle,
  type Shift,
} from "@/lib/supabase";
import { cn } from "@/lib/utils";
import DepartmentsPanel from "./organization/DepartmentsPanel";
import JobTitlesPanel from "./organization/JobTitlesPanel";
import BranchesPanel from "./organization/BranchesPanel";
import ShiftsPanel from "./organization/ShiftsPanel";

const TAB_ITEMS = [
  {
    value: "departments",
    label: "Departmanlar",
    shortLabel: "Dept.",
    icon: Network,
  },
  {
    value: "positions",
    label: "Pozisyonlar",
    shortLabel: "Poz.",
    icon: UsersRound,
  },
  {
    value: "branches",
    label: "Şubeler",
    shortLabel: "Şube",
    icon: Building,
  },
  {
    value: "shifts",
    label: "Vardiyalar",
    shortLabel: "Vrd.",
    icon: Clock,
  },
] as const;

export default function Organization() {
  const client = PORTALS.client;
  const { profile } = useAuth();
  const [tab, setTab] = useState<string>("departments");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    setLoadError(null);
    const [depts, titles, brs, shfts] = await Promise.all([
      supabase.from("departments").select("*").order("name"),
      supabase.from("job_titles").select("*").order("name"),
      supabase.from("branches").select("*").order("name"),
      supabase.from("shifts").select("*").order("name"),
    ]);
    const firstError =
      depts.error || titles.error || brs.error || shfts.error;
    if (firstError) setLoadError(firstError.message);
    setDepartments(depts.data ?? []);
    setJobTitles(titles.data ?? []);
    setBranches(brs.data ?? []);
    setShifts(shfts.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  if (!profile?.company_id) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
        Hesabınız bir firmaya bağlı değil. Sistem yöneticisine başvurun.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p
          className={cn(
            "text-sm font-semibold uppercase tracking-[0.18em]",
            client.accentEyebrow,
          )}
        >
          Modül
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
          Organizasyon
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Departman, pozisyon, şube ve vardiya tanımlarını yönet.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500 dark:text-slate-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Yükleniyor…
        </div>
      ) : (
        <Tabs value={tab} onValueChange={setTab} orientation="horizontal">
          <TabsList ariaLabel="Organizasyon sekmeleri">
            {TAB_ITEMS.map(({ value, label, shortLabel, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                shortLabel={shortLabel}
                icon={<Icon className="h-full w-full" />}
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {loadError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              {loadError}
            </div>
          )}

          <TabsContent value="departments">
            <DepartmentsPanel
              companyId={profile.company_id}
              data={departments}
              onChange={setDepartments}
            />
          </TabsContent>
          <TabsContent value="positions">
            <JobTitlesPanel
              companyId={profile.company_id}
              data={jobTitles}
              onChange={setJobTitles}
            />
          </TabsContent>
          <TabsContent value="branches">
            <BranchesPanel
              companyId={profile.company_id}
              data={branches}
              onChange={setBranches}
            />
          </TabsContent>
          <TabsContent value="shifts">
            <ShiftsPanel
              companyId={profile.company_id}
              data={shifts}
              onChange={setShifts}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}


import { useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  CreditCard,
  FileText,
  Loader2,
  Save,
  SmartphoneNfc,
  Trash2,
  UserCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Dialog } from "@/components/ui/Dialog";
import { Sheet } from "@/components/ui/Sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { useAuth } from "@/hooks/useAuth";
import {
  supabase,
  type Branch,
  type Department,
  type Employee,
  type JobTitle,
  type Shift,
} from "@/lib/supabase";
import { cn } from "@/lib/utils";
import EmployeeAccountSection from "./employees/EmployeeAccountSection";

const optionalString = z
  .string()
  .optional()
  .transform((v) => v?.trim() || "");
const optionalEnum = <T extends string>(values: readonly T[]) =>
  z
    .union([z.enum(values as unknown as [T, ...T[]]), z.literal("")])
    .optional()
    .transform((v) => (v as T | "" | undefined) ?? "");
const optionalUuid = z
  .union([z.string().uuid("Geçersiz seçim"), z.literal("")])
  .optional()
  .transform((v) => v ?? "");

const schema = z.object({
  full_name: z.string().min(2, "En az 2 karakter"),
  national_id: z
    .union([
      z.string().regex(/^\d{11}$/, "TC kimlik 11 rakam olmalı"),
      z.literal(""),
    ])
    .optional()
    .transform((v) => v ?? ""),
  birth_date: optionalString,
  gender: optionalEnum(["male", "female", "other"] as const),
  phone: optionalString,
  personal_email: z
    .union([z.string().email("Geçersiz e-posta"), z.literal("")])
    .optional()
    .transform((v) => v ?? ""),
  photo_url: z
    .union([z.string().url("Geçersiz URL"), z.literal("")])
    .optional()
    .transform((v) => v ?? ""),

  employee_no: optionalString,
  hire_date: optionalString,
  resign_date: optionalString,
  status: z.enum(["active", "passive", "resigned", "candidate"]),
  department_id: optionalUuid,
  job_title_id: optionalUuid,
  manager_id: optionalUuid,
  branch_id: optionalUuid,
  contract_type: optionalEnum([
    "full_time",
    "part_time",
    "contractor",
    "intern",
  ] as const),

  salary: z
    .union([z.coerce.number().nonnegative("Negatif olamaz"), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? "" : String(v))),
  iban: z
    .union([
      z
        .string()
        .transform((v) => v.replace(/\s+/g, "").toUpperCase())
        .pipe(z.string().regex(/^TR\d{24}$/, "Geçersiz IBAN (TR + 24 hane)")),
      z.literal(""),
    ])
    .optional()
    .transform((v) => v ?? ""),
  bank_name: optionalString,
  sgk_type: optionalEnum(["standard", "retiree", "disabled"] as const),
  tax_office: optionalString,

  rfid_card_id: optionalString,
  shift_id: optionalUuid,

  notes: optionalString,
});

type FormValues = z.infer<typeof schema>;

const TAB_ITEMS = [
  { value: "general", label: "Genel", shortLabel: "Genel", icon: UserCircle2 },
  { value: "employment", label: "İstihdam", shortLabel: "İş", icon: Briefcase },
  {
    value: "financial",
    label: "Mali & SGK",
    shortLabel: "Mali",
    icon: CreditCard,
  },
  {
    value: "pdks",
    label: "PDKS & Teknik",
    shortLabel: "PDKS",
    icon: SmartphoneNfc,
  },
  {
    value: "documents",
    label: "Belgeler",
    shortLabel: "Belge",
    icon: FileText,
  },
] as const;

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
}

function defaultValues(employee: Employee | null): FormValues {
  return {
    full_name: employee?.full_name ?? "",
    national_id: employee?.national_id ?? "",
    birth_date: employee?.birth_date ?? "",
    gender: (employee?.gender as FormValues["gender"]) ?? "",
    phone: employee?.phone ?? "",
    personal_email: employee?.personal_email ?? "",
    photo_url: employee?.photo_url ?? "",

    employee_no: employee?.employee_no ?? "",
    hire_date: employee?.hire_date ?? "",
    resign_date: employee?.resign_date ?? "",
    status: employee?.status ?? "active",
    department_id: employee?.department_id ?? "",
    job_title_id: employee?.job_title_id ?? "",
    manager_id: employee?.manager_id ?? "",
    branch_id: employee?.branch_id ?? "",
    contract_type: (employee?.contract_type as FormValues["contract_type"]) ?? "",

    salary: employee?.salary != null ? String(employee.salary) : "",
    iban: employee?.iban ?? "",
    bank_name: employee?.bank_name ?? "",
    sgk_type: (employee?.sgk_type as FormValues["sgk_type"]) ?? "",
    tax_office: employee?.tax_office ?? "",

    rfid_card_id: employee?.rfid_card_id ?? "",
    shift_id: employee?.shift_id ?? "",

    notes: employee?.notes ?? "",
  };
}

function toDbPayload(values: FormValues, companyId: string) {
  const nullify = (v: string) => (v === "" ? null : v);
  return {
    company_id: companyId,
    full_name: values.full_name,
    national_id: nullify(values.national_id),
    birth_date: nullify(values.birth_date),
    gender: nullify(values.gender),
    phone: nullify(values.phone),
    personal_email: nullify(values.personal_email),
    photo_url: nullify(values.photo_url),

    employee_no: nullify(values.employee_no),
    hire_date: nullify(values.hire_date),
    resign_date: nullify(values.resign_date),
    status: values.status,
    department_id: nullify(values.department_id),
    job_title_id: nullify(values.job_title_id),
    manager_id: nullify(values.manager_id),
    branch_id: nullify(values.branch_id),
    contract_type: nullify(values.contract_type),

    salary: values.salary === "" ? null : Number(values.salary),
    iban: nullify(values.iban),
    bank_name: nullify(values.bank_name),
    sgk_type: nullify(values.sgk_type),
    tax_office: nullify(values.tax_office),

    rfid_card_id: nullify(values.rfid_card_id),
    shift_id: nullify(values.shift_id),

    notes: nullify(values.notes),
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  departments: Department[];
  jobTitles: JobTitle[];
  branches: Branch[];
  shifts: Shift[];
  otherEmployees: Employee[];
  onSaved: (saved: Employee) => void;
  onDeleted: (id: string) => void;
};

export default function PersonnelCard(props: Props) {
  const isMobile = useIsMobile();
  const isEdit = props.employee !== null;
  const Container = isMobile ? Sheet : Dialog;

  return (
    <Container
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={isEdit ? props.employee?.full_name || "Çalışan" : "Yeni Çalışan"}
      description={
        isEdit
          ? "Personel kartı — tüm sekmeler aynı kayıt üzerinde çalışır."
          : "Yeni personel kaydı oluştur."
      }
      className={isMobile ? undefined : "max-w-3xl sm:max-w-3xl"}
    >
      <PersonnelCardForm {...props} isMobile={isMobile} />
    </Container>
  );
}

function PersonnelCardForm({
  employee,
  departments,
  jobTitles,
  branches,
  shifts,
  otherEmployees,
  onSaved,
  onDeleted,
  onOpenChange,
  isMobile,
}: Props & { isMobile: boolean }) {
  const { profile } = useAuth();
  const [tab, setTab] = useState<string>("general");
  const [apiError, setApiError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(employee),
  });

  useEffect(() => {
    reset(defaultValues(employee));
    setTab("general");
    setApiError(null);
    setSavedFlash(false);
  }, [employee?.id, reset]);

  const isEdit = employee !== null;
  const linkedManagers = otherEmployees.filter(
    (e) => e.status === "active" || e.status === "passive",
  );

  const onSubmit = async (values: FormValues) => {
    setApiError(null);
    setSavedFlash(false);
    if (!profile?.company_id) {
      setApiError("Kullanıcı bir firmaya bağlı değil.");
      return;
    }
    const payload = toDbPayload(values, profile.company_id);
    if (isEdit && employee) {
      const { data, error } = await supabase
        .from("employees")
        .update(payload)
        .eq("id", employee.id)
        .select()
        .single();
      if (error) {
        setApiError(error.message);
        return;
      }
      onSaved(data as Employee);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } else {
      const { data, error } = await supabase
        .from("employees")
        .insert(payload)
        .select()
        .single();
      if (error) {
        setApiError(error.message);
        return;
      }
      onSaved(data as Employee);
      onOpenChange(false);
    }
  };

  const handleDelete = async () => {
    if (!employee) return;
    if (!confirm(`${employee.full_name} kaydını silmek istediğinden emin misin?`))
      return;
    setDeleting(true);
    setApiError(null);
    const { error } = await supabase
      .from("employees")
      .delete()
      .eq("id", employee.id);
    setDeleting(false);
    if (error) {
      setApiError(error.message);
      return;
    }
    onDeleted(employee.id);
    onOpenChange(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <Tabs
        value={tab}
        onValueChange={setTab}
        orientation={isMobile ? "horizontal" : "vertical"}
      >
        <TabsList ariaLabel="Personel kartı sekmeleri">
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

        <TabsContent value="general">
          <FieldGrid>
            <Field label="Ad Soyad" error={errors.full_name?.message} required>
              <Input
                invalid={!!errors.full_name}
                placeholder="Ad Soyad"
                {...register("full_name")}
              />
            </Field>
            <Field
              label="TC Kimlik No"
              error={errors.national_id?.message}
              hint="11 rakam"
            >
              <Input
                inputMode="numeric"
                maxLength={11}
                invalid={!!errors.national_id}
                placeholder="11 haneli TC kimlik"
                {...register("national_id")}
              />
            </Field>
            <Field label="Doğum Tarihi" error={errors.birth_date?.message}>
              <Input type="date" {...register("birth_date")} />
            </Field>
            <Field label="Cinsiyet">
              <Select {...register("gender")}>
                <option value="">— Seçiniz —</option>
                <option value="female">Kadın</option>
                <option value="male">Erkek</option>
                <option value="other">Belirtmek istemiyorum</option>
              </Select>
            </Field>
            <Field label="Telefon">
              <Input
                type="tel"
                placeholder="+90 5xx xxx xx xx"
                {...register("phone")}
              />
            </Field>
            <Field
              label="Kişisel E-posta"
              error={errors.personal_email?.message}
            >
              <Input
                type="email"
                placeholder="kisisel@mail.com"
                invalid={!!errors.personal_email}
                {...register("personal_email")}
              />
            </Field>
            <Field
              label="Profil Fotoğrafı (URL)"
              error={errors.photo_url?.message}
              span={2}
              hint="Faz 2: Doğrudan dosya yükleme"
            >
              <Input
                type="url"
                placeholder="https://…"
                invalid={!!errors.photo_url}
                {...register("photo_url")}
              />
            </Field>
          </FieldGrid>
        </TabsContent>

        <TabsContent value="employment">
          <FieldGrid>
            <Field label="Sicil No">
              <Input placeholder="örn. EMP-0023" {...register("employee_no")} />
            </Field>
            <Field label="Durum" required>
              <Select {...register("status")}>
                <option value="active">Aktif</option>
                <option value="passive">Pasif</option>
                <option value="candidate">Aday</option>
                <option value="resigned">Ayrıldı</option>
              </Select>
            </Field>
            <Field label="İşe Giriş">
              <Input type="date" {...register("hire_date")} />
            </Field>
            <Field label="Ayrılış">
              <Input type="date" {...register("resign_date")} />
            </Field>
            <Field
              label="Departman"
              hint={
                departments.length === 0
                  ? "Henüz departman tanımlı değil"
                  : undefined
              }
            >
              <Select disabled={departments.length === 0} {...register("department_id")}>
                <option value="">— Seçiniz —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Pozisyon"
              hint={
                jobTitles.length === 0
                  ? "Henüz pozisyon tanımlı değil"
                  : undefined
              }
            >
              <Select disabled={jobTitles.length === 0} {...register("job_title_id")}>
                <option value="">— Seçiniz —</option>
                {jobTitles.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Yönetici">
              <Select
                disabled={linkedManagers.length === 0}
                {...register("manager_id")}
              >
                <option value="">— Seçiniz —</option>
                {linkedManagers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Şube"
              hint={
                branches.length === 0 ? "Henüz şube tanımlı değil" : undefined
              }
            >
              <Select disabled={branches.length === 0} {...register("branch_id")}>
                <option value="">— Seçiniz —</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Sözleşme Tipi" span={2}>
              <Select {...register("contract_type")}>
                <option value="">— Seçiniz —</option>
                <option value="full_time">Tam Zamanlı</option>
                <option value="part_time">Yarı Zamanlı</option>
                <option value="contractor">Sözleşmeli</option>
                <option value="intern">Stajyer</option>
              </Select>
            </Field>
          </FieldGrid>
        </TabsContent>

        <TabsContent value="financial">
          <FieldGrid>
            <Field
              label="Maaş (Brüt)"
              error={errors.salary?.message}
              hint="₺ cinsinden"
            >
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                invalid={!!errors.salary}
                {...register("salary")}
              />
            </Field>
            <Field label="SGK Tipi">
              <Select {...register("sgk_type")}>
                <option value="">— Seçiniz —</option>
                <option value="standard">Standart</option>
                <option value="retiree">Emekli</option>
                <option value="disabled">Engelli</option>
              </Select>
            </Field>
            <Field label="IBAN" error={errors.iban?.message} span={2}>
              <Input
                placeholder="TR00 0000 0000 0000 0000 0000 00"
                invalid={!!errors.iban}
                {...register("iban")}
              />
            </Field>
            <Field label="Banka">
              <Input placeholder="örn. Garanti BBVA" {...register("bank_name")} />
            </Field>
            <Field label="Vergi Dairesi">
              <Input placeholder="örn. Beşiktaş VD" {...register("tax_office")} />
            </Field>
          </FieldGrid>
        </TabsContent>

        <TabsContent value="pdks">
          <FieldGrid>
            <Field label="RFID Kart ID" hint="QR / NFC etiketi">
              <Input
                placeholder="örn. A1B2C3D4"
                {...register("rfid_card_id")}
              />
            </Field>
            <Field
              label="Vardiya"
              hint={
                shifts.length === 0 ? "Henüz vardiya tanımlı değil" : undefined
              }
            >
              <Select disabled={shifts.length === 0} {...register("shift_id")}>
                <option value="">— Seçiniz —</option>
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.start_time && s.end_time
                      ? ` (${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)})`
                      : ""}
                  </option>
                ))}
              </Select>
            </Field>
            {isEdit && employee ? (
              <EmployeeAccountSection employee={employee} />
            ) : (
              <div className="col-span-full rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3 text-xs text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                <strong className="text-slate-700 dark:text-slate-200">
                  Sistem Girişi:
                </strong>{" "}
                Önce çalışanı kaydedin, ardından bu sekmeden hesap
                oluşturabilirsiniz.
              </div>
            )}
            <Field label="Notlar" span={2}>
              <Textarea
                rows={3}
                placeholder="İç notlar, etiketler…"
                {...register("notes")}
              />
            </Field>
          </FieldGrid>
        </TabsContent>

        <TabsContent value="documents">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { label: "Kimlik Fotokopisi", desc: "TC kimlik / pasaport" },
              { label: "Sağlık Raporu", desc: "İşe giriş muayenesi" },
              { label: "İş Sözleşmesi", desc: "İmzalı kopya" },
              { label: "Adli Sicil Kaydı", desc: "Son 6 ay" },
            ].map((doc) => (
              <div
                key={doc.label}
                className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5"
              >
                <FileText className="h-8 w-8 flex-none text-slate-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {doc.label}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {doc.desc}
                  </p>
                </div>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-white/10 dark:text-slate-400">
                  Faz 2
                </span>
              </div>
            ))}
            <p className="col-span-full text-xs text-slate-500 dark:text-slate-400">
              Belge yükleme Faz 2'de Supabase Storage entegrasyonu ile gelecek.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {apiError && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
          <span>{apiError}</span>
        </div>
      )}

      {savedFlash && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" />
          <span>Kaydedildi.</span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/70 pt-4 dark:border-white/10">
        {isEdit ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={deleting || isSubmitting}
            className="gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Sil
          </Button>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {isDirty ? "Vazgeç" : "Kapat"}
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-1.5">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Kaydediliyor…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {isEdit ? "Güncelle" : "Oluştur"}
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

function FieldGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
  );
}

function Field({
  label,
  hint,
  error,
  required,
  span,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  span?: 1 | 2;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", span === 2 && "sm:col-span-2")}>
      <Label>
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-rose-500">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

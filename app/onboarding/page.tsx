"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  PiggyBank,
  ArrowDownToLine,
  UtensilsCrossed,
  Layers,
  PartyPopper,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { IconChip } from "@/components/icon-chip";
import { CurrencyInput } from "@/components/currency-input";
import { GradientBlobs } from "@/components/gradient-blobs";
import { PushNotificationToggle } from "@/components/push-notification-toggle";
import { formatRupiah } from "@/lib/format";

type IncomeCategory = { _id: string; name: string };
type AllocationCategory = {
  _id: string;
  name: string;
  type: "fixed" | "food" | "invest" | "other";
};

const ALLOCATION_TYPE_LABEL: Record<string, string> = {
  fixed: "Fixed Cost",
  food: "Makan",
  invest: "Investasi",
  other: "Lain-lain",
};

const STEPS = ["welcome", "income", "daily-budget", "allocation", "done"] as const;
type StepId = (typeof STEPS)[number];

const STEP_LABEL: Record<StepId, string> = {
  welcome: "Mulai",
  income: "Pemasukan",
  "daily-budget": "Jatah Makan",
  allocation: "Alokasi",
  done: "Selesai",
};

export default function OnboardingPage() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const step: StepId = STEPS[stepIndex];

  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([]);
  const [incomeName, setIncomeName] = useState("");

  const [dailyAmount, setDailyAmount] = useState(0);
  const [dailyBudgetSaved, setDailyBudgetSaved] = useState(false);

  const [allocationCategories, setAllocationCategories] = useState<
    AllocationCategory[]
  >([]);
  const [allocationName, setAllocationName] = useState("");
  const [allocationType, setAllocationType] =
    useState<AllocationCategory["type"]>("fixed");

  // Mengunci tombol Tambah/Lanjut/Lewati/Kembali selama ada request yang
  // masih jalan — supaya klik "Tambah" lalu langsung klik "Lanjut" (sebelum
  // request pertama selesai) tidak memicu addIncomeCategory dua kali untuk
  // nama yang sama (flushPendingInput bakal ikut coba nambahin lagi).
  const submittingCount = useRef(0);
  const [submitting, setSubmitting] = useState(false);

  function beginSubmit() {
    submittingCount.current += 1;
    setSubmitting(true);
  }

  function endSubmit() {
    submittingCount.current -= 1;
    if (submittingCount.current <= 0) {
      submittingCount.current = 0;
      setSubmitting(false);
    }
  }

  useEffect(() => {
    (async () => {
      const [incomeRes, allocationRes] = await Promise.all([
        fetch("/api/income-categories"),
        fetch("/api/allocation-categories"),
      ]);
      setIncomeCategories(await incomeRes.json());
      setAllocationCategories(await allocationRes.json());
    })();
  }, []);

  function goToDashboard() {
    router.push("/dashboard");
  }

  // Ngecek SEMUA input yang mungkin sudah diketik tapi belum di-"Tambah"/
  // "Simpan" — bukan cuma di step yang lagi aktif. Ini sengaja tidak
  // bergantung ke `step` karena "Kembali" tidak me-reset teks yang sudah
  // diketik di step lain: kalau user ngetik di step Income, klik Kembali,
  // lalu klik Lewati dari step Welcome, teks itu tetap harus ke-flush
  // walau dia lagi tidak "di" step Income tersebut.
  async function flushPendingInput() {
    await Promise.all([
      incomeName.trim()
        ? addIncomeCategory(incomeName.trim()).then(
            (ok) => ok && setIncomeName("")
          )
        : Promise.resolve(),
      !dailyBudgetSaved && Number.isFinite(dailyAmount) && dailyAmount > 0
        ? saveDailyBudget(dailyAmount)
        : Promise.resolve(),
      allocationName.trim()
        ? addAllocationCategory(allocationName.trim(), allocationType).then(
            (ok) => ok && setAllocationName("")
          )
        : Promise.resolve(),
    ]);
  }

  async function skipOnboarding() {
    await flushPendingInput();
    goToDashboard();
  }

  function next() {
    setStepIndex((i) => Math.min(STEPS.length - 1, i + 1));
  }

  function back() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  async function addIncomeCategory(name: string) {
    beginSubmit();
    try {
      const res = await fetch("/api/income-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        toast.error("Gagal menambah sumber pemasukan");
        return false;
      }
      const created = await res.json();
      setIncomeCategories((prev) => [...prev, created]);
      return true;
    } finally {
      endSubmit();
    }
  }

  async function handleAddIncome(e: React.FormEvent) {
    e.preventDefault();
    if (!incomeName.trim()) return;
    if (await addIncomeCategory(incomeName.trim())) setIncomeName("");
  }

  async function handleDeleteIncome(id: string) {
    await fetch(`/api/income-categories/${id}`, { method: "DELETE" });
    setIncomeCategories((prev) => prev.filter((c) => c._id !== id));
  }

  // Kalau user ngetik nama tapi klik "Lanjut" tanpa klik "Tambah" dulu,
  // simpan dulu apa yang sudah diketik sebelum pindah step — supaya tidak
  // ada input yang diam-diam hilang.
  async function nextFromIncome() {
    await flushPendingInput();
    setStepIndex((i) => Math.min(STEPS.length - 1, i + 1));
  }

  async function saveDailyBudget(amount: number) {
    beginSubmit();
    try {
      const res = await fetch("/api/daily-budget-setting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountPerDay: amount }),
      });
      if (!res.ok) {
        toast.error("Gagal menyimpan jatah makan harian");
        return false;
      }
      setDailyBudgetSaved(true);
      // Server otomatis membuat kategori alokasi "Makan" kalau belum ada —
      // refresh daftar kategori supaya langsung kelihatan di step berikutnya.
      const allocationRes = await fetch("/api/allocation-categories");
      if (allocationRes.ok)
        setAllocationCategories(await allocationRes.json());
      return true;
    } finally {
      endSubmit();
    }
  }

  async function handleSaveDailyBudget(e: React.FormEvent) {
    e.preventDefault();
    if (!Number.isFinite(dailyAmount) || dailyAmount <= 0) return;
    if (await saveDailyBudget(dailyAmount)) {
      toast.success("Jatah makan harian tersimpan");
    }
  }

  async function nextFromDailyBudget() {
    await flushPendingInput();
    setStepIndex((i) => Math.min(STEPS.length - 1, i + 1));
  }

  async function addAllocationCategory(
    name: string,
    type: AllocationCategory["type"]
  ) {
    beginSubmit();
    try {
      const res = await fetch("/api/allocation-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type }),
      });
      if (!res.ok) {
        toast.error("Gagal menambah pos alokasi");
        return false;
      }
      const created = await res.json();
      setAllocationCategories((prev) => [...prev, created]);
      return true;
    } finally {
      endSubmit();
    }
  }

  async function handleAddAllocation(e: React.FormEvent) {
    e.preventDefault();
    if (!allocationName.trim()) return;
    if (await addAllocationCategory(allocationName.trim(), allocationType)) {
      setAllocationName("");
    }
  }

  async function handleDeleteAllocation(id: string) {
    await fetch(`/api/allocation-categories/${id}`, { method: "DELETE" });
    setAllocationCategories((prev) => prev.filter((c) => c._id !== id));
  }

  async function nextFromAllocation() {
    await flushPendingInput();
    setStepIndex((i) => Math.min(STEPS.length - 1, i + 1));
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-linear-to-b from-emerald-50 via-background to-background px-4 py-10 overflow-hidden">
      <GradientBlobs />
      <div className="relative w-full max-w-lg space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 shadow-sm shadow-emerald-500/30">
              <PiggyBank className="size-4 text-white" />
            </div>
            <span className="font-semibold text-lg">Pundi</span>
          </div>
          {step !== "done" && (
            <button
              onClick={skipOnboarding}
              disabled={submitting}
              className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-50"
            >
              Lewati onboarding
            </button>
          )}
        </div>

        {step !== "done" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>
                Langkah {stepIndex + 1} dari {STEPS.length - 1}
              </span>
              <span>{STEP_LABEL[step]}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {STEPS.slice(0, -1).map((s, i) => (
                <div
                  key={s}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i <= stepIndex ? "bg-emerald-500" : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        <Card className="border-0 shadow-xl shadow-emerald-950/5">
          <CardContent className="py-2">
            {step === "welcome" && (
              <div className="space-y-6">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="flex size-16 items-center justify-center rounded-3xl bg-linear-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30">
                    <Sparkles className="size-8 text-white" />
                  </div>
                  <div className="space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight">
                      Yuk siapkan akunmu
                    </h1>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Beberapa langkah singkat supaya Dashboard, Budget, dan
                      Reports langsung kepakai begitu kamu selesai. Semua bisa
                      diubah lagi nanti di halaman Settings, dan langkah ini
                      bisa dilewati kapan saja kalau kamu mau lihat-lihat
                      dulu.
                    </p>
                  </div>
                </div>
                <Button size="lg" className="w-full" onClick={next}>
                  Mulai
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            )}

            {step === "income" && (
              <div className="space-y-6">
                <div className="flex items-start gap-3">
                  <IconChip icon={ArrowDownToLine} color="blue" />
                  <div>
                    <h2 className="text-lg font-bold tracking-tight">
                      Sumber Pemasukan
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Tambahkan dari mana saja penghasilanmu datang (mis. gaji
                      kantor, freelance). Pundi akan menjumlahkan semuanya
                      jadi Total Income tiap bulan di halaman Budget.
                    </p>
                  </div>
                </div>

                {incomeCategories.length > 0 && (
                  <ul className="space-y-2">
                    {incomeCategories.map((c) => (
                      <li
                        key={c._id}
                        className="px-4 py-2.5 flex items-center justify-between text-sm rounded-xl border bg-muted/30"
                      >
                        <span className="font-medium">{c.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteIncome(c._id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}

                <form onSubmit={handleAddIncome} className="flex items-center gap-2">
                  <Input
                    placeholder="mis. Gaji Kantor"
                    value={incomeName}
                    onChange={(e) => setIncomeName(e.target.value)}
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    className="shrink-0"
                    disabled={submitting}
                  >
                    Tambah
                  </Button>
                </form>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={back} disabled={submitting}>
                    <ArrowLeft className="size-4" />
                    Kembali
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={nextFromIncome}
                    disabled={submitting}
                  >
                    Lanjut
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === "daily-budget" && (
              <div className="space-y-6">
                <div className="flex items-start gap-3">
                  <IconChip icon={UtensilsCrossed} color="amber" />
                  <div>
                    <h2 className="text-lg font-bold tracking-tight">
                      Jatah Makan per Hari
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Nominal ini dipakai untuk otomatis menghitung pos
                      alokasi &quot;Makan&quot; tiap bulan (jatah harian ×
                      jumlah hari di bulan itu), dan jadi patokan target
                      harian di Dashboard.
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={handleSaveDailyBudget}
                  className="flex items-center gap-2"
                >
                  <CurrencyInput
                    placeholder="mis. Rp 70.000"
                    value={dailyAmount}
                    onValueChange={setDailyAmount}
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    className="shrink-0"
                    disabled={submitting}
                  >
                    Simpan
                  </Button>
                </form>
                {dailyBudgetSaved && (
                  <p className="text-sm text-emerald-600 -mt-3">
                    Tersimpan: {formatRupiah(dailyAmount)}/hari
                  </p>
                )}

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={back} disabled={submitting}>
                    <ArrowLeft className="size-4" />
                    Kembali
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={nextFromDailyBudget}
                    disabled={submitting}
                  >
                    Lanjut
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === "allocation" && (
              <div className="space-y-6">
                <div className="flex items-start gap-3">
                  <IconChip icon={Layers} color="violet" />
                  <div>
                    <h2 className="text-lg font-bold tracking-tight">
                      Pos Alokasi
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Pos pengeluaran tetap tiap bulan (mis. transfer ke
                      orang tua, sewa kos, investasi). Sisa dari Income
                      dikurangi semua pos ini jadi Total Bersih — budget
                      harianmu di luar Makan.
                    </p>
                  </div>
                </div>

                {allocationCategories.length > 0 && (
                  <ul className="space-y-2">
                    {allocationCategories.map((c) => (
                      <li
                        key={c._id}
                        className="px-4 py-2.5 flex items-center justify-between text-sm rounded-xl border bg-muted/30"
                      >
                        <span className="font-medium">
                          {c.name}{" "}
                          <span className="text-muted-foreground font-normal">
                            ({ALLOCATION_TYPE_LABEL[c.type]})
                          </span>
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteAllocation(c._id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}

                <form
                  onSubmit={handleAddAllocation}
                  className="flex flex-col sm:flex-row sm:items-center gap-2"
                >
                  <Input
                    placeholder="mis. TF Ibu"
                    value={allocationName}
                    onChange={(e) => setAllocationName(e.target.value)}
                  />
                  <Select
                    value={allocationType}
                    onValueChange={(v) =>
                      setAllocationType(v as AllocationCategory["type"])
                    }
                  >
                    <SelectTrigger className="sm:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed Cost</SelectItem>
                      <SelectItem value="food">Makan</SelectItem>
                      <SelectItem value="invest">Investasi</SelectItem>
                      <SelectItem value="other">Lain-lain</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="submit"
                    variant="secondary"
                    className="shrink-0"
                    disabled={submitting}
                  >
                    Tambah
                  </Button>
                </form>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={back} disabled={submitting}>
                    <ArrowLeft className="size-4" />
                    Kembali
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={nextFromAllocation}
                    disabled={submitting}
                  >
                    Lanjut
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === "done" && (
              <div className="space-y-6 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex size-16 items-center justify-center rounded-3xl bg-linear-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30">
                    <PartyPopper className="size-8 text-white" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    Setup selesai!
                  </h1>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Sekarang isi Budget bulan ini supaya Dashboard bisa mulai
                    menghitung Total Bersih dan target harianmu.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button size="lg" onClick={() => router.push("/budget")}>
                    Isi Budget Sekarang
                  </Button>
                  <Button size="lg" variant="ghost" onClick={goToDashboard}>
                    Nanti Saja, ke Dashboard
                  </Button>
                </div>

                <div className="pt-2 border-t space-y-3 text-left">
                  <p className="text-xs font-medium text-muted-foreground">
                    Biar makin gampang dipakai
                  </p>
                  <PushNotificationToggle />
                  <p className="text-xs text-muted-foreground">
                    Nanti kamu juga bisa coba{" "}
                    <span className="font-medium text-foreground">
                      Target Tabungan
                    </span>{" "}
                    (nabung buat tujuan tertentu) dan{" "}
                    <span className="font-medium text-foreground">
                      Pengeluaran Berulang
                    </span>{" "}
                    (pengingat subscription/tagihan bulanan) lewat menu di
                    sidebar.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

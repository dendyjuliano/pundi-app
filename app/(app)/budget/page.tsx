"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IconChip } from "@/components/icon-chip";
import { CurrencyInput } from "@/components/currency-input";
import {
  ArrowDownToLine,
  Layers,
  CalendarClock,
  TrendingUp,
  AlertTriangle,
  Trash2,
} from "lucide-react";

type IncomeCategory = { _id: string; name: string };
type AllocationCategory = {
  _id: string;
  name: string;
  type: "fixed" | "food" | "invest" | "other";
};
type BudgetLine = { categoryId: string; amount: number; realized?: number };
type MonthlyBudget = {
  month: string;
  incomes: BudgetLine[];
  allocations: BudgetLine[];
  totalIncome: number;
  totalAllocation: number;
  totalBersih: number;
  isNew: boolean;
  propagatedMonths?: string[];
};

const ALLOCATION_TYPE_LABEL: Record<string, string> = {
  fixed: "Fixed Cost",
  food: "Makan",
  invest: "Investasi",
  other: "Lain-lain",
};

const ALLOCATION_TYPE_DOT: Record<string, string> = {
  fixed: "bg-blue-500",
  food: "bg-amber-500",
  invest: "bg-violet-500",
  other: "bg-rose-500",
};

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

export default function BudgetPage() {
  const [month, setMonth] = useState(currentMonth());
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>(
    []
  );
  const [allocationCategories, setAllocationCategories] = useState<
    AllocationCategory[]
  >([]);
  const [incomes, setIncomes] = useState<BudgetLine[]>([]);
  const [allocations, setAllocations] = useState<BudgetLine[]>([]);
  const [isNew, setIsNew] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadBudget = useCallback(async (m: string) => {
    const [incomeCatRes, allocationCatRes, budgetRes] = await Promise.all([
      fetch("/api/income-categories"),
      fetch("/api/allocation-categories"),
      fetch(`/api/monthly-budget?month=${m}`),
    ]);
    const incomeCats: IncomeCategory[] = await incomeCatRes.json();
    const allocationCats: AllocationCategory[] = await allocationCatRes.json();
    const budget: MonthlyBudget = await budgetRes.json();

    setIncomeCategories(incomeCats);
    setAllocationCategories(allocationCats);
    setIncomes(budget.incomes);
    setAllocations(budget.allocations);
    setIsNew(budget.isNew);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadBudget(month);
      setLoading(false);
    })();
  }, [month, loadBudget]);

  // Kategori yang dibuat SETELAH budget bulan ini disimpan tidak akan ada
  // di `incomes`/`allocations` yang tersimpan — kalau cuma `.map()` baris
  // barunya tidak pernah ke-update sama sekali (tidak ada entry yang
  // cocok). Makanya di sini selalu upsert: update kalau sudah ada,
  // tambahkan baris baru kalau belum.
  function updateIncome(categoryId: string, amount: number) {
    setIncomes((prev) =>
      prev.some((i) => i.categoryId === categoryId)
        ? prev.map((i) => (i.categoryId === categoryId ? { ...i, amount } : i))
        : [...prev, { categoryId, amount }]
    );
  }

  function updateAllocation(categoryId: string, amount: number) {
    setAllocations((prev) =>
      prev.some((a) => a.categoryId === categoryId)
        ? prev.map((a) => (a.categoryId === categoryId ? { ...a, amount } : a))
        : [...prev, { categoryId, amount, realized: 0 }]
    );
  }

  function updateAllocationRealized(categoryId: string, realized: number) {
    setAllocations((prev) =>
      prev.some((a) => a.categoryId === categoryId)
        ? prev.map((a) =>
            a.categoryId === categoryId ? { ...a, realized } : a
          )
        : [...prev, { categoryId, amount: 0, realized }]
    );
  }

  function removeOrphanedIncome(categoryId: string) {
    setIncomes((prev) => prev.filter((i) => i.categoryId !== categoryId));
  }

  function removeOrphanedAllocation(categoryId: string) {
    setAllocations((prev) => prev.filter((a) => a.categoryId !== categoryId));
  }

  // Baris yang categoryId-nya tidak ada lagi di daftar kategori yang masih
  // hidup — biasanya kategori sudah dihapus di Settings. Sengaja tidak
  // otomatis dibuang (lihat catatan di lain-lain: menghapus kategori tidak
  // boleh mengubah data bulan yang sudah tersimpan), tapi harus tetap
  // terlihat di sini supaya user sadar nilainya masih ikut kehitung di
  // Total, bukan diam-diam nyangkut tanpa bisa dilihat/dihapus.
  const liveIncomeIds = new Set(incomeCategories.map((c) => c._id));
  const liveAllocationIds = new Set(allocationCategories.map((c) => c._id));
  const orphanedIncomes = incomes.filter(
    (i) => !liveIncomeIds.has(i.categoryId)
  );
  const orphanedAllocations = allocations.filter(
    (a) => !liveAllocationIds.has(a.categoryId)
  );

  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
  const totalAllocation = allocations.reduce((sum, a) => sum + a.amount, 0);
  const totals = {
    totalIncome,
    totalAllocation,
    totalBersih: totalIncome - totalAllocation,
  };

  const investCategoryIds = new Set(
    allocationCategories.filter((c) => c.type === "invest").map((c) => c._id)
  );
  const totalInvestPlanned = allocations
    .filter((a) => investCategoryIds.has(a.categoryId))
    .reduce((sum, a) => sum + a.amount, 0);
  const totalInvestRealized = allocations
    .filter((a) => investCategoryIds.has(a.categoryId))
    .reduce((sum, a) => sum + (a.realized ?? 0), 0);

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/monthly-budget", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, incomes, allocations }),
    });
    setSaving(false);

    if (!res.ok) {
      toast.error("Gagal menyimpan budget");
      return;
    }

    const budget: MonthlyBudget = await res.json();
    setIsNew(budget.isNew);

    const propagatedCount = budget.propagatedMonths?.length ?? 0;
    toast.success(
      propagatedCount > 0
        ? `Budget ${formatMonthLabel(month)} tersimpan, ${propagatedCount} bulan setelahnya ikut terisi otomatis`
        : `Budget ${formatMonthLabel(month)} tersimpan`
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Budget Bulanan
            </h1>
            <Badge
              variant="secondary"
              className={
                isNew
                  ? "bg-amber-100 text-amber-700"
                  : "bg-emerald-100 text-emerald-700"
              }
            >
              {isNew ? "Draft" : "Tersimpan"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {isNew
              ? "Nilai di-prefill dari bulan sebelumnya — simpan untuk konfirmasi"
              : "Budget bulan ini sudah tersimpan"}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-1.5">
          <CalendarClock className="size-4 text-muted-foreground" />
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-auto border-0 shadow-none px-0 h-auto focus-visible:ring-0"
          />
        </div>
      </div>

      {incomeCategories.length === 0 && allocationCategories.length === 0 && (
        <Card className="border-0 bg-amber-50 ring-1 ring-amber-200">
          <CardContent className="text-sm text-amber-800">
            Belum ada kategori income/alokasi. Buat dulu di halaman Settings.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <IconChip icon={ArrowDownToLine} color="blue" />
          <CardTitle>Income</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {incomeCategories.map((cat) => {
            const line = incomes.find((i) => i.categoryId === cat._id);
            return (
              <div
                key={cat._id}
                className="flex items-center gap-3 rounded-xl border bg-muted/30 px-4 py-2.5"
              >
                <Label className="flex-1 font-medium">{cat.name}</Label>
                <CurrencyInput
                  value={line?.amount ?? 0}
                  onValueChange={(v) => updateIncome(cat._id, v)}
                  className="w-44 bg-background"
                />
              </div>
            );
          })}
          {orphanedIncomes.map((line) => (
            <div
              key={line.categoryId}
              className="flex items-center gap-3 rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-2.5"
            >
              <AlertTriangle className="size-4 text-amber-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800">
                  Kategori terhapus
                </p>
                <p className="text-xs text-amber-700">
                  Masih ikut kehitung di Total Gross — hapus di sini kalau
                  memang tidak relevan lagi
                </p>
              </div>
              <span className="text-sm font-medium text-amber-800 shrink-0">
                {formatRupiah(line.amount)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-amber-700 hover:text-destructive shrink-0"
                onClick={() => removeOrphanedIncome(line.categoryId)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <IconChip icon={Layers} color="violet" />
          <div>
            <CardTitle>Alokasi</CardTitle>
            <CardDescription>
              Pos bertipe &quot;Makan&quot; otomatis dihitung dari jatah harian
              × jumlah hari di bulan ini (atur di Settings).
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {allocationCategories.map((cat) => {
            const line = allocations.find((a) => a.categoryId === cat._id);
            const amount = line?.amount ?? 0;
            const realized = line?.realized ?? 0;
            const pct = totalIncome > 0 ? (amount / totalIncome) * 100 : 0;
            const isInvest = cat.type === "invest";
            const realizedDiff = realized - amount;
            return (
              <div
                key={cat._id}
                className="rounded-xl border bg-muted/30 px-4 py-2.5 space-y-2"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`size-2 rounded-full shrink-0 ${ALLOCATION_TYPE_DOT[cat.type]}`}
                  />
                  <Label className="flex-1 font-medium">
                    <span className="flex items-center gap-2">
                      {cat.name}
                      <Badge variant="secondary" className="text-[10px]">
                        {ALLOCATION_TYPE_LABEL[cat.type]}
                      </Badge>
                    </span>
                  </Label>
                  <CurrencyInput
                    value={amount}
                    onValueChange={(v) => updateAllocation(cat._id, v)}
                    disabled={cat.type === "food"}
                    className="w-44 bg-background disabled:bg-muted"
                  />
                </div>
                <div className="h-1.5 w-full rounded-full bg-background overflow-hidden ml-5">
                  <div
                    className={`h-full rounded-full ${ALLOCATION_TYPE_DOT[cat.type]}`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>

                {isInvest && (
                  <div className="flex items-center gap-3 ml-5 pt-1">
                    <Label className="flex-1 text-xs text-muted-foreground flex items-center gap-1.5">
                      <TrendingUp className="size-3.5" />
                      Realisasi
                    </Label>
                    <Badge
                      variant="secondary"
                      className={
                        realizedDiff >= 0
                          ? "bg-emerald-100 text-emerald-700 text-[10px]"
                          : "bg-amber-100 text-amber-700 text-[10px]"
                      }
                    >
                      {realizedDiff >= 0
                        ? "Sesuai rencana"
                        : `Kurang ${formatRupiah(-realizedDiff)}`}
                    </Badge>
                    <CurrencyInput
                      value={realized}
                      onValueChange={(v) => updateAllocationRealized(cat._id, v)}
                      className="w-44 bg-background"
                    />
                  </div>
                )}
              </div>
            );
          })}
          {orphanedAllocations.map((line) => (
            <div
              key={line.categoryId}
              className="flex items-center gap-3 rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-2.5"
            >
              <AlertTriangle className="size-4 text-amber-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800">
                  Kategori terhapus
                </p>
                <p className="text-xs text-amber-700">
                  Masih ikut kehitung di Total Alokasi — hapus di sini kalau
                  memang tidak relevan lagi
                </p>
              </div>
              <span className="text-sm font-medium text-amber-800 shrink-0">
                {formatRupiah(line.amount)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-amber-700 hover:text-destructive shrink-0"
                onClick={() => removeOrphanedAllocation(line.categoryId)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {investCategoryIds.size > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 space-y-0">
            <IconChip icon={TrendingUp} color="violet" />
            <div>
              <CardTitle>Realisasi Investasi</CardTitle>
              <CardDescription>
                Total investasi yang benar-benar sudah dijalankan bulan ini,
                dibanding rencana di atas
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Realisasi / Rencana</span>
              <span className="font-medium">
                {formatRupiah(totalInvestRealized)}{" "}
                <span className="text-muted-foreground font-normal">
                  / {formatRupiah(totalInvestPlanned)}
                </span>
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  totalInvestRealized >= totalInvestPlanned
                    ? "bg-emerald-500"
                    : "bg-amber-500"
                }`}
                style={{
                  width: `${
                    totalInvestPlanned > 0
                      ? Math.min(
                          100,
                          (totalInvestRealized / totalInvestPlanned) * 100
                        )
                      : totalInvestRealized > 0
                        ? 100
                        : 0
                  }%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 bg-linear-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white">
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-emerald-50/80">Total Gross</span>
            <span className="font-medium">
              {formatRupiah(totals.totalIncome)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-emerald-50/80">Total Alokasi</span>
            <span className="font-medium">
              {formatRupiah(totals.totalAllocation)}
            </span>
          </div>
          <div className="flex justify-between text-lg pt-2 border-t border-white/20">
            <span className="font-medium">Total Bersih</span>
            <span className="font-bold">
              {formatRupiah(totals.totalBersih)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        disabled={saving}
        size="lg"
        className="w-full bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-md shadow-emerald-500/25"
      >
        {saving ? "Menyimpan..." : "Simpan Budget"}
      </Button>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { IconChip } from "@/components/icon-chip";
import { CurrencyInput } from "@/components/currency-input";
import { PushNotificationToggle } from "@/components/push-notification-toggle";
import { AddExpenseDialog } from "@/components/add-expense-dialog";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  UtensilsCrossed,
  ArrowDownToLine,
  Layers,
  Pencil,
  Check,
  X,
  Bell,
  Repeat,
  Pause,
  Play,
  Palette,
} from "lucide-react";

type IncomeCategory = { _id: string; name: string };
type AllocationCategory = {
  _id: string;
  name: string;
  type: "fixed" | "food" | "invest" | "other";
};
type DailyBudgetSetting = {
  _id: string;
  amountPerDay: number;
  effectiveFrom: string;
} | null;
type RecurringExpense = {
  _id: string;
  name: string;
  amount: number;
  dayOfMonth: number;
  frequency: "monthly" | "yearly";
  month?: number;
  active: boolean;
};

const MONTH_LABEL = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

const ALLOCATION_TYPE_LABEL: Record<string, string> = {
  fixed: "Fixed Cost",
  food: "Makan",
  invest: "Investasi",
  other: "Lain-lain",
};

export default function SettingsPage() {
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>(
    []
  );
  const [allocationCategories, setAllocationCategories] = useState<
    AllocationCategory[]
  >([]);
  const [dailyBudget, setDailyBudget] = useState<DailyBudgetSetting>(null);
  const [recurringExpenses, setRecurringExpenses] = useState<
    RecurringExpense[]
  >([]);
  const [loading, setLoading] = useState(true);

  // Kalau tanggal jatuh tempo yang baru ditambahkan itu PAS hari ini,
  // reminder push baru bakal kekirim di siklus cron berikutnya (bisa
  // besok, atau malah bulan depan kalau jam 12 siang sudah lewat) —
  // jadi kejadian bulan ini bisa kelewat. Tawarin konfirmasi langsung
  // saat itu juga, pakai dialog yang sama (tetap semi-otomatis, bukan
  // auto-catat) biar tidak nunggu notifikasi buat transaksi bulan ini.
  const [recurringConfirmPrefill, setRecurringConfirmPrefill] = useState<{
    id: string;
    amount: number;
    note: string;
  } | null>(null);

  const [incomeName, setIncomeName] = useState("");
  const [allocationName, setAllocationName] = useState("");
  const [allocationType, setAllocationType] =
    useState<AllocationCategory["type"]>("fixed");
  const [newAmountPerDay, setNewAmountPerDay] = useState(0);
  const [recurringName, setRecurringName] = useState("");
  const [recurringAmount, setRecurringAmount] = useState(0);
  const [recurringDay, setRecurringDay] = useState("1");
  const [recurringFrequency, setRecurringFrequency] = useState<
    "monthly" | "yearly"
  >("monthly");
  const [recurringMonth, setRecurringMonth] = useState("1");

  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [editingIncomeName, setEditingIncomeName] = useState("");

  const [editingAllocationId, setEditingAllocationId] = useState<
    string | null
  >(null);
  const [editingAllocationName, setEditingAllocationName] = useState("");
  const [editingAllocationType, setEditingAllocationType] =
    useState<AllocationCategory["type"]>("fixed");

  const [editingRecurringId, setEditingRecurringId] = useState<string | null>(
    null
  );
  const [editingRecurringName, setEditingRecurringName] = useState("");
  const [editingRecurringAmount, setEditingRecurringAmount] = useState(0);
  const [editingRecurringDay, setEditingRecurringDay] = useState("1");
  const [editingRecurringFrequency, setEditingRecurringFrequency] = useState<
    "monthly" | "yearly"
  >("monthly");
  const [editingRecurringMonth, setEditingRecurringMonth] = useState("1");

  async function loadAll() {
    const [incomeRes, allocationRes, budgetRes, recurringRes] =
      await Promise.all([
        fetch("/api/income-categories"),
        fetch("/api/allocation-categories"),
        fetch("/api/daily-budget-setting"),
        fetch("/api/recurring-expenses"),
      ]);
    setIncomeCategories(await incomeRes.json());
    setAllocationCategories(await allocationRes.json());
    setDailyBudget(await budgetRes.json());
    setRecurringExpenses(await recurringRes.json());
  }

  useEffect(() => {
    (async () => {
      await loadAll();
      setLoading(false);
    })();
  }, []);

  async function handleAddIncomeCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!incomeName.trim()) return;
    const res = await fetch("/api/income-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: incomeName.trim() }),
    });
    if (!res.ok) {
      toast.error("Gagal menambah kategori income");
      return;
    }
    toast.success(`Kategori income "${incomeName.trim()}" ditambahkan`);
    setIncomeName("");
    loadAll();
  }

  function startEditIncomeCategory(c: IncomeCategory) {
    setEditingIncomeId(c._id);
    setEditingIncomeName(c.name);
  }

  function cancelEditIncomeCategory() {
    setEditingIncomeId(null);
    setEditingIncomeName("");
  }

  async function handleSaveIncomeCategory(id: string) {
    if (!editingIncomeName.trim()) return;
    const res = await fetch(`/api/income-categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingIncomeName.trim() }),
    });
    if (!res.ok) {
      toast.error("Gagal mengubah kategori income");
      return;
    }
    toast.success("Kategori income diperbarui");
    cancelEditIncomeCategory();
    loadAll();
  }

  async function handleDeleteIncomeCategory(id: string) {
    const res = await fetch(`/api/income-categories/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("Gagal menghapus kategori income");
      return;
    }
    toast.success("Kategori income dihapus");
    loadAll();
  }

  async function handleAddAllocationCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!allocationName.trim()) return;
    const res = await fetch("/api/allocation-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: allocationName.trim(), type: allocationType }),
    });
    if (!res.ok) {
      toast.error("Gagal menambah kategori alokasi");
      return;
    }
    toast.success(`Kategori alokasi "${allocationName.trim()}" ditambahkan`);
    setAllocationName("");
    loadAll();
  }

  function startEditAllocationCategory(c: AllocationCategory) {
    setEditingAllocationId(c._id);
    setEditingAllocationName(c.name);
    setEditingAllocationType(c.type);
  }

  function cancelEditAllocationCategory() {
    setEditingAllocationId(null);
    setEditingAllocationName("");
  }

  async function handleSaveAllocationCategory(id: string) {
    if (!editingAllocationName.trim()) return;
    const res = await fetch(`/api/allocation-categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editingAllocationName.trim(),
        type: editingAllocationType,
      }),
    });
    if (!res.ok) {
      toast.error("Gagal mengubah kategori alokasi");
      return;
    }
    toast.success("Kategori alokasi diperbarui");
    cancelEditAllocationCategory();
    loadAll();
  }

  async function handleDeleteAllocationCategory(id: string) {
    const res = await fetch(`/api/allocation-categories/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("Gagal menghapus kategori alokasi");
      return;
    }
    toast.success("Kategori alokasi dihapus");
    loadAll();
  }

  async function handleUpdateDailyBudget(e: React.FormEvent) {
    e.preventDefault();
    if (!Number.isFinite(newAmountPerDay) || newAmountPerDay <= 0) return;
    const res = await fetch("/api/daily-budget-setting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountPerDay: newAmountPerDay }),
    });
    if (!res.ok) {
      toast.error("Gagal update jatah makan per hari");
      return;
    }
    toast.success("Jatah makan per hari diperbarui");
    setNewAmountPerDay(0);
    loadAll();
  }

  async function handleAddRecurringExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!recurringName.trim() || recurringAmount <= 0) return;
    const res = await fetch("/api/recurring-expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: recurringName.trim(),
        amount: recurringAmount,
        dayOfMonth: Number(recurringDay),
        frequency: recurringFrequency,
        month: recurringFrequency === "yearly" ? Number(recurringMonth) : undefined,
      }),
    });
    if (!res.ok) {
      toast.error("Gagal menambah pengeluaran berulang");
      return;
    }
    const created = await res.json();
    const now = new Date();
    const dueToday =
      created.dayOfMonth === now.getDate() &&
      (created.frequency !== "yearly" || created.month === now.getMonth() + 1);
    toast.success(
      dueToday
        ? `"${recurringName.trim()}" ditambahkan — tanggalnya hari ini, langsung konfirmasi di form yang muncul`
        : `"${recurringName.trim()}" ditambahkan`
    );

    if (dueToday) {
      setRecurringConfirmPrefill({
        id: created._id,
        amount: created.amount,
        note: created.name,
      });
    }

    setRecurringName("");
    setRecurringAmount(0);
    setRecurringDay("1");
    setRecurringFrequency("monthly");
    setRecurringMonth("1");
    loadAll();
  }

  function startEditRecurringExpense(item: RecurringExpense) {
    setEditingRecurringId(item._id);
    setEditingRecurringName(item.name);
    setEditingRecurringAmount(item.amount);
    setEditingRecurringDay(String(item.dayOfMonth));
    setEditingRecurringFrequency(item.frequency);
    setEditingRecurringMonth(String(item.month ?? 1));
  }

  function cancelEditRecurringExpense() {
    setEditingRecurringId(null);
    setEditingRecurringName("");
  }

  async function handleSaveRecurringExpense(id: string) {
    if (!editingRecurringName.trim() || editingRecurringAmount <= 0) return;
    const res = await fetch(`/api/recurring-expenses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editingRecurringName.trim(),
        amount: editingRecurringAmount,
        dayOfMonth: Number(editingRecurringDay),
        frequency: editingRecurringFrequency,
        month:
          editingRecurringFrequency === "yearly"
            ? Number(editingRecurringMonth)
            : undefined,
      }),
    });
    if (!res.ok) {
      toast.error("Gagal mengubah pengeluaran berulang");
      return;
    }
    toast.success("Pengeluaran berulang diperbarui");
    cancelEditRecurringExpense();
    loadAll();
  }

  async function handleToggleRecurringActive(item: RecurringExpense) {
    const res = await fetch(`/api/recurring-expenses/${item._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !item.active }),
    });
    if (!res.ok) {
      toast.error("Gagal mengubah status");
      return;
    }
    toast.success(item.active ? "Dinonaktifkan" : "Diaktifkan lagi");
    loadAll();
  }

  async function handleDeleteRecurringExpense(id: string) {
    const res = await fetch(`/api/recurring-expenses/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("Gagal menghapus pengeluaran berulang");
      return;
    }
    toast.success("Pengeluaran berulang dihapus");
    loadAll();
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {recurringConfirmPrefill && (
        <AddExpenseDialog
          key={recurringConfirmPrefill.id}
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setRecurringConfirmPrefill(null);
          }}
          initialAmount={recurringConfirmPrefill.amount}
          initialNote={recurringConfirmPrefill.note}
          title="Konfirmasi Pengeluaran Berulang"
          description={`Tanggal jatuh tempo "${recurringConfirmPrefill.note}" pas hari ini — cek dulu nominalnya (bisa diedit) sebelum disimpan`}
          confirmOnClose
          onSaved={() => {
            setRecurringConfirmPrefill(null);
            toast.success("Langsung tercatat untuk bulan ini");
          }}
        />
      )}

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Kelola kategori income, kategori alokasi, dan jatah makan harian
        </p>
      </div>

      {/* Daily Budget Setting */}
      <Card className="border-0 bg-linear-to-br from-amber-400 via-orange-500 to-orange-600 text-white">
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-white/85">Jatah Makan per Hari</p>
              <p className="mt-1 text-3xl font-bold tracking-tight">
                {dailyBudget
                  ? formatRupiah(dailyBudget.amountPerDay)
                  : "Belum diatur"}
              </p>
              {dailyBudget && (
                <p className="text-xs text-white/75 mt-1">
                  berlaku sejak{" "}
                  {new Date(dailyBudget.effectiveFrom).toLocaleDateString(
                    "id-ID"
                  )}
                </p>
              )}
            </div>
            <div className="flex size-11 items-center justify-center rounded-2xl bg-white/20">
              <UtensilsCrossed className="size-5" />
            </div>
          </div>
          <form
            onSubmit={handleUpdateDailyBudget}
            className="flex items-center gap-2 pt-2 border-t border-white/20"
          >
            <CurrencyInput
              placeholder="Jumlah baru per hari"
              value={newAmountPerDay}
              onValueChange={setNewAmountPerDay}
              className="bg-white/95 dark:bg-white/95 border-0 text-zinc-900 placeholder:text-zinc-400"
              prefixClassName="text-zinc-500"
            />
            <Button
              type="submit"
              className="bg-white text-orange-700 hover:bg-white/90 shrink-0"
            >
              Update
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Tampilan */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <IconChip icon={Palette} color="violet" />
          <div>
            <CardTitle>Tampilan</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Tema</p>
              <p className="text-xs text-muted-foreground">
                Pilih tampilan terang, gelap, atau ikuti pengaturan sistem
              </p>
            </div>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>

      {/* Notifikasi */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <IconChip icon={Bell} color="blue" />
          <div>
            <CardTitle>Notifikasi</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <PushNotificationToggle />
        </CardContent>
      </Card>

      {/* Income Categories */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <IconChip icon={ArrowDownToLine} color="blue" />
          <CardTitle>Kategori Income</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {incomeCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada kategori
            </p>
          ) : (
            <ul className="space-y-2">
              {incomeCategories.map((c) =>
                editingIncomeId === c._id ? (
                  <li
                    key={c._id}
                    className="px-4 py-2.5 flex items-center gap-2 rounded-xl border bg-muted/30"
                  >
                    <Input
                      autoFocus
                      value={editingIncomeName}
                      onChange={(e) => setEditingIncomeName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveIncomeCategory(c._id);
                        if (e.key === "Escape") cancelEditIncomeCategory();
                      }}
                      className="h-9 bg-background"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-emerald-600 hover:text-emerald-700 shrink-0"
                      onClick={() => handleSaveIncomeCategory(c._id)}
                    >
                      <Check className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground shrink-0"
                      onClick={cancelEditIncomeCategory}
                    >
                      <X className="size-4" />
                    </Button>
                  </li>
                ) : (
                  <li
                    key={c._id}
                    className="px-4 py-2.5 flex items-center justify-between text-sm rounded-xl border bg-muted/30 hover:bg-muted/60 transition-colors"
                  >
                    <span className="font-medium">{c.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-foreground"
                        onClick={() => startEditIncomeCategory(c)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <ConfirmDeleteButton
                        title={`Hapus kategori "${c.name}"?`}
                        description="Kategori ini akan dihapus dari daftar, tapi jumlah yang sudah pernah tersimpan di bulan-bulan sebelumnya tetap ada (ditandai sebagai kategori terhapus, tidak ikut hilang)."
                        onConfirm={() => handleDeleteIncomeCategory(c._id)}
                      />
                    </div>
                  </li>
                )
              )}
            </ul>
          )}
          <form onSubmit={handleAddIncomeCategory} className="flex items-center gap-2">
            <Input
              placeholder="Nama sumber income (mis. RDS)"
              value={incomeName}
              onChange={(e) => setIncomeName(e.target.value)}
            />
            <Button type="submit">Tambah</Button>
          </form>
        </CardContent>
      </Card>

      {/* Allocation Categories */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <IconChip icon={Layers} color="violet" />
          <CardTitle>Kategori Alokasi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {allocationCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada kategori
            </p>
          ) : (
            <ul className="space-y-2">
              {allocationCategories.map((c) =>
                editingAllocationId === c._id ? (
                  <li
                    key={c._id}
                    className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl border bg-muted/30"
                  >
                    <Input
                      autoFocus
                      value={editingAllocationName}
                      onChange={(e) =>
                        setEditingAllocationName(e.target.value)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          handleSaveAllocationCategory(c._id);
                        if (e.key === "Escape") cancelEditAllocationCategory();
                      }}
                      className="h-9 bg-background"
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <Select
                        value={editingAllocationType}
                        onValueChange={(v) =>
                          setEditingAllocationType(
                            v as AllocationCategory["type"]
                          )
                        }
                      >
                        <SelectTrigger className="h-9 w-full sm:w-36">
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
                        variant="ghost"
                        size="icon"
                        className="size-7 text-emerald-600 hover:text-emerald-700 shrink-0"
                        onClick={() => handleSaveAllocationCategory(c._id)}
                      >
                        <Check className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground shrink-0"
                        onClick={cancelEditAllocationCategory}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  </li>
                ) : (
                  <li
                    key={c._id}
                    className="px-4 py-2.5 flex items-center justify-between text-sm rounded-xl border bg-muted/30 hover:bg-muted/60 transition-colors"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      {c.name}
                      <Badge variant="secondary">
                        {ALLOCATION_TYPE_LABEL[c.type]}
                      </Badge>
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-foreground"
                        onClick={() => startEditAllocationCategory(c)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <ConfirmDeleteButton
                        title={`Hapus kategori "${c.name}"?`}
                        description="Kategori ini akan dihapus dari daftar, tapi jumlah yang sudah pernah tersimpan di bulan-bulan sebelumnya tetap ada (ditandai sebagai kategori terhapus, tidak ikut hilang)."
                        onConfirm={() => handleDeleteAllocationCategory(c._id)}
                      />
                    </div>
                  </li>
                )
              )}
            </ul>
          )}
          <form
            onSubmit={handleAddAllocationCategory}
            className="flex flex-col sm:flex-row sm:items-center gap-2"
          >
            <Input
              placeholder="Nama pos (mis. TF Ibu)"
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
            <Button type="submit">Tambah</Button>
          </form>
        </CardContent>
      </Card>

      {/* Recurring Expenses */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <IconChip icon={Repeat} color="amber" />
          <div>
            <CardTitle>Pengeluaran Berulang</CardTitle>
            <CardDescription>
              Subscription/tagihan bulanan atau tahunan (mis. pajak
              kendaraan, asuransi) — kamu dapat notifikasi buat
              konfirmasi tiap tanggal jatuh tempo (tidak otomatis
              tercatat begitu saja). Kalau tanggal yang dipilih pas
              hari ini, form konfirmasinya langsung muncul begitu
              ditambahkan
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {recurringExpenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada pengeluaran berulang
            </p>
          ) : (
            <ul className="space-y-2">
              {recurringExpenses.map((item) =>
                editingRecurringId === item._id ? (
                  <li
                    key={item._id}
                    className="rounded-xl border bg-muted/30 px-4 py-3 space-y-2"
                  >
                    <Input
                      autoFocus
                      value={editingRecurringName}
                      onChange={(e) =>
                        setEditingRecurringName(e.target.value)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          handleSaveRecurringExpense(item._id);
                        if (e.key === "Escape") cancelEditRecurringExpense();
                      }}
                      className="h-9 bg-background"
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <CurrencyInput
                        value={editingRecurringAmount}
                        onValueChange={setEditingRecurringAmount}
                        className="h-9 bg-background"
                      />
                      <Select
                        value={editingRecurringDay}
                        onValueChange={setEditingRecurringDay}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(
                            (d) => (
                              <SelectItem key={d} value={String(d)}>
                                Tgl {d}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                      <Select
                        value={editingRecurringFrequency}
                        onValueChange={(v) =>
                          setEditingRecurringFrequency(v as "monthly" | "yearly")
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Bulanan</SelectItem>
                          <SelectItem value="yearly">Tahunan</SelectItem>
                        </SelectContent>
                      </Select>
                      {editingRecurringFrequency === "yearly" && (
                        <Select
                          value={editingRecurringMonth}
                          onValueChange={setEditingRecurringMonth}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MONTH_LABEL.map((label, i) => (
                              <SelectItem key={i} value={String(i + 1)}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-emerald-600 hover:text-emerald-700 shrink-0"
                        onClick={() => handleSaveRecurringExpense(item._id)}
                      >
                        <Check className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground shrink-0"
                        onClick={cancelEditRecurringExpense}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  </li>
                ) : (
                  <li
                    key={item._id}
                    className={`flex items-start gap-3 rounded-xl border bg-muted/30 px-4 py-3 hover:bg-muted/60 transition-colors ${
                      item.active ? "" : "opacity-60"
                    }`}
                  >
                    <IconChip icon={Repeat} color="amber" size="sm" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium truncate">
                          {item.name}
                        </span>
                        {item.frequency === "yearly" && (
                          <Badge variant="outline" className="text-[11px]">
                            Tahunan
                          </Badge>
                        )}
                        {!item.active && (
                          <Badge variant="outline" className="text-[11px]">
                            Nonaktif
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatRupiah(item.amount)} ·{" "}
                        {item.frequency === "yearly"
                          ? `tiap ${MONTH_LABEL[(item.month ?? 1) - 1]}, tgl ${item.dayOfMonth}`
                          : `tiap tgl ${item.dayOfMonth}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-foreground"
                        onClick={() => handleToggleRecurringActive(item)}
                      >
                        {item.active ? (
                          <Pause className="size-4" />
                        ) : (
                          <Play className="size-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-foreground"
                        onClick={() => startEditRecurringExpense(item)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <ConfirmDeleteButton
                        title={`Hapus "${item.name}"?`}
                        description="Jadwal pengingat ini akan dihapus. Pengeluaran yang sudah pernah dicatat dari item ini sebelumnya tidak ikut terhapus."
                        onConfirm={() => handleDeleteRecurringExpense(item._id)}
                      />
                    </div>
                  </li>
                )
              )}
            </ul>
          )}
          <form
            onSubmit={handleAddRecurringExpense}
            className="space-y-2 border-t pt-4"
          >
            <Input
              placeholder="Nama (mis. Netflix)"
              value={recurringName}
              onChange={(e) => setRecurringName(e.target.value)}
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <CurrencyInput
                value={recurringAmount}
                onValueChange={setRecurringAmount}
              />
              <Select value={recurringDay} onValueChange={setRecurringDay}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      Tgl {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={recurringFrequency}
                onValueChange={(v) =>
                  setRecurringFrequency(v as "monthly" | "yearly")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Bulanan</SelectItem>
                  <SelectItem value="yearly">Tahunan</SelectItem>
                </SelectContent>
              </Select>
              {recurringFrequency === "yearly" && (
                <Select value={recurringMonth} onValueChange={setRecurringMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_LABEL.map((label, i) => (
                      <SelectItem key={i} value={String(i + 1)}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <Button type="submit" className="w-full sm:w-auto">
              Tambah
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

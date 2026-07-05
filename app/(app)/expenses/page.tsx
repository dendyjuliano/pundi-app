"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { IconChip } from "@/components/icon-chip";
import { AddExpenseDialog } from "@/components/add-expense-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  UtensilsCrossed,
  ShoppingBag,
  CalendarDays,
  Sparkles,
  Search,
} from "lucide-react";

type Expense = {
  _id: string;
  date: string;
  category: "makan" | "lain-lain";
  amount: number;
  note?: string;
};

function todayISO() {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 10);
}

function currentMonth() {
  return todayISO().slice(0, 7);
}

function formatDayLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("id-ID", { weekday: "long" });
}

function formatDateSub(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatMonthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

export default function ExpensesPage() {
  const [month, setMonth] = useState(currentMonth());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | "makan" | "lain-lain"
  >("all");

  async function loadExpenses(forMonth: string) {
    const res = await fetch(`/api/expenses?month=${forMonth}`);
    setExpenses(await res.json());
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadExpenses(month);
      setLoading(false);
    })();
  }, [month]);

  function handleExpenseSaved(dateISO: string) {
    const addedMonth = dateISO.slice(0, 7);
    if (addedMonth !== month) {
      setMonth(addedMonth);
    } else {
      loadExpenses(month);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Gagal menghapus pengeluaran");
      return;
    }
    toast.success("Pengeluaran dihapus");
    loadExpenses(month);
  }

  // Filter cuma memengaruhi daftar yang DITAMPILKAN — stat "Hari Ini"/
  // "Total Bulan" di bawah tetap dihitung dari `expenses` mentah (bukan
  // hasil filter), biar user tidak salah kira itu total transaksi yang
  // ke-filter doang.
  const filteredExpenses = expenses.filter((exp) => {
    if (categoryFilter !== "all" && exp.category !== categoryFilter) {
      return false;
    }
    if (
      searchQuery.trim() &&
      !(exp.note ?? "").toLowerCase().includes(searchQuery.trim().toLowerCase())
    ) {
      return false;
    }
    return true;
  });
  const isFiltering = categoryFilter !== "all" || searchQuery.trim() !== "";

  const grouped = filteredExpenses.reduce<Record<string, Expense[]>>(
    (acc, exp) => {
      const key = exp.date.slice(0, 10);
      acc[key] = acc[key] ?? [];
      acc[key].push(exp);
      return acc;
    },
    {}
  );
  const dateKeys = Object.keys(grouped).sort((a, b) => (a < b ? 1 : -1));

  const isCurrentMonth = month === currentMonth();
  const today = todayISO();
  const todayTotal = (grouped[today] ?? []).reduce(
    (sum, e) => sum + e.amount,
    0
  );
  const monthTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

  const addExpenseDialog = (
    <AddExpenseDialog
      trigger={
        <Button
          size="sm"
          className="bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-md shadow-emerald-500/25"
        >
          <Plus className="size-4" />
          Tambah
        </Button>
      }
      onSaved={handleExpenseSaved}
    />
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Pengeluaran Harian
          </h1>
          <p className="text-sm text-muted-foreground">
            Catat pengeluaran makan dan lain-lain setiap hari
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-auto"
          />
          {addExpenseDialog}
        </div>
      </div>

      {/* Stat summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-0 bg-linear-to-br from-amber-400 to-orange-500 text-white">
          <CardContent className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white/20">
              <Sparkles className="size-5" />
            </div>
            <div>
              <p className="text-xs text-white/85">
                {isCurrentMonth ? "Hari Ini" : "Jumlah Transaksi"}
              </p>
              <p className="text-lg font-bold">
                {isCurrentMonth ? formatRupiah(todayTotal) : expenses.length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-linear-to-br from-blue-500 to-indigo-600 text-white">
          <CardContent className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white/20">
              <CalendarDays className="size-5" />
            </div>
            <div>
              <p className="text-xs text-white/85">
                Total {formatMonthLabel(month)}
              </p>
              <p className="text-lg font-bold">{formatRupiah(monthTotal)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari catatan pengeluaran..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={categoryFilter}
          onValueChange={(v) =>
            setCategoryFilter(v as "all" | "makan" | "lain-lain")
          }
        >
          <SelectTrigger className="sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            <SelectItem value="makan">Makan</SelectItem>
            <SelectItem value="lain-lain">Lain-lain</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {!loading && dateKeys.length === 0 && (
        <Card>
          <CardContent className="text-sm text-muted-foreground text-center py-10">
            {isFiltering
              ? "Tidak ada pengeluaran yang cocok dengan pencarian/filter."
              : `Belum ada pengeluaran tercatat di ${formatMonthLabel(month)}.`}
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {dateKeys.map((key) => {
          const dayTotal = grouped[key].reduce((sum, e) => sum + e.amount, 0);
          const dayNum = new Date(key).getDate();
          return (
            <Card key={key} className="overflow-hidden py-0">
              <div className="flex items-center justify-between px-6 py-3 bg-muted/40 border-b">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 text-white text-sm font-bold">
                    {dayNum}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      {formatDayLabel(key)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateSub(key)}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-emerald-600">
                  {formatRupiah(dayTotal)}
                </span>
              </div>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {grouped[key].map((exp) => (
                    <li
                      key={exp._id}
                      className="px-6 py-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <IconChip
                          icon={
                            exp.category === "makan"
                              ? UtensilsCrossed
                              : ShoppingBag
                          }
                          color={exp.category === "makan" ? "emerald" : "amber"}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <Badge variant="secondary" className="mb-0.5">
                            {exp.category === "makan" ? "Makan" : "Lain-lain"}
                          </Badge>
                          {exp.note && (
                            <p className="text-sm text-muted-foreground truncate">
                              {exp.note}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-medium text-sm">
                          {formatRupiah(exp.amount)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(exp._id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

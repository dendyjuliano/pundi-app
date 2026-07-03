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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { IconChip } from "@/components/icon-chip";
import { CurrencyInput } from "@/components/currency-input";
import { PushNotificationToggle } from "@/components/push-notification-toggle";
import {
  Trash2,
  UtensilsCrossed,
  ArrowDownToLine,
  Layers,
  Pencil,
  Check,
  X,
  Bell,
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
  const [loading, setLoading] = useState(true);

  const [incomeName, setIncomeName] = useState("");
  const [allocationName, setAllocationName] = useState("");
  const [allocationType, setAllocationType] =
    useState<AllocationCategory["type"]>("fixed");
  const [newAmountPerDay, setNewAmountPerDay] = useState(0);

  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [editingIncomeName, setEditingIncomeName] = useState("");

  const [editingAllocationId, setEditingAllocationId] = useState<
    string | null
  >(null);
  const [editingAllocationName, setEditingAllocationName] = useState("");
  const [editingAllocationType, setEditingAllocationType] =
    useState<AllocationCategory["type"]>("fixed");

  async function loadAll() {
    const [incomeRes, allocationRes, budgetRes] = await Promise.all([
      fetch("/api/income-categories"),
      fetch("/api/allocation-categories"),
      fetch("/api/daily-budget-setting"),
    ]);
    setIncomeCategories(await incomeRes.json());
    setAllocationCategories(await allocationRes.json());
    setDailyBudget(await budgetRes.json());
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
              className="bg-white/95 border-0 text-foreground"
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteIncomeCategory(c._id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteAllocationCategory(c._id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
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
    </div>
  );
}

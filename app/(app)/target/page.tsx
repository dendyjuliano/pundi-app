"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { id as idLocale } from "date-fns/locale";
import {
  Target as TargetIcon,
  Plus,
  CalendarIcon,
  Pencil,
  Check,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatRupiah } from "@/lib/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { IconChip } from "@/components/icon-chip";
import { CurrencyInput } from "@/components/currency-input";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type SavingsGoal = {
  _id: string;
  name: string;
  targetAmount: number;
  targetDate?: string;
  contributed: number;
};

type Contribution = {
  _id: string;
  amount: number;
  date: string;
  note?: string;
};

function toISODate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function AddContributionDialog({
  goalId,
  onAdded,
}: {
  goalId: string;
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [dateOpen, setDateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (amount <= 0) return;
    setSubmitting(true);
    const res = await fetch(`/api/savings-goals/${goalId}/contributions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        date: toISODate(date),
        note: note.trim() || undefined,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error("Gagal menambah kontribusi");
      return;
    }
    toast.success("Kontribusi tersimpan");
    setAmount(0);
    setNote("");
    setDate(new Date());
    setOpen(false);
    onAdded();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Tambah Kontribusi
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Tambah Kontribusi</DialogTitle>
            <DialogDescription>
              Catat nominal yang baru kamu sisihkan buat target ini — ikut
              tercatat sebagai pengeluaran &quot;Lain-lain&quot; juga
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Jumlah</label>
              <CurrencyInput value={amount} onValueChange={setAmount} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tanggal</label>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start font-normal"
                  >
                    <CalendarIcon className="size-4" />
                    {date.toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    locale={idLocale}
                    selected={date}
                    onSelect={(d) => {
                      if (!d) return;
                      setDate(d);
                      setDateOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Catatan{" "}
                <span className="text-muted-foreground font-normal">
                  (opsional)
                </span>
              </label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="mis. Bonus THR"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={submitting}
              size="lg"
              className="w-full bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
            >
              {submitting ? "Menyimpan..." : "Simpan Kontribusi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GoalCard({
  goal,
  onChanged,
}: {
  goal: SavingsGoal;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(goal.name);
  const [editTargetAmount, setEditTargetAmount] = useState(goal.targetAmount);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [contributions, setContributions] = useState<Contribution[] | null>(
    null
  );

  const pct =
    goal.targetAmount > 0
      ? Math.min(100, (goal.contributed / goal.targetAmount) * 100)
      : 0;
  const sisa = Math.max(0, goal.targetAmount - goal.contributed);
  const achieved = goal.contributed >= goal.targetAmount;

  function startEdit() {
    setEditName(goal.name);
    setEditTargetAmount(goal.targetAmount);
    setEditing(true);
  }

  async function saveEdit() {
    if (!editName.trim() || editTargetAmount <= 0) return;
    const res = await fetch(`/api/savings-goals/${goal._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName.trim(),
        targetAmount: editTargetAmount,
      }),
    });
    if (!res.ok) {
      toast.error("Gagal mengubah target");
      return;
    }
    toast.success("Target diperbarui");
    setEditing(false);
    onChanged();
  }

  async function handleDeleteGoal() {
    const res = await fetch(`/api/savings-goals/${goal._id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("Gagal menghapus target");
      return;
    }
    toast.success("Target dihapus");
    onChanged();
  }

  async function toggleHistory() {
    const next = !historyOpen;
    setHistoryOpen(next);
    if (next && contributions === null) {
      const res = await fetch(`/api/savings-goals/${goal._id}/contributions`);
      if (res.ok) setContributions(await res.json());
    }
  }

  async function handleDeleteContribution(contributionId: string) {
    const res = await fetch(
      `/api/savings-goals/${goal._id}/contributions/${contributionId}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      toast.error("Gagal menghapus kontribusi");
      return;
    }
    toast.success("Kontribusi dihapus");
    setContributions(
      (prev) => prev?.filter((c) => c._id !== contributionId) ?? null
    );
    onChanged();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        {editing ? (
          <div className="flex flex-1 items-center gap-2">
            <Input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEdit();
                if (e.key === "Escape") setEditing(false);
              }}
              className="h-9"
            />
            <CurrencyInput
              value={editTargetAmount}
              onValueChange={setEditTargetAmount}
              className="h-9 w-36"
            />
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-emerald-600 hover:text-emerald-700 shrink-0"
              onClick={saveEdit}
            >
              <Check className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground shrink-0"
              onClick={() => setEditing(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 min-w-0">
              <IconChip icon={TargetIcon} color="violet" size="sm" />
              <div className="min-w-0">
                <CardTitle className="truncate">{goal.name}</CardTitle>
                {goal.targetDate && (
                  <CardDescription>
                    Target {formatShortDate(goal.targetDate)}
                  </CardDescription>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {achieved && (
                <Badge className="bg-emerald-100 text-emerald-700">
                  Tercapai
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-foreground"
                onClick={startEdit}
              >
                <Pencil className="size-4" />
              </Button>
              <ConfirmDeleteButton
                title={`Hapus target "${goal.name}"?`}
                description="Progress target ini akan dihapus, tapi pengeluaran yang sudah tercatat dari kontribusi sebelumnya tetap ada di riwayat Pengeluaran."
                onConfirm={handleDeleteGoal}
              />
            </div>
          </>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Terkumpul</span>
          <span className="font-medium">
            {formatRupiah(goal.contributed)}{" "}
            <span className="text-muted-foreground font-normal">
              / {formatRupiah(goal.targetAmount)}
            </span>
          </span>
        </div>
        <Progress
          value={pct}
          className={achieved ? "[&>div]:bg-emerald-500" : "[&>div]:bg-violet-500"}
        />
        <p className="text-xs text-muted-foreground">
          {achieved
            ? "Target sudah tercapai"
            : `sisa ${formatRupiah(sisa)} (${Math.round(pct)}%)`}
        </p>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={toggleHistory}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Riwayat kontribusi
            {historyOpen ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </button>
          <AddContributionDialog goalId={goal._id} onAdded={onChanged} />
        </div>

        {historyOpen && (
          <div className="space-y-1.5 pt-1">
            {contributions === null ? (
              <Skeleton className="h-8 w-full" />
            ) : contributions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Belum ada kontribusi tercatat
              </p>
            ) : (
              contributions.map((c) => (
                <div
                  key={c._id}
                  className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-xs"
                >
                  <div>
                    <span className="font-medium">{formatRupiah(c.amount)}</span>{" "}
                    <span className="text-muted-foreground">
                      {formatShortDate(c.date)}
                      {c.note ? ` · ${c.note}` : ""}
                    </span>
                  </div>
                  <ConfirmDeleteButton
                    title="Hapus kontribusi ini?"
                    description="Nominal ini akan dikurangi dari total terkumpul, dan pengeluaran terkait di riwayat Pengeluaran juga ikut terhapus."
                    onConfirm={() => handleDeleteContribution(c._id)}
                    className="size-6 text-muted-foreground hover:text-destructive"
                  />
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function TargetPage() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState(0);
  const [targetDate, setTargetDate] = useState<Date | undefined>(undefined);
  const [dateOpen, setDateOpen] = useState(false);

  async function loadGoals() {
    const res = await fetch("/api/savings-goals");
    setGoals(await res.json());
  }

  useEffect(() => {
    (async () => {
      await loadGoals();
      setLoading(false);
    })();
  }, []);

  async function handleAddGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || targetAmount <= 0) return;
    const res = await fetch("/api/savings-goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        targetAmount,
        targetDate: targetDate ? toISODate(targetDate) : undefined,
      }),
    });
    if (!res.ok) {
      toast.error("Gagal menambah target");
      return;
    }
    toast.success(`Target "${name.trim()}" ditambahkan`);
    setName("");
    setTargetAmount(0);
    setTargetDate(undefined);
    loadGoals();
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
        <h1 className="text-2xl font-bold tracking-tight">Target Tabungan</h1>
        <p className="text-sm text-muted-foreground">
          Catat kontribusi manual buat tujuan nabung tertentu — terpisah dari
          alokasi investasi bulanan di Budget
        </p>
      </div>

      {goals.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Belum ada target tabungan — tambahkan yang pertama di bawah
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {goals.map((g) => (
            <GoalCard key={g._id} goal={g} onChanged={loadGoals} />
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <IconChip icon={Plus} color="violet" />
          <CardTitle>Target Baru</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleAddGoal}
            className="flex flex-col sm:flex-row sm:items-center gap-2"
          >
            <Input
              placeholder="Nama target (mis. Liburan Desember)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <CurrencyInput
              value={targetAmount}
              onValueChange={setTargetAmount}
              className="sm:w-40"
              placeholder="Target nominal"
            />
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="sm:w-56 justify-start overflow-hidden font-normal"
                >
                  <CalendarIcon className="size-4 shrink-0" />
                  <span className="truncate">
                    {targetDate
                      ? targetDate.toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "Tanggal target (opsional)"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  locale={idLocale}
                  selected={targetDate}
                  onSelect={(d) => {
                    setTargetDate(d);
                    setDateOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
            <Button type="submit">Tambah</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

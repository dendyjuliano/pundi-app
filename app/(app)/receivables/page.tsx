"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { id as idLocale } from "date-fns/locale";
import {
  HandCoins,
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

type Receivable = {
  _id: string;
  debtorName: string;
  amount: number;
  description?: string;
  dueDate?: string;
  paidAmount: number;
  remainingAmount: number;
  lunas: boolean;
};

type Payment = {
  _id: string;
  amount: number;
  date: string;
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

function AddPaymentDialog({
  receivableId,
  onAdded,
}: {
  receivableId: string;
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState<Date>(new Date());
  const [dateOpen, setDateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (amount <= 0) return;
    setSubmitting(true);
    const res = await fetch(`/api/receivables/${receivableId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, date: toISODate(date) }),
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error("Gagal mencatat pembayaran");
      return;
    }
    toast.success("Pembayaran tercatat");
    setAmount(0);
    setDate(new Date());
    setOpen(false);
    onAdded();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Catat Pembayaran</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Catat Pembayaran Diterima</DialogTitle>
            <DialogDescription>
              Catat nominal yang baru dibayar balik — ini cuma catatan
              pribadi, TIDAK memengaruhi Pengeluaran/Budget kamu.
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
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={submitting}
              size="lg"
              className="w-full bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
            >
              {submitting ? "Menyimpan..." : "Simpan Pembayaran"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReceivableCard({
  receivable,
  onChanged,
}: {
  receivable: Receivable;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editDebtorName, setEditDebtorName] = useState(receivable.debtorName);
  const [editAmount, setEditAmount] = useState(receivable.amount);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [payments, setPayments] = useState<Payment[] | null>(null);

  const pct =
    receivable.amount > 0
      ? Math.min(100, (receivable.paidAmount / receivable.amount) * 100)
      : 0;

  function startEdit() {
    setEditDebtorName(receivable.debtorName);
    setEditAmount(receivable.amount);
    setEditing(true);
  }

  async function saveEdit() {
    if (!editDebtorName.trim() || editAmount <= 0) return;
    const res = await fetch(`/api/receivables/${receivable._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        debtorName: editDebtorName.trim(),
        amount: editAmount,
      }),
    });
    if (!res.ok) {
      toast.error("Gagal mengubah piutang");
      return;
    }
    toast.success("Piutang diperbarui");
    setEditing(false);
    onChanged();
  }

  async function handleDelete() {
    const res = await fetch(`/api/receivables/${receivable._id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("Gagal menghapus piutang");
      return;
    }
    toast.success("Piutang dihapus");
    onChanged();
  }

  async function refetchPayments() {
    const res = await fetch(`/api/receivables/${receivable._id}/payments`);
    if (res.ok) setPayments(await res.json());
  }

  async function toggleHistory() {
    const next = !historyOpen;
    setHistoryOpen(next);
    if (next && payments === null) {
      await refetchPayments();
    }
  }

  function handlePaymentAdded() {
    onChanged();
    if (historyOpen) refetchPayments();
  }

  async function handleDeletePayment(paymentId: string) {
    const res = await fetch(
      `/api/receivables/${receivable._id}/payments/${paymentId}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      toast.error("Gagal menghapus pembayaran");
      return;
    }
    toast.success("Pembayaran dihapus");
    setPayments((prev) => prev?.filter((p) => p._id !== paymentId) ?? null);
    onChanged();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        {editing ? (
          <div className="flex flex-1 items-center gap-2">
            <Input
              autoFocus
              value={editDebtorName}
              onChange={(e) => setEditDebtorName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEdit();
                if (e.key === "Escape") setEditing(false);
              }}
              className="h-9"
            />
            <CurrencyInput
              value={editAmount}
              onValueChange={setEditAmount}
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
              <IconChip icon={HandCoins} color="emerald" size="sm" />
              <div className="min-w-0">
                <CardTitle className="truncate">
                  {receivable.debtorName}
                </CardTitle>
                {(receivable.description || receivable.dueDate) && (
                  <CardDescription className="truncate">
                    {receivable.description}
                    {receivable.description && receivable.dueDate ? " · " : ""}
                    {receivable.dueDate &&
                      `Jatuh tempo ${formatShortDate(receivable.dueDate)}`}
                  </CardDescription>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {receivable.lunas && (
                <Badge className="bg-emerald-100 text-emerald-700">
                  Lunas
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
                title={`Hapus piutang "${receivable.debtorName}"?`}
                description="Seluruh riwayat pembayaran yang tercatat buat piutang ini akan ikut terhapus."
                onConfirm={handleDelete}
              />
            </div>
          </>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Terbayar</span>
          <span className="font-medium">
            {formatRupiah(receivable.paidAmount)}{" "}
            <span className="text-muted-foreground font-normal">
              / {formatRupiah(receivable.amount)}
            </span>
          </span>
        </div>
        <Progress
          value={pct}
          className={
            receivable.lunas ? "[&>div]:bg-emerald-500" : "[&>div]:bg-amber-500"
          }
        />
        <p className="text-xs text-muted-foreground">
          {receivable.lunas
            ? "Piutang sudah lunas"
            : `sisa ${formatRupiah(receivable.remainingAmount)}`}
        </p>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={toggleHistory}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Riwayat pembayaran
            {historyOpen ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </button>
          {!receivable.lunas && (
            <AddPaymentDialog
              receivableId={receivable._id}
              onAdded={handlePaymentAdded}
            />
          )}
        </div>

        {historyOpen && (
          <div className="space-y-1.5 pt-1">
            {payments === null ? (
              <Skeleton className="h-8 w-full" />
            ) : payments.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Belum ada pembayaran tercatat
              </p>
            ) : (
              payments.map((p) => (
                <div
                  key={p._id}
                  className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-xs"
                >
                  <div>
                    <span className="font-medium">{formatRupiah(p.amount)}</span>{" "}
                    <span className="text-muted-foreground">
                      {formatShortDate(p.date)}
                    </span>
                  </div>
                  <ConfirmDeleteButton
                    title="Hapus pembayaran ini?"
                    description="Progress piutang ini akan berkurang."
                    onConfirm={() => handleDeletePayment(p._id)}
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

export default function ReceivablesPage() {
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [loading, setLoading] = useState(true);

  const [debtorName, setDebtorName] = useState("");
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [dateOpen, setDateOpen] = useState(false);

  async function loadReceivables() {
    const res = await fetch("/api/receivables");
    setReceivables(await res.json());
  }

  useEffect(() => {
    (async () => {
      await loadReceivables();
      setLoading(false);
    })();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!debtorName.trim() || amount <= 0) return;
    const res = await fetch("/api/receivables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        debtorName: debtorName.trim(),
        amount,
        description: description.trim() || undefined,
        dueDate: dueDate ? toISODate(dueDate) : undefined,
      }),
    });
    if (!res.ok) {
      toast.error("Gagal menambah piutang");
      return;
    }
    toast.success(`Piutang "${debtorName.trim()}" ditambahkan`);
    setDebtorName("");
    setAmount(0);
    setDescription("");
    setDueDate(undefined);
    loadReceivables();
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
        <h1 className="text-2xl font-bold tracking-tight">Piutang</h1>
        <p className="text-sm text-muted-foreground">
          Catat uang yang kamu pinjamkan ke orang lain — debitur tidak
          perlu punya akun Pundi, kamu sendiri yang mencatat pembayarannya
        </p>
      </div>

      {receivables.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Belum ada piutang — tambahkan yang pertama di bawah
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {receivables.map((r) => (
            <ReceivableCard
              key={r._id}
              receivable={r}
              onChanged={loadReceivables}
            />
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <IconChip icon={Plus} color="emerald" />
          <CardTitle>Piutang Baru</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                placeholder="Nama debitur (mis. Budi)"
                value={debtorName}
                onChange={(e) => setDebtorName(e.target.value)}
              />
              <CurrencyInput
                value={amount}
                onValueChange={setAmount}
                placeholder="Nominal dipinjamkan"
              />
              <Input
                placeholder="Keterangan (opsional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="justify-start overflow-hidden font-normal"
                  >
                    <CalendarIcon className="size-4 shrink-0" />
                    <span className="truncate">
                      {dueDate
                        ? dueDate.toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "Jatuh tempo (opsional)"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    locale={idLocale}
                    selected={dueDate}
                    onSelect={(d) => {
                      setDueDate(d);
                      setDateOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
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

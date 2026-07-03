"use client";

import { useState } from "react";
import { toast } from "sonner";
import { id as idLocale } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { CurrencyInput } from "@/components/currency-input";

function parseISODate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toISODate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function todayISO() {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 10);
}

export function AddExpenseDialog({
  trigger,
  onSaved,
}: {
  trigger: React.ReactNode;
  onSaved?: (dateISO: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [category, setCategory] = useState<"makan" | "lain-lain">("makan");
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Jumlah harus lebih dari 0");
      return;
    }
    if (category === "lain-lain" && !note.trim()) {
      setError("Keterangan wajib diisi untuk kategori lain-lain");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, category, amount, note }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Gagal menyimpan");
      toast.error(data.error ?? "Gagal menyimpan pengeluaran");
      return;
    }

    toast.success("Pengeluaran tersimpan");
    const savedDate = date;
    setAmount(0);
    setNote("");
    setDate(todayISO());
    setCategory("makan");
    setOpen(false);
    onSaved?.(savedDate);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Tambah Pengeluaran</DialogTitle>
            <DialogDescription>
              Catat pengeluaran makan atau lain-lain hari ini
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="expense-date">Tanggal</Label>
                {/* Bukan native <input type="date"> — di iOS Safari
                    tinggi kontrol native itu suka ngaco/lebih gede dari
                    h-10 yang kita set, ngga konsisten sama SelectTrigger
                    di sebelahnya. Popover+Calendar ini render sebagai
                    button biasa, jadi tingginya presisi sama di semua
                    platform. */}
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="expense-date"
                      type="button"
                      variant="outline"
                      className="w-full justify-start font-normal"
                    >
                      <CalendarIcon className="size-4" />
                      {parseISODate(date).toLocaleDateString("id-ID", {
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
                      selected={parseISODate(date)}
                      onSelect={(d) => {
                        if (!d) return;
                        setDate(toISODate(d));
                        setDateOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select
                  value={category}
                  onValueChange={(v) =>
                    setCategory(v as "makan" | "lain-lain")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="makan">Makan</SelectItem>
                    <SelectItem value="lain-lain">Lain-lain</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-amount">Jumlah</Label>
              <CurrencyInput
                id="expense-amount"
                value={amount}
                onValueChange={setAmount}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-note">
                Keterangan{" "}
                {category === "lain-lain" ? (
                  <span className="text-destructive">*wajib</span>
                ) : (
                  <span className="text-muted-foreground font-normal">
                    (opsional)
                  </span>
                )}
              </Label>
              <Input
                id="expense-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  category === "lain-lain" ? "mis. Bensin, Service Motor" : ""
                }
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={submitting}
              size="lg"
              className="w-full bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
            >
              {submitting ? "Menyimpan..." : "Simpan Pengeluaran"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

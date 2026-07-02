"use client";

import { useState } from "react";
import { toast } from "sonner";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CurrencyInput } from "@/components/currency-input";

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
                <Input
                  id="expense-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
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

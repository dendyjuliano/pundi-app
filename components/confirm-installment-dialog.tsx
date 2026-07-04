"use client";

import { useState } from "react";
import { id as idLocale } from "date-fns/locale";
import { toast } from "sonner";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/currency-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function toISODate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function ConfirmInstallmentDialog({
  installmentId,
  installmentName,
  defaultAmount,
  trigger,
  open: controlledOpen,
  onOpenChange,
  confirmOnClose,
  onSaved,
}: {
  installmentId: string;
  installmentName: string;
  defaultAmount: number;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  // Dipakai khusus alur konfirmasi dari push notification — kalau ke-close
  // tidak sengaja, munculin AlertDialog konfirmasi dulu (pola sama persis
  // AddExpenseDialog buat konfirmasi pengeluaran berulang).
  confirmOnClose?: boolean;
  onSaved?: () => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen ?? internalOpen;
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  function setOpen(next: boolean) {
    onOpenChange?.(next);
    setInternalOpen(next);
  }
  function handleDialogOpenChange(next: boolean) {
    if (closeConfirmOpen) return;
    if (next || !confirmOnClose) {
      setOpen(next);
      return;
    }
    setCloseConfirmOpen(true);
  }

  const [amount, setAmount] = useState(defaultAmount);
  const [date, setDate] = useState<Date>(new Date());
  const [dateOpen, setDateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (amount <= 0) return;
    setSubmitting(true);
    const res = await fetch(`/api/installments/${installmentId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, date: toISODate(date) }),
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error("Gagal mencatat pembayaran cicilan");
      return;
    }
    toast.success("Pembayaran cicilan tersimpan");
    setDate(new Date());
    setOpen(false);
    onSaved?.();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Konfirmasi Pembayaran Cicilan</DialogTitle>
            <DialogDescription>
              &quot;{installmentName}&quot; — cek dulu nominalnya (bisa
              diedit) sebelum disimpan, ikut tercatat sebagai pengeluaran
              &quot;Lain-lain&quot; juga
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

      <AlertDialog open={closeConfirmOpen} onOpenChange={setCloseConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan konfirmasi ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Kalau ditutup, kamu perlu mencatatnya lagi secara manual lewat
              &quot;Bayar Bulan Ini&quot; di halaman Cicilan kalau masih mau
              mencatatnya bulan ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Lanjut isi</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setCloseConfirmOpen(false);
                setOpen(false);
              }}
            >
              Ya, batalkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

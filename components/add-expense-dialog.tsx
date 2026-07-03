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
  open: controlledOpen,
  onOpenChange,
  initialAmount,
  initialNote,
  title,
  description,
  confirmOnClose,
}: {
  trigger?: React.ReactNode;
  onSaved?: (dateISO: string) => void;
  // Controlled-mode buat dipakai dari luar (mis. Dashboard buka dialog ini
  // sendiri lewat query param `?confirmRecurring=`, tanpa ada trigger
  // klik) — kalau tidak dikasih, komponen ini tetap jalan uncontrolled
  // (perilaku lama, buka lewat klik `trigger`) supaya backward-compatible.
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialAmount?: number;
  initialNote?: string;
  // Override judul/deskripsi modal — dipakai pas dialog ini dibuka otomatis
  // dari alur konfirmasi pengeluaran berulang, biar jelas KENAPA modalnya
  // muncul tiba-tiba (bukan cuma "Tambah Pengeluaran" generik yang bikin
  // user kaget karena tidak jelas konteksnya).
  title?: string;
  description?: string;
  // Kalau true, klik backdrop/X/Escape tidak langsung nutup dialog —
  // munculin AlertDialog konfirmasi dulu. Dipakai khusus alur konfirmasi
  // pengeluaran berulang: kalau ke-close tidak sengaja, dialog itu TIDAK
  // muncul lagi (beda dari tombol "Input Pengeluaran" biasa yang bisa
  // diklik ulang kapan saja) — jadi harus ada pengaman sebelum benar-benar
  // menutupnya.
  confirmOnClose?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen ?? internalOpen;
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  function setOpen(next: boolean) {
    onOpenChange?.(next);
    setInternalOpen(next);
  }
  // Dipasang ke <Dialog onOpenChange>, jadi cuma nangkep percobaan nutup
  // dari Radix sendiri (backdrop click/X/Escape) — sengaja BUKAN dipanggil
  // dari handleSubmit (yang manggil setOpen(false) langsung), supaya close
  // setelah berhasil simpan tidak ikut ke-gate konfirmasi ini.
  function handleDialogOpenChange(next: boolean) {
    // AlertDialog konfirmasi itu portal TERPISAH dari Dialog utama ini —
    // dari sudut pandang Dialog, klik APA PUN di dalam AlertDialog (mis.
    // tombol "Lanjut isi") kelihatan kayak "klik di luar" dan otomatis
    // memicu onOpenChange(false) di sini juga. Kalau tidak di-guard, ini
    // nge-timpa balik `setCloseConfirmOpen(false)` yang barusan dipanggil
    // Radix buat nutup AlertDialog-nya sendiri — hasilnya AlertDialog
    // kelihatan "nggak mau ketutup" pas "Lanjut isi" diklik. Selama
    // AlertDialog konfirmasi masih terbuka, abaikan sinyal ini sepenuhnya.
    if (closeConfirmOpen) return;
    if (next || !confirmOnClose) {
      setOpen(next);
      return;
    }
    setCloseConfirmOpen(true);
  }

  const [dateOpen, setDateOpen] = useState(false);
  const [date, setDate] = useState(todayISO());
  // Prefill lewat lazy initializer (bukan effect yang sync prop ke state)
  // — kalau dipakai dari confirm-recurring flow, parent WAJIB kasih `key`
  // yang beda tiap recurring expense biar komponen ini remount fresh dan
  // initializer ini kepanggil ulang dengan nilai yang benar. Nominal &
  // catatan sengaja tetap bisa diedit user sebelum benar-benar disimpan.
  const [category, setCategory] = useState<"makan" | "lain-lain">(
    initialNote !== undefined ? "lain-lain" : "makan"
  );
  const [amount, setAmount] = useState(initialAmount ?? 0);
  const [note, setNote] = useState(initialNote ?? "");
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
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title ?? "Tambah Pengeluaran"}</DialogTitle>
            <DialogDescription>
              {description ?? "Catat pengeluaran makan atau lain-lain hari ini"}
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

      <AlertDialog open={closeConfirmOpen} onOpenChange={setCloseConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan konfirmasi ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Kalau ditutup, kamu perlu menambahkannya lagi secara manual
              lewat &quot;Tambah Pengeluaran&quot; kalau masih mau
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

"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CreditCard,
  Plus,
  Pencil,
  Check,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatRupiah } from "@/lib/format";
import {
  calculateMonthlyInstallment,
  type InterestType,
} from "@/lib/installment";
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
import { ConfirmInstallmentDialog } from "@/components/confirm-installment-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Installment = {
  _id: string;
  name: string;
  interestType: InterestType;
  tenorMonths: number;
  monthlyInstallment: number;
  dayOfMonth: number;
  active: boolean;
  monthsPaid: number;
  totalPaid: number;
  remainingMonths: number;
  remainingAmount: number;
  lunas: boolean;
};

type Payment = {
  _id: string;
  amount: number;
  date: string;
};

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const INTEREST_TYPE_LABEL: Record<InterestType, string> = {
  flat: "Flat",
  efektif: "Efektif",
};

// Rule-of-thumb debt-to-income umum (dipakai bank buat nilai kelayakan
// kredit) — cuma soft warning di sini, BUKAN blocker, konsisten sama
// filosofi app ini yang tidak pernah mengunci input user (overspending
// pengeluaran biasa juga cuma ditandai "Melenceng" di Dashboard, tidak
// diblokir).
const DEBT_TO_INCOME_WARNING_RATIO = 0.3;

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function InstallmentCard({
  installment,
  onChanged,
}: {
  installment: Installment;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(installment.name);
  const [editDayOfMonth, setEditDayOfMonth] = useState(
    String(installment.dayOfMonth),
  );

  const [historyOpen, setHistoryOpen] = useState(false);
  const [payments, setPayments] = useState<Payment[] | null>(null);

  const totalCost = installment.tenorMonths * installment.monthlyInstallment;
  const pct = Math.min(
    100,
    (installment.monthsPaid / installment.tenorMonths) * 100,
  );

  function startEdit() {
    setEditName(installment.name);
    setEditDayOfMonth(String(installment.dayOfMonth));
    setEditing(true);
  }

  async function saveEdit() {
    const dayOfMonth = Number(editDayOfMonth);
    if (
      !editName.trim() ||
      !Number.isInteger(dayOfMonth) ||
      dayOfMonth < 1 ||
      dayOfMonth > 31
    ) {
      return;
    }
    const res = await fetch(`/api/installments/${installment._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), dayOfMonth }),
    });
    if (!res.ok) {
      toast.error("Gagal mengubah cicilan");
      return;
    }
    toast.success("Cicilan diperbarui");
    setEditing(false);
    onChanged();
  }

  async function handleDeleteInstallment() {
    const res = await fetch(`/api/installments/${installment._id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("Gagal menghapus cicilan");
      return;
    }
    toast.success("Cicilan dihapus");
    onChanged();
  }

  async function toggleHistory() {
    const next = !historyOpen;
    setHistoryOpen(next);
    if (next && payments === null) {
      const res = await fetch(`/api/installments/${installment._id}/payments`);
      if (res.ok) setPayments(await res.json());
    }
  }

  // Dipanggil setelah bayar via "Bayar Bulan Ini" — bukan cuma refresh
  // progress di parent (onChanged), tapi kalau riwayat pembayaran lagi
  // kebuka juga di-refetch, biar pembayaran yang baru langsung nongol
  // tanpa harus tutup-buka riwayat manual dulu (payments di-cache di
  // state sekali fetch, tidak otomatis invalidate pas ada payment baru).
  async function handlePaymentSaved() {
    onChanged();
    if (historyOpen) {
      const res = await fetch(`/api/installments/${installment._id}/payments`);
      if (res.ok) setPayments(await res.json());
    }
  }

  async function handleDeletePayment(paymentId: string) {
    const res = await fetch(
      `/api/installments/${installment._id}/payments/${paymentId}`,
      { method: "DELETE" },
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
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEdit();
                if (e.key === "Escape") setEditing(false);
              }}
              className="h-9"
            />
            <Input
              type="number"
              min={1}
              max={31}
              value={editDayOfMonth}
              onChange={(e) => setEditDayOfMonth(e.target.value)}
              className="h-9 w-20"
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
              <IconChip icon={CreditCard} color="orange" size="sm" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <CardTitle className="truncate">{installment.name}</CardTitle>
                  <Badge variant="outline">
                    {INTEREST_TYPE_LABEL[installment.interestType]}
                  </Badge>
                </div>
                <CardDescription>
                  Tgl {installment.dayOfMonth} tiap bulan
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {installment.lunas && (
                <Badge className="bg-emerald-100 text-emerald-700">Lunas</Badge>
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
                title={`Hapus cicilan "${installment.name}"?`}
                description="Progress cicilan ini akan dihapus, tapi pengeluaran yang sudah tercatat dari pembayaran sebelumnya tetap ada di riwayat Pengeluaran."
                onConfirm={handleDeleteInstallment}
              />
            </div>
          </>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Terbayar</span>
          <span className="font-medium">
            {formatRupiah(installment.totalPaid)}{" "}
            <span className="text-muted-foreground font-normal">
              / {formatRupiah(totalCost)}
            </span>
          </span>
        </div>
        <Progress
          value={pct}
          className={
            installment.lunas
              ? "[&>div]:bg-emerald-500"
              : "[&>div]:bg-orange-500"
          }
        />
        <p className="text-xs text-muted-foreground">
          {installment.lunas
            ? "Cicilan sudah lunas"
            : `bulan ke-${installment.monthsPaid} dari ${installment.tenorMonths} — sisa ${formatRupiah(installment.remainingAmount)}`}
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
          {!installment.lunas && (
            <ConfirmInstallmentDialog
              installmentId={installment._id}
              installmentName={installment.name}
              defaultAmount={installment.monthlyInstallment}
              trigger={<Button size="sm">Bayar Bulan Ini</Button>}
              onSaved={handlePaymentSaved}
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
                    <span className="font-medium">
                      {formatRupiah(p.amount)}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {formatShortDate(p.date)}
                    </span>
                  </div>
                  <ConfirmDeleteButton
                    title="Hapus pembayaran ini?"
                    description="Progress cicilan ini akan berkurang, dan pengeluaran terkait di riwayat Pengeluaran juga ikut terhapus."
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

export default function InstallmentsPage() {
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [interestType, setInterestType] = useState<InterestType>("flat");
  const [principal, setPrincipal] = useState(0);
  const [annualInterestRate, setAnnualInterestRate] = useState("");
  const [tenorMonths, setTenorMonths] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState(0);

  async function loadInstallments() {
    const res = await fetch("/api/installments");
    setInstallments(await res.json());
  }

  useEffect(() => {
    (async () => {
      await loadInstallments();
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/monthly-budget?month=${currentMonth()}`);
      if (res.ok) {
        const data = await res.json();
        setMonthlyIncome(data.totalIncome ?? 0);
      }
    })();
  }, []);

  const rateNum = Number(annualInterestRate);
  const tenorNum = Number(tenorMonths);
  const previewAmount =
    principal > 0 &&
    Number.isFinite(rateNum) &&
    rateNum >= 0 &&
    Number.isInteger(tenorNum) &&
    tenorNum > 0
      ? calculateMonthlyInstallment({
          principal,
          annualInterestRate: rateNum,
          tenorMonths: tenorNum,
          interestType,
        })
      : null;
  const incomeRatio =
    previewAmount !== null && monthlyIncome > 0
      ? previewAmount / monthlyIncome
      : null;

  async function handleAddInstallment(e: React.FormEvent) {
    e.preventDefault();
    const dayNum = Number(dayOfMonth);
    if (
      !name.trim() ||
      principal <= 0 ||
      !Number.isFinite(rateNum) ||
      rateNum < 0 ||
      !Number.isInteger(tenorNum) ||
      tenorNum <= 0 ||
      !Number.isInteger(dayNum) ||
      dayNum < 1 ||
      dayNum > 31
    ) {
      return;
    }
    const res = await fetch("/api/installments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        interestType,
        principal,
        annualInterestRate: rateNum,
        tenorMonths: tenorNum,
        dayOfMonth: dayNum,
      }),
    });
    if (!res.ok) {
      toast.error("Gagal menambah cicilan");
      return;
    }
    toast.success(`Cicilan "${name.trim()}" ditambahkan`);
    setName("");
    setInterestType("flat");
    setPrincipal(0);
    setAnnualInterestRate("");
    setTenorMonths("");
    setDayOfMonth("1");
    loadInstallments();
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
        <h1 className="text-2xl font-bold tracking-tight">Cicilan</h1>
        <p className="text-sm text-muted-foreground">
          Pantau cicilan KPR, motor, atau kartu kredit — bunga cuma dipakai buat
          menghitung nominal per bulan, bukan nge-track pokok vs bunga tiap
          pembayaran
        </p>
      </div>

      {installments.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Belum ada cicilan — tambahkan yang pertama di bawah
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {installments.map((i) => (
            <InstallmentCard
              key={i._id}
              installment={i}
              onChanged={loadInstallments}
            />
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <IconChip icon={Plus} color="orange" />
          <CardTitle>Cicilan Baru</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddInstallment} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                placeholder="Nama cicilan (mis. Cicilan Motor)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Select
                value={interestType}
                onValueChange={(v) => setInterestType(v as InterestType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Jenis bunga" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat (motor/elektronik)</SelectItem>
                  <SelectItem value="efektif">Efektif/Anuitas (KPR)</SelectItem>
                </SelectContent>
              </Select>
              <CurrencyInput
                value={principal}
                onValueChange={setPrincipal}
                placeholder="Pokok pinjaman"
              />
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Suku bunga tahunan (%)"
                value={annualInterestRate}
                onChange={(e) => setAnnualInterestRate(e.target.value)}
              />
              <Input
                type="number"
                min={1}
                placeholder="Tenor (bulan)"
                value={tenorMonths}
                onChange={(e) => setTenorMonths(e.target.value)}
              />
              <Input
                type="number"
                min={1}
                max={31}
                placeholder="Tanggal pengingat (1-31)"
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value)}
              />
            </div>

            {previewAmount !== null && (
              <p className="text-sm text-muted-foreground">
                Estimasi cicilan per bulan:{" "}
                <span className="font-medium text-foreground">
                  {formatRupiah(previewAmount)}
                </span>
                {incomeRatio !== null &&
                  ` (${Math.round(incomeRatio * 100)}% dari pemasukan bulan ini)`}
              </p>
            )}

            {incomeRatio !== null && incomeRatio > DEBT_TO_INCOME_WARNING_RATIO && (
              <div className="rounded-lg bg-amber-50 ring-1 ring-amber-200 px-3 py-2 text-sm text-amber-800">
                Cicilan ini cukup besar dibanding pemasukan bulan ini (lebih
                dari {Math.round(DEBT_TO_INCOME_WARNING_RATIO * 100)}%) —
                pastikan masih ada sisa buat kebutuhan lain.
              </div>
            )}

            <Button type="submit" className="w-full sm:w-auto">
              Tambah
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

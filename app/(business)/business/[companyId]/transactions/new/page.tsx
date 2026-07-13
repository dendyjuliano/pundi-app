"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { id as idLocale } from "date-fns/locale";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CurrencyInput } from "@/components/currency-input";

type Account = {
  _id: string;
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  reportSection?: string;
  isActive: boolean;
};

type TemplateKey =
  | "penjualan-tunai"
  | "terima-piutang"
  | "beli-persediaan"
  | "bayar-beban"
  | "setor-modal"
  | "prive"
  | "manual";

const TEMPLATE_LABELS: Record<TemplateKey, string> = {
  "penjualan-tunai": "Penjualan Tunai",
  "terima-piutang": "Terima Pembayaran Piutang",
  "beli-persediaan": "Beli Persediaan (Tunai)",
  "bayar-beban": "Bayar Beban Operasional",
  "setor-modal": "Setor Modal",
  prive: "Prive / Penarikan Pemilik",
  manual: "Lainnya (Manual)",
};

function findAccount(accounts: Account[], namePart: string) {
  return accounts.find((a) =>
    a.name.toLowerCase().includes(namePart.toLowerCase())
  );
}

function toISODate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function NewTransactionContent() {
  const { companyId } = useParams<{ companyId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [template, setTemplate] = useState<TemplateKey>("penjualan-tunai");
  const [pickedAccountId, setPickedAccountId] = useState("");
  // Akun Kas/Bank yang jadi sisi kas di tiap template — sebelumnya
  // hardcode ke Kas doang, sekarang bisa dipilih karena banyak transaksi
  // nyata (transfer bank, kartu) sebenarnya bukan tunai.
  const [cashAccountId, setCashAccountId] = useState("");
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [dateOpen, setDateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [manualLines, setManualLines] = useState<
    { accountId: string; side: "debit" | "credit"; amount: number }[]
  >([
    { accountId: "", side: "debit", amount: 0 },
    { accountId: "", side: "credit", amount: 0 },
  ]);

  useEffect(() => {
    (async () => {
      const [accountsRes, companyRes] = await Promise.all([
        fetch(`/api/business/companies/${companyId}/accounts?activeOnly=true`),
        fetch(`/api/business/companies/${companyId}`),
      ]);
      if (accountsRes.ok) {
        const accountList: Account[] = await accountsRes.json();
        setAccounts(accountList);
        const kas = findAccount(accountList, "kas");
        setCashAccountId(kas?._id ?? "");
      }
      if (companyRes.ok) setRole((await companyRes.json()).role);
    })();
  }, [companyId]);

  // Dipicu dari link notifikasi push "beban berulang jatuh tempo"
  // (?confirmRecurring=<id>) — ambil detail item lalu prefill form
  // template "Bayar Beban Operasional", USER tetap yang review & submit
  // manual (bukan auto-post), sama filosofi pengingat berulang personal.
  const confirmRecurringId = searchParams.get("confirmRecurring");
  useEffect(() => {
    if (!confirmRecurringId || !accounts) return;
    (async () => {
      const res = await fetch(
        `/api/business/companies/${companyId}/recurring-expenses/${confirmRecurringId}`
      );
      if (!res.ok) return;
      const item = await res.json();
      setTemplate("bayar-beban");
      setPickedAccountId(item.accountId);
      setCashAccountId(item.cashAccountId);
      setAmount(item.amount);
      setDescription(item.name);
    })();
  }, [confirmRecurringId, accounts, companyId]);

  const piutang = useMemo(
    () => accounts && findAccount(accounts, "piutang usaha"),
    [accounts]
  );
  const persediaan = useMemo(
    () => accounts && findAccount(accounts, "persediaan"),
    [accounts]
  );
  const modal = useMemo(
    () => accounts && findAccount(accounts, "modal pemilik"),
    [accounts]
  );
  const prive = useMemo(() => accounts && findAccount(accounts, "prive"), [accounts]);

  const cashCandidates = useMemo(
    () =>
      accounts?.filter(
        (a) =>
          a.type === "asset" &&
          ["kas", "bank"].some((n) => a.name.toLowerCase().includes(n))
      ) ?? [],
    [accounts]
  );

  const pickerAccounts = useMemo(() => {
    if (!accounts) return [];
    if (template === "penjualan-tunai") {
      return accounts.filter((a) => a.type === "revenue");
    }
    if (template === "bayar-beban") {
      return accounts.filter((a) => a.type === "expense");
    }
    return [];
  }, [accounts, template]);

  const canUseManual = role === "owner" || role === "accountant";

  async function handleTemplateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accounts) return;
    if (amount <= 0) {
      toast.error("Nominal harus lebih dari 0");
      return;
    }
    if (!cashAccountId) {
      toast.error("Pilih akun Kas/Bank");
      return;
    }

    let lines: { accountId: string; debit?: number; credit?: number }[] = [];
    let defaultDescription = "";

    if (template === "penjualan-tunai") {
      if (!pickedAccountId) return toast.error("Pilih akun pendapatan");
      lines = [
        { accountId: cashAccountId, debit: amount },
        { accountId: pickedAccountId, credit: amount },
      ];
      defaultDescription = "Penjualan tunai";
    } else if (template === "terima-piutang") {
      if (!piutang) return toast.error("Akun Piutang Usaha tidak ditemukan");
      lines = [
        { accountId: cashAccountId, debit: amount },
        { accountId: piutang._id, credit: amount },
      ];
      defaultDescription = "Terima pembayaran piutang";
    } else if (template === "beli-persediaan") {
      if (!persediaan) return toast.error("Akun Persediaan tidak ditemukan");
      lines = [
        { accountId: persediaan._id, debit: amount },
        { accountId: cashAccountId, credit: amount },
      ];
      defaultDescription = "Beli persediaan tunai";
    } else if (template === "bayar-beban") {
      if (!pickedAccountId) return toast.error("Pilih akun beban");
      lines = [
        { accountId: pickedAccountId, debit: amount },
        { accountId: cashAccountId, credit: amount },
      ];
      defaultDescription = "Bayar beban operasional";
    } else if (template === "setor-modal") {
      if (!modal) return toast.error("Akun Modal Pemilik tidak ditemukan");
      lines = [
        { accountId: cashAccountId, debit: amount },
        { accountId: modal._id, credit: amount },
      ];
      defaultDescription = "Setor modal";
    } else if (template === "prive") {
      if (!prive) return toast.error("Akun Prive tidak ditemukan");
      lines = [
        { accountId: prive._id, debit: amount },
        { accountId: cashAccountId, credit: amount },
      ];
      defaultDescription = "Prive / penarikan pemilik";
    }

    await postEntry(lines, description.trim() || defaultDescription);
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const lines = manualLines
      .filter((l) => l.accountId && l.amount > 0)
      .map((l) => ({
        accountId: l.accountId,
        debit: l.side === "debit" ? l.amount : 0,
        credit: l.side === "credit" ? l.amount : 0,
      }));
    if (lines.length < 2) {
      toast.error("Minimal 2 baris dengan akun & nominal terisi");
      return;
    }
    await postEntry(lines, description.trim() || "Jurnal manual");
  }

  async function postEntry(
    lines: { accountId: string; debit?: number; credit?: number }[],
    finalDescription: string
  ) {
    setSubmitting(true);
    const res = await fetch(`/api/business/companies/${companyId}/journal-entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: finalDescription,
        date: toISODate(date),
        lines,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Gagal mencatat transaksi");
      return;
    }
    toast.success("Transaksi tercatat");
    router.push(`/business/${companyId}/journal-entries`);
  }

  if (!accounts) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transaksi Baru</h1>
        <p className="text-sm text-muted-foreground">
          Pilih jenis transaksi — sisi debit/kredit sudah dipetakan otomatis
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Jenis Transaksi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={template} onValueChange={(v) => setTemplate(v as TemplateKey)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TEMPLATE_LABELS) as TemplateKey[])
                .filter((key) => key !== "manual" || canUseManual)
                .map((key) => (
                  <SelectItem key={key} value={key}>
                    {TEMPLATE_LABELS[key]}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          {template !== "manual" ? (
            <form onSubmit={handleTemplateSubmit} className="space-y-3">
              {pickerAccounts.length > 0 && (
                <Select value={pickedAccountId} onValueChange={setPickedAccountId}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        template === "penjualan-tunai"
                          ? "Pilih akun pendapatan"
                          : "Pilih akun beban"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {pickerAccounts.map((a) => (
                      <SelectItem key={a._id} value={a._id}>
                        {a.code} · {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={cashAccountId} onValueChange={setCashAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih akun Kas/Bank" />
                </SelectTrigger>
                <SelectContent>
                  {cashCandidates.map((a) => (
                    <SelectItem key={a._id} value={a._id}>
                      {a.code} · {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <CurrencyInput value={amount} onValueChange={setAmount} placeholder="Nominal" />
              <Input
                placeholder="Keterangan (opsional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="w-full justify-start font-normal">
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
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Menyimpan..." : "Catat Transaksi"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <CardDescription>
                Baris debit dan kredit harus total sama — validasi dilakukan server
                sebelum tersimpan
              </CardDescription>
              {manualLines.map((line, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select
                    value={line.accountId}
                    onValueChange={(v) => {
                      const next = [...manualLines];
                      next[i] = { ...next[i], accountId: v };
                      setManualLines(next);
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Akun" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a._id} value={a._id}>
                          {a.code} · {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={line.side}
                    onValueChange={(v) => {
                      const next = [...manualLines];
                      next[i] = { ...next[i], side: v as "debit" | "credit" };
                      setManualLines(next);
                    }}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="debit">Debit</SelectItem>
                      <SelectItem value="credit">Kredit</SelectItem>
                    </SelectContent>
                  </Select>
                  <CurrencyInput
                    value={line.amount}
                    onValueChange={(v) => {
                      const next = [...manualLines];
                      next[i] = { ...next[i], amount: v };
                      setManualLines(next);
                    }}
                    className="w-40"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground"
                    onClick={() =>
                      setManualLines(manualLines.filter((_, idx) => idx !== i))
                    }
                    disabled={manualLines.length <= 2}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setManualLines([...manualLines, { accountId: "", side: "debit", amount: 0 }])
                }
              >
                <Plus className="size-4" />
                Tambah Baris
              </Button>
              <Input
                placeholder="Keterangan"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Menyimpan..." : "Catat Jurnal"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewTransactionPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <NewTransactionContent />
    </Suspense>
  );
}

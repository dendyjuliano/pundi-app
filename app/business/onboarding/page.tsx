"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Briefcase, Wallet, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/currency-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { IconChip } from "@/components/icon-chip";

type Account = { _id: string; name: string };

const STEPS = ["company", "deposit"] as const;
type StepId = (typeof STEPS)[number];

const STEP_LABEL: Record<StepId, string> = {
  company: "Perusahaan",
  deposit: "Modal Awal",
};

function findAccount(accounts: Account[], namePart: string) {
  return accounts.find((a) => a.name.toLowerCase().includes(namePart.toLowerCase()));
}

export default function BusinessOnboardingPage() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const step: StepId = STEPS[stepIndex];

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");

  // Step 1 — profil perusahaan
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [industry, setIndustry] = useState("");
  const [creatingCompany, setCreatingCompany] = useState(false);

  // Step 2 — setor modal awal (opsional, biar dashboard tidak Rp0 semua
  // begitu owner pertama kali masuk — bukan wajib, karena beberapa owner
  // belum tahu nominal pastinya waktu onboarding)
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [depositAccountId, setDepositAccountId] = useState("");
  const [amount, setAmount] = useState(0);
  const [submittingDeposit, setSubmittingDeposit] = useState(false);

  async function handleCreateCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreatingCompany(true);
    const res = await fetch("/api/business/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        legalName: legalName.trim() || undefined,
        industry: industry.trim() || undefined,
      }),
    });
    setCreatingCompany(false);
    if (!res.ok) {
      toast.error("Gagal membuat perusahaan");
      return;
    }
    const company = await res.json();
    toast.success(`Perusahaan "${company.name}" dibuat`);
    localStorage.setItem("pundi-business-last-company", company._id);

    const accountsRes = await fetch(
      `/api/business/companies/${company._id}/accounts?activeOnly=true`
    );
    const accountList: Account[] = accountsRes.ok ? await accountsRes.json() : [];
    const kas = findAccount(accountList, "kas");

    setAccounts(accountList);
    setDepositAccountId(kas?._id ?? "");
    setCompanyId(company._id);
    setCompanyName(company.name);
    setStepIndex(1);
  }

  function goToDashboard() {
    router.push(`/business/${companyId}/dashboard`);
  }

  async function handleDeposit(e: React.FormEvent) {
    e.preventDefault();
    if (!accounts || !companyId) return;
    if (amount <= 0) {
      toast.error("Nominal harus lebih dari 0");
      return;
    }
    const modal = findAccount(accounts, "modal pemilik");
    if (!depositAccountId || !modal) {
      toast.error("Akun Kas/Bank atau Modal Pemilik tidak ditemukan");
      return;
    }

    setSubmittingDeposit(true);
    const res = await fetch(`/api/business/companies/${companyId}/journal-entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: "Setor modal awal",
        date: new Date().toISOString().slice(0, 10),
        lines: [
          { accountId: depositAccountId, debit: amount },
          { accountId: modal._id, credit: amount },
        ],
      }),
    });
    setSubmittingDeposit(false);
    if (!res.ok) {
      toast.error("Gagal mencatat setoran modal");
      return;
    }
    toast.success("Modal awal tercatat");
    goToDashboard();
  }

  const depositCandidates = accounts?.filter((a) =>
    ["kas", "bank"].some((n) => a.name.toLowerCase().includes(n))
  );

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-linear-to-b from-slate-100 dark:from-slate-900/40 via-background to-background px-4 py-10 overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-20 size-72 rounded-full bg-slate-600/20 blur-3xl" />
        <div className="absolute top-1/3 -right-24 size-80 rounded-full bg-slate-500/15 blur-3xl" />
        <div className="absolute -bottom-24 left-1/4 size-64 rounded-full bg-slate-400/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-linear-to-br from-slate-700 to-slate-900 shadow-sm">
              <Briefcase className="size-4 text-white" />
            </div>
            <span className="font-semibold text-lg">Pundi Business</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>
              Langkah {stepIndex + 1} dari {STEPS.length}
            </span>
            <span>{STEP_LABEL[step]}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= stepIndex ? "bg-slate-800 dark:bg-slate-200" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        <Card className="border-0 shadow-xl shadow-slate-950/10">
          <CardContent className="py-2">
            {step === "company" && (
              <div className="space-y-6">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="flex size-16 items-center justify-center rounded-3xl bg-linear-to-br from-slate-700 to-slate-900 shadow-lg shadow-slate-900/30">
                    <Briefcase className="size-8 text-white" />
                  </div>
                  <div className="space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight">
                      Selamat Datang di Pundi Business
                    </h1>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Buat perusahaan pertamamu untuk mulai mencatat transaksi
                      dan menghasilkan Laporan Laba Rugi — 18 akun standar
                      (Kas, Bank, Pendapatan, Beban, dll) langsung dibuat
                      otomatis, bisa disesuaikan nanti.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleCreateCompany} className="space-y-3">
                  <Input
                    placeholder="Nama perusahaan (mis. Toko Sejahtera)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                  />
                  <Input
                    placeholder="Nama badan usaha resmi (opsional)"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                  />
                  <Input
                    placeholder="Bidang usaha (opsional, mis. Kuliner)"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                  />
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white"
                    disabled={creatingCompany}
                  >
                    {creatingCompany ? "Membuat..." : "Buat Perusahaan"}
                    {!creatingCompany && <ArrowRight className="size-4" />}
                  </Button>
                </form>
              </div>
            )}

            {step === "deposit" && (
              <div className="space-y-6">
                <div className="flex items-start gap-3">
                  <IconChip icon={Wallet} color="emerald" />
                  <div>
                    <h2 className="text-lg font-bold tracking-tight">
                      &ldquo;{companyName}&rdquo; siap dipakai
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Langkah terakhir (opsional) — catat modal awal biar
                      saldo di Dashboard tidak Rp0 semua. Bisa dilewati dan
                      diisi nanti lewat Transaksi Baru.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleDeposit} className="space-y-3">
                  <Select value={depositAccountId} onValueChange={setDepositAccountId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih akun Kas atau Bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {depositCandidates?.map((a) => (
                        <SelectItem key={a._id} value={a._id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <CurrencyInput value={amount} onValueChange={setAmount} />
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white"
                    disabled={submittingDeposit}
                  >
                    {submittingDeposit ? "Menyimpan..." : "Setor & Buka Dashboard"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={goToDashboard}
                  >
                    Lewati dulu
                  </Button>
                </form>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

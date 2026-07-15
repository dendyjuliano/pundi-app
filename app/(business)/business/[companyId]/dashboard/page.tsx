"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { TrendingUp, TrendingDown, PlusCircle, AlertTriangle, Info, Repeat, HeartPulse } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

type IncomeStatement = {
  netIncome: number;
  operatingRevenue: number;
  operatingExpense: number;
  byAccount: {
    reportSection: string;
    name: string;
    amount: number;
  }[];
};

type SubscriptionStatus = "trial" | "active" | "pending_verification" | "overdue";

type Verdict = "sehat" | "perhatian" | "kritis";
type Ratios = {
  netProfitMargin: number | null;
  verdicts: { netProfitMargin: Verdict };
};

const VERDICT_BADGE: Record<Verdict, { label: string; className: string }> = {
  sehat: { label: "Sehat", className: "bg-emerald-100 text-emerald-800" },
  perhatian: { label: "Perlu Perhatian", className: "bg-amber-100 text-amber-800" },
  kritis: { label: "Kritis", className: "bg-red-100 text-red-800" },
};

type RecurringExpense = {
  _id: string;
  name: string;
  amount: number;
  dayOfMonth: number;
  frequency: "monthly" | "yearly";
  month?: number;
  active: boolean;
};

const MONTH_LABEL = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

function isDueToday(item: RecurringExpense, today: Date) {
  if (item.dayOfMonth !== today.getDate()) return false;
  return item.frequency === "monthly" || item.month === today.getMonth() + 1;
}

export default function BusinessDashboardPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const [report, setReport] = useState<IncomeStatement | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [recurring, setRecurring] = useState<RecurringExpense[] | null>(null);
  const [ratios, setRatios] = useState<Ratios | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(
        `/api/business/companies/${companyId}/reports/income-statement`
      );
      if (res.ok) setReport(await res.json());
    })();
  }, [companyId]);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/business/companies/${companyId}/subscription`);
      if (res.ok) setSubscriptionStatus((await res.json()).status);
    })();
  }, [companyId]);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/business/companies/${companyId}/recurring-expenses`);
      if (res.ok) setRecurring(await res.json());
    })();
  }, [companyId]);

  useEffect(() => {
    (async () => {
      const res = await fetch(
        `/api/business/companies/${companyId}/reports/financial-ratios`
      );
      if (res.ok) setRatios(await res.json());
    })();
  }, [companyId]);

  if (!report) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const topExpenses = report.byAccount
    .filter((a) => a.reportSection === "operating-expense" || a.reportSection === "cogs")
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  const positive = report.netIncome >= 0;

  const today = new Date();
  const activeRecurring = (recurring ?? [])
    .filter((r) => r.active)
    .sort((a, b) => a.dayOfMonth - b.dayOfMonth);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <Button asChild>
          <Link href={`/business/${companyId}/transactions/new`}>
            <PlusCircle className="size-4" />
            Transaksi Baru
          </Link>
        </Button>
      </div>

      {subscriptionStatus === "overdue" && (
        <Link
          href={`/business/${companyId}/settings`}
          className="flex items-center gap-3 rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-2.5 hover:bg-amber-100"
        >
          <AlertTriangle className="size-4 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">
              Langganan sudah jatuh tempo
            </p>
            <p className="text-xs text-amber-700">
              Klik untuk lihat instruksi pembayaran di Pengaturan
            </p>
          </div>
        </Link>
      )}
      {subscriptionStatus === "pending_verification" && (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-blue-300 bg-blue-50 px-4 py-2.5">
          <Info className="size-4 text-blue-600 shrink-0" />
          <p className="text-sm font-medium text-blue-800">
            Menunggu verifikasi pembayaran dari tim kami
          </p>
        </div>
      )}

      <Card
        className={
          positive
            ? "bg-linear-to-br from-emerald-500 to-teal-600 text-white border-0"
            : "bg-linear-to-br from-rose-500 to-red-600 text-white border-0"
        }
      >
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/80">Laba Bersih (tahun fiskal berjalan)</p>
            <p className="text-3xl font-bold">{formatRupiah(report.netIncome)}</p>
          </div>
          {positive ? (
            <TrendingUp className="size-10 text-white/70" />
          ) : (
            <TrendingDown className="size-10 text-white/70" />
          )}
        </CardContent>
      </Card>

      {ratios && (
        <Link href={`/business/${companyId}/reports/financial-ratios`}>
          <Card className="hover:bg-muted/40 transition-colors">
            <CardContent className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                  <HeartPulse className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">Kesehatan Keuangan</p>
                  <p className="text-xs text-muted-foreground">
                    Margin Laba Bersih {ratios.netProfitMargin === null ? "—" : `${(ratios.netProfitMargin * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`}
                  </p>
                </div>
              </div>
              <Badge className={`${VERDICT_BADGE[ratios.verdicts.netProfitMargin].className} shrink-0`}>
                {VERDICT_BADGE[ratios.verdicts.netProfitMargin].label}
              </Badge>
            </CardContent>
          </Card>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Pendapatan Operasional</p>
            <p className="text-lg font-semibold">{formatRupiah(report.operatingRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Beban Operasional</p>
            <p className="text-lg font-semibold">{formatRupiah(report.operatingExpense)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Beban Terbesar</CardTitle>
          <CardDescription>3 akun beban dengan nominal tertinggi periode ini</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {topExpenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada beban tercatat</p>
          ) : (
            topExpenses.map((a) => (
              <div key={a.name} className="flex items-center justify-between text-sm">
                <span>{a.name}</span>
                <span className="font-medium">{formatRupiah(a.amount)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Beban Berulang Aktif</CardTitle>
            <CardDescription>Tagihan rutin yang perlu dicatat tiap jatuh tempo</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/business/${companyId}/settings`}>Kelola</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {activeRecurring.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada beban berulang aktif</p>
          ) : (
            activeRecurring.map((item) => (
              <div
                key={item._id}
                className="flex items-center justify-between gap-3 rounded-xl border bg-muted/30 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Repeat className="size-3.5 text-amber-600 shrink-0" />
                    <span className="text-sm font-medium truncate">{item.name}</span>
                    {isDueToday(item, today) && (
                      <Badge className="bg-amber-100 text-amber-800 text-[10px]">
                        Jatuh tempo hari ini
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.frequency === "yearly"
                      ? `Tiap ${MONTH_LABEL[(item.month ?? 1) - 1]}, tgl ${item.dayOfMonth}`
                      : `Tiap tanggal ${item.dayOfMonth}`}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums shrink-0">
                  {formatRupiah(item.amount)}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

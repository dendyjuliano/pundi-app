"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { TrendingUp, TrendingDown, PlusCircle, AlertTriangle, Info } from "lucide-react";
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

export default function BusinessDashboardPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const [report, setReport] = useState<IncomeStatement | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);

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
    </div>
  );
}

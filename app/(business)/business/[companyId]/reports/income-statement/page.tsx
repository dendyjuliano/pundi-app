"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { id as idLocale } from "date-fns/locale";
import { CalendarIcon, Printer, TrendingUp, BarChart3 } from "lucide-react";
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
  ResponsiveContainer,
  BarChart,
} from "recharts";
import { formatRupiah, formatCompactRupiah as formatCompact } from "@/lib/format";
import { CATEGORICAL, CHROME } from "@/lib/chartColors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { IconChip } from "@/components/icon-chip";

type ByAccount = {
  reportSection:
    | "operating-revenue"
    | "cogs"
    | "operating-expense"
    | "non-operating-revenue"
    | "non-operating-expense";
  accountId: string;
  code: string;
  name: string;
  costBehavior?: string;
  amount: number;
};

type Report = {
  from: string;
  to: string;
  operatingRevenue: number;
  cogs: number;
  grossProfit: number;
  operatingExpense: number;
  operatingProfit: number;
  nonOperatingRevenue: number;
  nonOperatingExpense: number;
  netIncome: number;
  byAccount: ByAccount[];
};

type MonthlyPoint = { month: string; label: string; revenue: number; expense: number; netIncome: number };

// Beban non-blue (aqua, CATEGORICAL[1]) punya kontras cuma 2.74:1 di light
// mode — di bawah target 3:1. Bukan alasan buat ganti warna (masih PASS di
// dark mode & CVD), tapi WAJIB ada mitigasi non-warna: value langsung di
// tiap bar (LabelList) + legend, jangan andalkan warna doang.
const REVENUE_COLOR = CATEGORICAL[0];
const EXPENSE_COLOR = CATEGORICAL[1];
// Komposisi Beban pakai sequential single-hue (job: compare magnitude,
// low->high) — bukan part-to-whole/pie, sesuai panduan skill dataviz.
// Kebetulan sama dengan CATEGORICAL[0], tapi dipakai di chart terpisah
// jadi tidak bentrok makna kategorikal-nya Chart 1.
const SEQUENTIAL_EXPENSE = CATEGORICAL[0];

function toISODate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function Line({
  label,
  value,
  bold,
  indent,
}: {
  label: string;
  value: number;
  bold?: boolean;
  indent?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-2 ${bold ? "font-semibold border-t" : ""} ${indent ? "pl-4 text-muted-foreground" : ""}`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{formatRupiah(value)}</span>
    </div>
  );
}

export default function IncomeStatementPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [monthly, setMonthly] = useState<MonthlyPoint[] | null>(null);
  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  async function loadReport(fromDate?: Date, toDate?: Date) {
    const params = new URLSearchParams();
    if (fromDate) params.set("from", toISODate(fromDate));
    if (toDate) params.set("to", toISODate(toDate));
    const [reportRes, monthlyRes] = await Promise.all([
      fetch(`/api/business/companies/${companyId}/reports/income-statement?${params}`),
      fetch(`/api/business/companies/${companyId}/reports/income-statement/monthly?${params}`),
    ]);
    if (reportRes.ok) setReport(await reportRes.json());
    if (monthlyRes.ok) setMonthly((await monthlyRes.json()).months);
  }

  useEffect(() => {
    (async () => {
      await loadReport();
    })();
  }, [companyId]);

  if (!report) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Ranked low->high jadi tinggi->rendah buat bar horizontal (sequential,
  // bukan part-to-whole/pie — lihat catatan SEQUENTIAL_EXPENSE). Ekor
  // dilipat ke "Lainnya" biar tidak lebih dari 8 bar (token ceiling skill
  // dataviz, walau ini sequential bukan categorical, tetap jaga keterbacaan).
  const expenseAccounts = report.byAccount
    .filter((a) => a.reportSection === "cogs" || a.reportSection === "operating-expense" || a.reportSection === "non-operating-expense")
    .filter((a) => a.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const TOP_N = 8;
  const topExpenses = expenseAccounts.slice(0, TOP_N);
  const otherTotal = expenseAccounts.slice(TOP_N).reduce((sum, a) => sum + a.amount, 0);
  const expenseComposition = [
    ...topExpenses.map((a) => ({ name: a.name, amount: a.amount })),
    ...(otherTotal > 0 ? [{ name: "Lainnya", amount: otherTotal }] : []),
  ].sort((a, b) => a.amount - b.amount); // ascending biar bar terbesar di atas (chart vertikal-layout Recharts render dari bawah)

  return (
    <div className="space-y-6">
      <style>{`@media print { .no-print { display: none !important; } }`}</style>
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Laporan Laba Rugi</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(report.from).toLocaleDateString("id-ID")} — {new Date(report.to).toLocaleDateString("id-ID")}
          </p>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="size-4" />
          Cetak
        </Button>
      </div>

      <div className="flex items-center gap-2 no-print">
        <Popover open={fromOpen} onOpenChange={setFromOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <CalendarIcon className="size-4" />
              {from ? from.toLocaleDateString("id-ID") : "Dari tanggal"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              locale={idLocale}
              selected={from}
              onSelect={(d) => {
                setFrom(d);
                setFromOpen(false);
                if (d) loadReport(d, to);
              }}
            />
          </PopoverContent>
        </Popover>
        <Popover open={toOpen} onOpenChange={setToOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <CalendarIcon className="size-4" />
              {to ? to.toLocaleDateString("id-ID") : "Sampai tanggal"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              locale={idLocale}
              selected={to}
              onSelect={(d) => {
                setTo(d);
                setToOpen(false);
                if (d) loadReport(from, d);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Laba Rugi</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <Line label="Pendapatan Operasional" value={report.operatingRevenue} />
          <Line label="Beban Pokok Penjualan (COGS)" value={report.cogs} indent />
          <Line label="Laba Kotor" value={report.grossProfit} bold />
          <Line label="Beban Operasional" value={report.operatingExpense} indent />
          <Line label="Laba Usaha" value={report.operatingProfit} bold />
          <Line label="Pendapatan Non-Operasional" value={report.nonOperatingRevenue} indent />
          <Line label="Beban Non-Operasional" value={report.nonOperatingExpense} indent />
          <Line label="Laba Bersih" value={report.netIncome} bold />
        </CardContent>
      </Card>

      <Card className="no-print">
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <IconChip icon={TrendingUp} color="blue" size="sm" />
          <CardTitle className="text-base">Tren Pendapatan vs Beban Bulanan</CardTitle>
        </CardHeader>
        <CardContent>
          {!monthly || monthly.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada transaksi di periode ini.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={monthly}>
                <CartesianGrid stroke={CHROME.gridline} vertical={false} />
                <XAxis
                  dataKey="label"
                  interval={0}
                  tick={{ fill: CHROME.mutedInk, fontSize: 12 }}
                  axisLine={{ stroke: CHROME.baseline }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={formatCompact}
                  tick={{ fill: CHROME.mutedInk, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v) => formatRupiah(Number(v))}
                  contentStyle={{ background: CHROME.surface }}
                  labelStyle={{ color: CHROME.primaryInk }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="revenue" name="Pendapatan" fill={REVENUE_COLOR} radius={[4, 4, 0, 0]} maxBarSize={24} />
                <Bar dataKey="expense" name="Beban" fill={EXPENSE_COLOR} radius={[4, 4, 0, 0]} maxBarSize={24}>
                  {/* Kontras aqua vs surface cuma 2.74:1 di light mode (di
                      bawah target 3:1) — label nilai langsung di tiap bar
                      jadi mitigasi wajib, bukan cuma andalkan warna fill. */}
                  <LabelList
                    dataKey="expense"
                    position="top"
                    formatter={(v) => formatCompact(Number(v))}
                    fill={CHROME.secondaryInk}
                    fontSize={11}
                  />
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="no-print">
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <IconChip icon={BarChart3} color="violet" size="sm" />
          <CardTitle className="text-base">Komposisi Beban</CardTitle>
        </CardHeader>
        <CardContent>
          {expenseComposition.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada transaksi beban di periode ini.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(160, expenseComposition.length * 36)}>
              <BarChart data={expenseComposition} layout="vertical" margin={{ right: 56 }}>
                <CartesianGrid stroke={CHROME.gridline} horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={formatCompact}
                  tick={{ fill: CHROME.mutedInk, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={140}
                  tick={{ fill: CHROME.secondaryInk, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v) => formatRupiah(Number(v))}
                  contentStyle={{ background: CHROME.surface }}
                  labelStyle={{ color: CHROME.primaryInk }}
                />
                <Bar dataKey="amount" fill={SEQUENTIAL_EXPENSE} radius={[0, 4, 4, 0]} maxBarSize={22}>
                  <LabelList
                    dataKey="amount"
                    position="right"
                    formatter={(v) => formatCompact(Number(v))}
                    fill={CHROME.secondaryInk}
                    fontSize={11}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

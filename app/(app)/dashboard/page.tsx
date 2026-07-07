"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { formatRupiah } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { GradientBlobs } from "@/components/gradient-blobs";
import { RadialProgress } from "@/components/radial-progress";
import { IconChip } from "@/components/icon-chip";
import { AddExpenseDialog } from "@/components/add-expense-dialog";
import { ConfirmInstallmentDialog } from "@/components/confirm-installment-dialog";
import { SavingsGoalNudgeBanner } from "@/components/savings-goal-nudge-banner";
import { FriendRequestNudgeBanner } from "@/components/friend-request-nudge-banner";
import {
  Receipt,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowDownToLine,
  ArrowUpFromLine,
  Sun,
  CalendarRange,
  CalendarDays,
  UtensilsCrossed,
  ShoppingBag,
  ArrowRight,
  History,
  Users,
  Landmark,
  CreditCard,
  HandCoins,
} from "lucide-react";

type PeriodData = {
  makan: number;
  lainLain: number;
  makanTarget?: number;
  makanBudget?: number;
  lainLainTarget?: number;
  lainLainBudget?: number;
  totalActual: number;
  totalTarget: number;
  melenceng: boolean;
};

type WeekData = PeriodData & {
  number: number;
  startDay: number;
  endDay: number;
};

type MonthlySummary = {
  month: string;
  isCurrentMonth: boolean;
  totalIncome: number;
  totalAllocation: number;
  totalBersih: number;
  isBudgetSaved: boolean;
  today: PeriodData | null;
  weeks: WeekData[];
  insights: {
    category: "makan" | "lain-lain";
    direction: "up" | "down";
    percent: number;
    message: string;
  }[];
  monthSummary: {
    makanActual: number;
    lainLainActual: number;
    makanBudget: number;
    lainLainBudget: number;
    totalActual: number;
    totalTarget: number;
    melenceng: boolean;
  };
  investment: { planned: number; realized: number } | null;
  recentExpenses: {
    id: string;
    date: string;
    category: "makan" | "lain-lain";
    amount: number;
    note?: string;
  }[];
};

type YearlySummary = {
  year: number;
  totalIncome: number;
  totalAllocation: number;
  totalBersih: number;
  totalActual: number;
  totalTarget: number;
  melenceng: boolean;
  months: {
    month: string;
    label: string;
    makanActual: number;
    lainLainActual: number;
    makanBudget: number;
    lainLainBudget: number;
    totalActual: number;
    totalTarget: number;
    melenceng: boolean;
  }[];
};

type MemberOption = {
  id: string;
  name: string;
  role: "admin" | "member";
};

function progressValue(actual: number, budget: number) {
  if (budget <= 0) return actual > 0 ? 100 : 0;
  return Math.min(100, Math.max(0, (actual / budget) * 100));
}

function SummaryRow({
  label,
  actual,
  budget,
}: {
  label: string;
  actual: number;
  budget: number;
}) {
  const sisa = budget - actual;
  const over = sisa < 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {formatRupiah(actual)}{" "}
          <span className="text-muted-foreground font-normal">
            / {formatRupiah(budget)}
          </span>
        </span>
      </div>
      <Progress
        value={progressValue(actual, budget)}
        className={over ? "[&>div]:bg-destructive" : "[&>div]:bg-emerald-500"}
      />
      <p className={over ? "text-xs text-destructive" : "text-xs text-emerald-600"}>
        sisa {formatRupiah(sisa)}
      </p>
    </div>
  );
}

const ACCENT_STYLES = {
  amber: {
    border: "border-t-amber-400",
    badge: "bg-amber-100 text-amber-700",
  },
  blue: {
    border: "border-t-blue-400",
    badge: "bg-blue-100 text-blue-700",
  },
  violet: {
    border: "border-t-violet-400",
    badge: "bg-violet-100 text-violet-700",
  },
} as const;

function PeriodCard({
  title,
  subtitle,
  icon,
  accent,
  makan,
  lainLain,
  total,
}: {
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: keyof typeof ACCENT_STYLES;
  makan: { actual: number; target: number };
  lainLain: { actual: number; target: number };
  total: { actual: number; target: number; melenceng: boolean };
}) {
  const styles = ACCENT_STYLES[accent];
  const pct = Math.round(progressValue(total.actual, total.target));
  return (
    <Card className={`border-t-4 ${styles.border} pt-0`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pt-5">
        <div className="flex items-center gap-3">
          <IconChip icon={icon} color={accent} />
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <Badge
          variant="secondary"
          className={
            pct >= 100 ? "bg-destructive/10 text-destructive" : styles.badge
          }
        >
          {pct}%
        </Badge>
      </CardHeader>
      <CardContent className="space-y-5">
        <SummaryRow label="Makan" actual={makan.actual} budget={makan.target} />
        <SummaryRow
          label="Lain-lain"
          actual={lainLain.actual}
          budget={lainLain.target}
        />
        <div className="pt-3 border-t space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <UtensilsCrossed className="size-3.5" />
              Total
            </span>
            <span className="font-medium">
              {formatRupiah(total.actual)}{" "}
              <span className="text-muted-foreground font-normal">
                / {formatRupiah(total.target)}
              </span>
            </span>
          </div>
          <Badge
            variant={total.melenceng ? "destructive" : "default"}
            className={
              total.melenceng ? "" : "bg-emerald-600 hover:bg-emerald-600"
            }
          >
            {total.melenceng ? (
              <TrendingDown className="size-3" />
            ) : (
              <TrendingUp className="size-3" />
            )}
            {total.melenceng ? "Melenceng" : "Sesuai target"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function HeroCard({
  label,
  totalActual,
  totalTarget,
  totalIncome,
  totalAllocation,
  spentPct,
  onExpenseSaved,
  totalUtang,
  activeInstallmentCount,
  totalPiutang,
}: {
  label: string;
  totalActual: number;
  totalTarget: number;
  totalIncome: number;
  totalAllocation: number;
  spentPct: number;
  onExpenseSaved: () => void;
  totalUtang: number;
  activeInstallmentCount: number;
  totalPiutang: number;
}) {
  // Berapa yang BENERAN masih bisa dibelanjakan sisa periode ini — beda
  // dari "Total Bersih" (Income - Alokasi) yang cuma angka rencana di
  // awal bulan dan tidak berkurang seiring pengeluaran beneran tercatat.
  // Ini yang jadi angka headline karena itu yang paling langsung
  // menjawab "duit saya masih sisa berapa".
  const sisa = totalTarget - totalActual;
  const over = sisa < 0;

  return (
    <Card className="relative overflow-hidden border-0 bg-linear-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white">
      <GradientBlobs className="opacity-40" />
      <CardContent className="relative flex flex-col sm:flex-row sm:items-center gap-6">
        <div className="flex-1 space-y-6">
          <div>
            <p className="text-sm text-emerald-50/90">Sisa {label}</p>
            <p
              className={`mt-1 text-4xl font-bold tracking-tight ${
                over ? "text-red-200" : ""
              }`}
            >
              {formatRupiah(Math.abs(sisa))}
            </p>
            {over && (
              <p className="mt-1 text-xs font-medium text-red-200">
                Melebihi budget bulan ini
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-6 border-t border-white/15 pt-4">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-white/15">
                <ArrowDownToLine className="size-4" />
              </div>
              <div>
                <p className="text-xs text-emerald-50/80">Income</p>
                <p className="text-sm font-semibold">
                  {formatRupiah(totalIncome)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-white/15">
                <ArrowUpFromLine className="size-4" />
              </div>
              <div>
                <p className="text-xs text-emerald-50/80">Alokasi</p>
                <p className="text-sm font-semibold">
                  {formatRupiah(totalAllocation)}
                </p>
              </div>
            </div>
            {activeInstallmentCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-full bg-white/15">
                  <CreditCard className="size-4" />
                </div>
                <div>
                  <p className="text-xs text-emerald-50/80">
                    Utang Aktif ({activeInstallmentCount})
                  </p>
                  <p className="text-sm font-semibold">
                    {formatRupiah(totalUtang)}
                  </p>
                </div>
              </div>
            )}
            {totalPiutang > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-full bg-white/15">
                  <HandCoins className="size-4" />
                </div>
                <div>
                  <p className="text-xs text-emerald-50/80">Piutang Aktif</p>
                  <p className="text-sm font-semibold">
                    {formatRupiah(totalPiutang)}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <AddExpenseDialog
              trigger={
                <Button
                  size="sm"
                  className="bg-white text-emerald-700 hover:bg-white/90"
                >
                  <Receipt className="size-4" />
                  Input Pengeluaran
                </Button>
              }
              onSaved={onExpenseSaved}
            />
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <Link href="/budget">
                <Wallet className="size-4" />
                Atur Budget
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex sm:flex-col items-center justify-center gap-2 shrink-0 self-center">
          <RadialProgress
            value={spentPct}
            size={104}
            strokeWidth={9}
            trackClassName="text-white/20"
            progressClassName={over ? "text-red-300" : "text-white"}
          >
            <div className="text-center">
              <p className="text-xl font-bold leading-none">{spentPct}%</p>
              <p className="text-[10px] text-emerald-50/80 mt-1">terpakai</p>
            </div>
          </RadialProgress>
        </div>
      </CardContent>
    </Card>
  );
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

function relativeDay(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  const diffDays = Math.round(
    (new Date(today.toDateString()).getTime() -
      new Date(date.toDateString()).getTime()) /
      86400000
  );
  if (diffDays === 0) return "Hari ini";
  if (diffDays === 1) return "Kemarin";
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 4 + i);

function MonthlyDashboard({
  summary,
  userName,
  viewingOther,
  onExpenseSaved,
  totalUtang,
  activeInstallmentCount,
  totalPiutang,
}: {
  summary: MonthlySummary;
  userName: string;
  viewingOther: boolean;
  onExpenseSaved: () => void;
  totalUtang: number;
  activeInstallmentCount: number;
  totalPiutang: number;
}) {
  const spentPct = Math.round(
    progressValue(summary.monthSummary.totalActual, summary.monthSummary.totalTarget)
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground -mt-2">
        {viewingOther
          ? `Menampilkan dashboard ${userName}`
          : summary.isCurrentMonth
            ? `${greeting()}, ${userName.split(" ")[0]} 👋`
            : "Menampilkan data bulan lampau"}
      </p>

      <HeroCard
        label={formatMonthLabel(summary.month)}
        totalActual={summary.monthSummary.totalActual}
        totalTarget={summary.monthSummary.totalTarget}
        totalIncome={summary.totalIncome}
        totalAllocation={summary.totalAllocation}
        spentPct={spentPct}
        onExpenseSaved={onExpenseSaved}
        totalUtang={totalUtang}
        activeInstallmentCount={activeInstallmentCount}
        totalPiutang={totalPiutang}
      />

      {!summary.isBudgetSaved && (
        <Card className="border-0 bg-amber-50 ring-1 ring-amber-200">
          <CardContent className="text-sm text-amber-800">
            Budget bulan ini belum disimpan (masih draft prefill). Buka{" "}
            <Link href="/budget" className="underline font-medium">
              halaman Budget
            </Link>{" "}
            untuk konfirmasi.
          </CardContent>
        </Card>
      )}

      <div
        className={`grid grid-cols-1 gap-4 ${
          summary.today ? "md:grid-cols-2" : ""
        }`}
      >
        {summary.today && (
          <PeriodCard
            title="Hari Ini"
            icon={Sun}
            accent="amber"
            makan={{ actual: summary.today.makan, target: summary.today.makanTarget ?? 0 }}
            lainLain={{
              actual: summary.today.lainLain,
              target: summary.today.lainLainTarget ?? 0,
            }}
            total={{
              actual: summary.today.totalActual,
              target: summary.today.totalTarget,
              melenceng: summary.today.melenceng,
            }}
          />
        )}

        <PeriodCard
          title={formatMonthLabel(summary.month)}
          icon={CalendarDays}
          accent="violet"
          makan={{
            actual: summary.monthSummary.makanActual,
            target: summary.monthSummary.makanBudget,
          }}
          lainLain={{
            actual: summary.monthSummary.lainLainActual,
            target: summary.monthSummary.lainLainBudget,
          }}
          total={{
            actual: summary.monthSummary.totalActual,
            target: summary.monthSummary.totalTarget,
            melenceng: summary.monthSummary.melenceng,
          }}
        />
      </div>

      {/* Investasi bulan ini — cuma muncul kalau ada kategori bertipe
          invest, konsisten dengan Budget & Reports. */}
      {summary.investment && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3">
              <IconChip icon={Landmark} color="violet" size="sm" />
              <CardTitle className="text-base">Investasi Bulan Ini</CardTitle>
            </div>
            <Badge
              variant="secondary"
              className={
                summary.investment.realized >= summary.investment.planned
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }
            >
              {summary.investment.realized >= summary.investment.planned
                ? "Sesuai rencana"
                : `Kurang ${formatRupiah(
                    summary.investment.planned - summary.investment.realized
                  )}`}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Realisasi / Rencana</span>
              <span className="font-medium">
                {formatRupiah(summary.investment.realized)}{" "}
                <span className="text-muted-foreground font-normal">
                  / {formatRupiah(summary.investment.planned)}
                </span>
              </span>
            </div>
            <Progress
              value={
                summary.investment.planned > 0
                  ? Math.min(
                      100,
                      (summary.investment.realized /
                        summary.investment.planned) *
                        100
                    )
                  : summary.investment.realized > 0
                    ? 100
                    : 0
              }
              className={
                summary.investment.realized >= summary.investment.planned
                  ? "[&>div]:bg-emerald-500"
                  : "[&>div]:bg-amber-500"
              }
            />
          </CardContent>
        </Card>
      )}

      {/* Insight otomatis — bandingin pengeluaran bulan ini vs bulan lalu
          per kategori, cuma muncul kalau ada perubahan yang cukup besar
          (lihat INSIGHT_THRESHOLD_PERCENT di lib/dashboardSummary.ts) */}
      {summary.insights.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 space-y-0">
            <IconChip icon={TrendingUp} color="blue" size="sm" />
            <CardTitle className="text-base">Insight Bulan Ini</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.insights.map((insight) => (
              <div
                key={insight.category}
                className="flex items-center gap-3 text-sm"
              >
                {insight.direction === "up" ? (
                  <TrendingUp className="size-4 text-destructive shrink-0" />
                ) : (
                  <TrendingDown className="size-4 text-emerald-600 shrink-0" />
                )}
                <span>{insight.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Weekly breakdown — all weeks in the selected month */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <CalendarRange className="size-4" />
          Rincian Mingguan
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {summary.weeks.map((week) => (
            <PeriodCard
              key={week.number}
              title={`Minggu ke-${week.number}`}
              subtitle={`${week.startDay}-${week.endDay}`}
              icon={CalendarRange}
              accent="blue"
              makan={{ actual: week.makan, target: week.makanBudget ?? 0 }}
              lainLain={{
                actual: week.lainLain,
                target: week.lainLainBudget ?? 0,
              }}
              total={{
                actual: week.totalActual,
                target: week.totalTarget,
                melenceng: week.melenceng,
              }}
            />
          ))}
        </div>
      </div>

      {/* Recent transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <IconChip icon={History} color="emerald" size="sm" />
            <CardTitle className="text-base">Pengeluaran Terakhir</CardTitle>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
            <Link href="/expenses">
              Lihat Semua
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {summary.recentExpenses.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              Belum ada pengeluaran bulan ini.
            </p>
          ) : (
            <ul className="divide-y">
              {summary.recentExpenses.map((exp) => (
                <li
                  key={exp.id}
                  className="px-6 py-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <IconChip
                      icon={exp.category === "makan" ? UtensilsCrossed : ShoppingBag}
                      color={exp.category === "makan" ? "emerald" : "amber"}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {exp.category === "makan" ? "Makan" : exp.note || "Lain-lain"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {relativeDay(exp.date)}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold shrink-0">
                    {formatRupiah(exp.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function YearlyDashboard({
  summary,
  onExpenseSaved,
  totalUtang,
  activeInstallmentCount,
  totalPiutang,
}: {
  summary: YearlySummary;
  onExpenseSaved: () => void;
  totalUtang: number;
  activeInstallmentCount: number;
  totalPiutang: number;
}) {
  const spentPct = Math.round(
    progressValue(summary.totalActual, summary.totalTarget)
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground -mt-2">
        Ringkasan setahun penuh, {summary.year}
      </p>

      <HeroCard
        label={String(summary.year)}
        totalActual={summary.totalActual}
        totalTarget={summary.totalTarget}
        totalIncome={summary.totalIncome}
        totalAllocation={summary.totalAllocation}
        spentPct={spentPct}
        onExpenseSaved={onExpenseSaved}
        totalUtang={totalUtang}
        activeInstallmentCount={activeInstallmentCount}
        totalPiutang={totalPiutang}
      />

      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <IconChip icon={CalendarDays} color="violet" size="sm" />
          <CardTitle className="text-base">
            Rincian per Bulan — {summary.year}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {summary.months.map((m) => {
              const makanOver = m.makanActual > m.makanBudget;
              const lainLainOver = m.lainLainActual > m.lainLainBudget;
              const makanPct = Math.round(
                progressValue(m.makanActual, m.makanBudget)
              );
              const lainLainPct = Math.round(
                progressValue(m.lainLainActual, m.lainLainBudget)
              );
              return (
                <li key={m.month} className="px-6 py-5">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className="text-sm font-medium">
                      {formatMonthLabel(m.month)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {formatRupiah(m.totalActual)}{" "}
                        <span className="text-xs">
                          / {formatRupiah(m.totalTarget)}
                        </span>
                      </span>
                      <Badge
                        variant={m.melenceng ? "destructive" : "default"}
                        className={
                          m.melenceng
                            ? "text-[10px]"
                            : "text-[10px] bg-emerald-600 hover:bg-emerald-600"
                        }
                      >
                        {m.melenceng ? "Melenceng" : "Sesuai"}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <UtensilsCrossed className="size-3" />
                          Makan
                        </span>
                        <span
                          className={
                            makanOver
                              ? "text-destructive font-medium"
                              : "text-muted-foreground"
                          }
                        >
                          {formatRupiah(m.makanActual)} /{" "}
                          {formatRupiah(m.makanBudget)}
                        </span>
                      </div>
                      <Progress
                        value={makanPct}
                        className={
                          makanOver
                            ? "[&>div]:bg-destructive"
                            : "[&>div]:bg-emerald-500"
                        }
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <ShoppingBag className="size-3" />
                          Lain-lain
                        </span>
                        <span
                          className={
                            lainLainOver
                              ? "text-destructive font-medium"
                              : "text-muted-foreground"
                          }
                        >
                          {formatRupiah(m.lainLainActual)} /{" "}
                          {formatRupiah(m.lainLainBudget)}
                        </span>
                      </div>
                      <Progress
                        value={lainLainPct}
                        className={
                          lainLainOver
                            ? "[&>div]:bg-destructive"
                            : "[&>div]:bg-emerald-500"
                        }
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAdmin = session?.user?.role === "admin";
  const currentUserId = session?.user?.id ?? "";

  const [mode, setMode] = useState<"monthly" | "yearly">("monthly");
  const [month, setMonth] = useState(currentMonth());
  const [year, setYear] = useState(CURRENT_YEAR);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState(
    searchParams.get("userId") || ""
  );
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(
    null
  );
  const [yearlySummary, setYearlySummary] = useState<YearlySummary | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [totalUtang, setTotalUtang] = useState(0);
  const [activeInstallmentCount, setActiveInstallmentCount] = useState(0);
  const [totalPiutang, setTotalPiutang] = useState(0);

  // Dipicu dari link notifikasi push "pengeluaran berulang jatuh tempo"
  // (?confirmRecurring=<id>) — ambil detail item itu lalu buka
  // AddExpenseDialog dalam mode controlled, ter-prefill, biar user tinggal
  // review/edit sebelum benar-benar mencatatnya (bukan auto-create).
  const confirmRecurringId = searchParams.get("confirmRecurring");
  const [recurringPrefill, setRecurringPrefill] = useState<{
    id: string;
    amount: number;
    note: string;
  } | null>(null);

  useEffect(() => {
    if (!confirmRecurringId) return;
    (async () => {
      const res = await fetch(`/api/recurring-expenses/${confirmRecurringId}`);
      if (res.ok) {
        const data = await res.json();
        setRecurringPrefill({
          id: confirmRecurringId,
          amount: data.amount,
          note: data.name,
        });
      }
    })();
  }, [confirmRecurringId]);

  // Sama pola persis confirmRecurringId di atas, tapi buat cicilan —
  // dipicu dari link notifikasi push "cicilan jatuh tempo"
  // (?confirmInstallment=<id>).
  const confirmInstallmentId = searchParams.get("confirmInstallment");
  const [installmentPrefill, setInstallmentPrefill] = useState<{
    id: string;
    name: string;
    amount: number;
  } | null>(null);

  useEffect(() => {
    if (!confirmInstallmentId) return;
    (async () => {
      const res = await fetch(`/api/installments/${confirmInstallmentId}`);
      if (res.ok) {
        const data = await res.json();
        setInstallmentPrefill({
          id: confirmInstallmentId,
          name: data.name,
          amount: data.monthlyInstallment,
        });
      }
    })();
  }, [confirmInstallmentId]);

  // Admin only: load the member list once session is ready, for the "lihat
  // dashboard anggota lain" selector.
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const res = await fetch("/api/admin/members");
      if (res.ok) setMembers(await res.json());
    })();
  }, [isAdmin]);

  const effectiveUserId = selectedUserId || currentUserId;

  // Total utang aktif — snapshot saat ini (bukan spesifik bulan/tahun yang
  // lagi dipilih), jadi di-fetch terpisah dari `refresh` di bawah dan tidak
  // perlu di-refetch tiap ganti bulan/tahun, cuma tiap ganti anggota yang
  // dilihat (admin).
  useEffect(() => {
    if (!effectiveUserId) return;
    (async () => {
      const res = await fetch(`/api/installments?userId=${effectiveUserId}`);
      if (!res.ok) return;
      const items: { remainingAmount: number; lunas: boolean }[] =
        await res.json();
      const active = items.filter((i) => !i.lunas);
      setTotalUtang(active.reduce((sum, i) => sum + i.remainingAmount, 0));
      setActiveInstallmentCount(active.length);
    })();
  }, [effectiveUserId]);

  // "Piutang Aktif" gabungan dari 2 sumber: bagian orang lain yang
  // belum settled di Split Bill (cuma dihitung buat bill yang saya
  // payer-nya) + Receivable pribadi yang belum lunas. Beda dari
  // Cicilan/Utang Aktif di atas, kedua endpoint ini TIDAK dukung
  // `?userId=` admin cross-view (Split Bill/Receivable murni
  // personal, tidak ada fitur "admin lihat milik member lain" buat
  // keduanya) — jadi selalu nampilin punya user yang LOGIN sendiri,
  // tidak ikut berubah pas admin switch "lihat dashboard anggota lain".
  useEffect(() => {
    if (!currentUserId) return;
    (async () => {
      const [billsRes, receivablesRes] = await Promise.all([
        fetch("/api/split-bills"),
        fetch("/api/receivables"),
      ]);
      let total = 0;
      if (billsRes.ok) {
        const bills: { owedToMe: number }[] = await billsRes.json();
        total += bills.reduce((sum, b) => sum + b.owedToMe, 0);
      }
      if (receivablesRes.ok) {
        const receivables: { remainingAmount: number; lunas: boolean }[] =
          await receivablesRes.json();
        total += receivables
          .filter((r) => !r.lunas)
          .reduce((sum, r) => sum + r.remainingAmount, 0);
      }
      setTotalPiutang(total);
    })();
  }, [currentUserId]);

  const refresh = useCallback(async () => {
    if (!effectiveUserId) return;
    if (mode === "monthly") {
      const res = await fetch(
        `/api/dashboard-summary?month=${month}&userId=${effectiveUserId}`
      );
      setMonthlySummary(await res.json());
    } else {
      const res = await fetch(
        `/api/dashboard-summary-yearly?year=${year}&userId=${effectiveUserId}`
      );
      setYearlySummary(await res.json());
    }
  }, [mode, month, year, effectiveUserId]);

  useEffect(() => {
    if (!effectiveUserId) return;
    (async () => {
      setLoading(true);
      await refresh();
      setLoading(false);
    })();
  }, [effectiveUserId, refresh]);

  const userName = session?.user?.name ?? "";
  const viewingOther = isAdmin && !!selectedUserId && selectedUserId !== currentUserId;
  const selectedMember = members.find((m) => m.id === effectiveUserId);
  const displayName = viewingOther ? selectedMember?.name ?? "" : userName;
  const titleLabel =
    mode === "monthly" ? formatMonthLabel(month) : String(year);

  return (
    <div className="space-y-6">
      {recurringPrefill && (
        <AddExpenseDialog
          key={recurringPrefill.id}
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setRecurringPrefill(null);
              router.replace("/dashboard");
            }
          }}
          initialAmount={recurringPrefill.amount}
          initialNote={recurringPrefill.note}
          title="Konfirmasi Pengeluaran Berulang"
          description={`"${recurringPrefill.note}" jatuh tempo hari ini — cek dulu nominalnya (bisa diedit) sebelum disimpan`}
          confirmOnClose
          onSaved={() => refresh()}
        />
      )}

      {installmentPrefill && (
        <ConfirmInstallmentDialog
          key={installmentPrefill.id}
          installmentId={installmentPrefill.id}
          installmentName={installmentPrefill.name}
          defaultAmount={installmentPrefill.amount}
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setInstallmentPrefill(null);
              router.replace("/dashboard");
            }
          }}
          confirmOnClose
          onSaved={() => refresh()}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Ringkasan {titleLabel}
            {viewingOther && (
              <span className="text-muted-foreground font-normal">
                {" "}
                — {displayName}
              </span>
            )}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && members.length > 0 && (
            <Select
              value={effectiveUserId}
              onValueChange={(v) => setSelectedUserId(v)}
            >
              <SelectTrigger className="w-44">
                <Users className="size-4 text-muted-foreground" />
                <SelectValue placeholder="Pilih anggota" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.id === currentUserId ? "Saya" : m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Tabs value={mode} onValueChange={(v) => setMode(v as "monthly" | "yearly")}>
            <TabsList>
              <TabsTrigger value="monthly">Bulanan</TabsTrigger>
              <TabsTrigger value="yearly">Tahunan</TabsTrigger>
            </TabsList>
          </Tabs>
          {mode === "monthly" ? (
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-auto"
            />
          ) : (
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEAR_OPTIONS.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <FriendRequestNudgeBanner />
      <SavingsGoalNudgeBanner />

      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : mode === "monthly" && monthlySummary ? (
        <MonthlyDashboard
          summary={monthlySummary}
          userName={displayName}
          viewingOther={viewingOther}
          onExpenseSaved={refresh}
          totalUtang={totalUtang}
          activeInstallmentCount={activeInstallmentCount}
          totalPiutang={totalPiutang}
        />
      ) : mode === "yearly" && yearlySummary ? (
        <YearlyDashboard
          summary={yearlySummary}
          onExpenseSaved={refresh}
          totalUtang={totalUtang}
          activeInstallmentCount={activeInstallmentCount}
          totalPiutang={totalPiutang}
        />
      ) : null}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
} from "recharts";
import { linearTrend } from "@/lib/trendline";
import { CATEGORICAL, CHROME } from "@/lib/chartColors";
import { formatRupiah, formatCompactRupiah as formatCompact } from "@/lib/format";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconChip } from "@/components/icon-chip";
import { TrendingUp, PieChart, UtensilsCrossed } from "lucide-react";

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 4 + i);

type MonthReport = {
  month: string;
  totalActual: number;
  totalTarget: number;
  makanHighest: number;
  makanAverage: number;
};

type AllocationSlice = { name: string; amount: number; percentage: number };
type AllocationReport = {
  month: string;
  totalIncome: number;
  slices: AllocationSlice[];
};

const MONTH_LABEL = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function ReportsPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [allocationMonth, setAllocationMonth] = useState(currentMonth());
  const [yearlyData, setYearlyData] = useState<MonthReport[]>([]);
  const [allocation, setAllocation] = useState<AllocationReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [yearly, alloc] = await Promise.all([
        fetch(`/api/reports/yearly?year=${year}`).then((r) => r.json()),
        fetch(`/api/reports/allocation?month=${allocationMonth}`).then((r) =>
          r.json()
        ),
      ]);
      setYearlyData(yearly);
      setAllocation(alloc);
      setLoading(false);
    })();
  }, [year, allocationMonth]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const chartData = yearlyData.map((m, i) => ({
    label: MONTH_LABEL[i],
    actual: m.totalActual,
    target: m.totalTarget,
    highest: m.makanHighest,
    average: m.makanAverage,
  }));
  const trendActual = linearTrend(chartData.map((d) => d.actual));
  const trendHighest = linearTrend(chartData.map((d) => d.highest));
  const trendAverage = linearTrend(chartData.map((d) => d.average));
  const chartDataWithTrend = chartData.map((d, i) => ({
    ...d,
    trendActual: trendActual[i],
    trendHighest: trendHighest[i],
    trendAverage: trendAverage[i],
  }));

  const totalIncome = allocation?.totalIncome ?? 0;
  const allocationRow: Record<string, number | string> = { id: "alokasi" };
  allocation?.slices.forEach((s) => {
    allocationRow[s.name] = s.amount;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Laporan tahunan pengeluaran & alokasi penghasilan
        </p>
      </div>

      {/* Chart 1: Pengeluaran Bulanan */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <IconChip icon={TrendingUp} color="blue" size="sm" />
            <CardTitle className="text-base">
              Pengeluaran Bulanan {year}
            </CardTitle>
          </div>
          <Select
            value={String(year)}
            onValueChange={(v) => setYear(Number(v))}
          >
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
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartDataWithTrend}>
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
              <Tooltip formatter={(v) => formatRupiah(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="actual"
                name="Pengeluaran"
                fill={CATEGORICAL[0]}
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
              />
              <Line
                dataKey="target"
                name="Target"
                stroke={CHROME.baseline}
                strokeWidth={2}
                dot={false}
              />
              <Line
                dataKey="trendActual"
                name="Trendline"
                stroke={CATEGORICAL[4]}
                strokeWidth={2}
                strokeDasharray="4 3"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Chart 2: Alokasi Penghasilan */}
      <Card className="overflow-visible">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <IconChip icon={PieChart} color="violet" size="sm" />
            <CardTitle className="text-base">Alokasi Penghasilan</CardTitle>
          </div>
          <Input
            type="month"
            value={allocationMonth}
            onChange={(e) => setAllocationMonth(e.target.value)}
            className="w-auto h-8"
          />
        </CardHeader>
        <CardContent>
          {allocation && allocation.slices.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={90}>
                <BarChart data={[allocationRow]} layout="vertical">
                  <XAxis type="number" hide domain={[0, totalIncome || 1]} />
                  <YAxis type="category" dataKey="id" hide />
                  <Tooltip formatter={(v) => formatRupiah(Number(v))} />
                  {allocation.slices.map((s, i) => (
                    <Bar
                      key={s.name}
                      dataKey={s.name}
                      stackId="alloc"
                      fill={CATEGORICAL[i % CATEGORICAL.length]}
                      stroke={CHROME.surface}
                      strokeWidth={2}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mt-3">
                {allocation.slices.map((s, i) => (
                  <li key={s.name} className="flex items-center gap-2">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{
                        background: CATEGORICAL[i % CATEGORICAL.length],
                      }}
                    />
                    <span className="text-muted-foreground flex-1">
                      {s.name}
                    </span>
                    <span className="font-medium">
                      {s.percentage.toFixed(1)}%
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Belum ada data alokasi untuk bulan ini.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Chart 3: Pengeluaran Makan Bulanan */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <IconChip icon={UtensilsCrossed} color="amber" size="sm" />
          <CardTitle className="text-base">
            Pengeluaran Makan Bulanan {year}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartDataWithTrend}>
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
              <Tooltip formatter={(v) => formatRupiah(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="highest"
                name="Terbesar"
                fill={CATEGORICAL[0]}
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
              />
              <Bar
                dataKey="average"
                name="Rata-rata"
                fill={CATEGORICAL[1]}
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
              />
              <Line
                dataKey="trendHighest"
                name="Trendline Terbesar"
                stroke={CATEGORICAL[0]}
                strokeWidth={2}
                strokeDasharray="4 3"
                dot={false}
              />
              <Line
                dataKey="trendAverage"
                name="Trendline Rata-rata"
                stroke={CATEGORICAL[1]}
                strokeWidth={2}
                strokeDasharray="4 3"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { id as idLocale } from "date-fns/locale";
import { CalendarIcon, Printer, CheckCircle2 } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

type AccountLine = { accountId: string; code: string; name: string; balance: number };

type BalanceSheet = {
  asOf: string;
  assets: { byAccount: AccountLine[]; total: number };
  liabilities: { byAccount: AccountLine[]; total: number };
  equity: {
    contributedCapital: { byAccount: AccountLine[]; total: number };
    retainedEarnings: number;
    total: number;
  };
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
};

function toISODate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function Row({
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

export default function BalanceSheetPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const [sheet, setSheet] = useState<BalanceSheet | null>(null);
  const [asOf, setAsOf] = useState<Date | undefined>();
  const [asOfOpen, setAsOfOpen] = useState(false);

  async function loadSheet(asOfDate?: Date) {
    const params = new URLSearchParams();
    if (asOfDate) params.set("asOf", toISODate(asOfDate));
    const res = await fetch(
      `/api/business/companies/${companyId}/reports/balance-sheet?${params}`
    );
    if (res.ok) setSheet(await res.json());
  }

  useEffect(() => {
    (async () => {
      await loadSheet();
    })();
  }, [companyId]);

  if (!sheet) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <style>{`@media print { .no-print { display: none !important; } }`}</style>
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Neraca</h1>
          <p className="text-sm text-muted-foreground">
            Per {new Date(sheet.asOf).toLocaleDateString("id-ID")}
          </p>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="size-4" />
          Cetak
        </Button>
      </div>

      <div className="no-print">
        <Popover open={asOfOpen} onOpenChange={setAsOfOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <CalendarIcon className="size-4" />
              {asOf ? asOf.toLocaleDateString("id-ID") : "Per tanggal"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              locale={idLocale}
              selected={asOf}
              onSelect={(d) => {
                setAsOf(d);
                setAsOfOpen(false);
                if (d) loadSheet(d);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aset</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {sheet.assets.byAccount.map((a) => (
            <Row key={a.accountId} label={a.name} value={a.balance} indent />
          ))}
          <Row label="Total Aset" value={sheet.assets.total} bold />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Utang</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {sheet.liabilities.byAccount.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">Belum ada utang tercatat</p>
          ) : (
            sheet.liabilities.byAccount.map((a) => (
              <Row key={a.accountId} label={a.name} value={a.balance} indent />
            ))
          )}
          <Row label="Total Utang" value={sheet.liabilities.total} bold />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modal</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {sheet.equity.contributedCapital.byAccount.map((a) => (
            <Row key={a.accountId} label={a.name} value={a.balance} indent />
          ))}
          <Row
            label="Laba Ditahan (Akumulasi Laba/Rugi)"
            value={sheet.equity.retainedEarnings}
            indent
          />
          <Row label="Total Modal" value={sheet.equity.total} bold />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Utang + Modal</p>
            <p className="text-lg font-semibold tabular-nums">
              {formatRupiah(sheet.totalLiabilitiesAndEquity)}
            </p>
          </div>
          {sheet.isBalanced && (
            <Badge className="bg-emerald-100 text-emerald-800">
              <CheckCircle2 className="size-3.5" />
              Seimbang
            </Badge>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

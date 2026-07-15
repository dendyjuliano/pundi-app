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

type AccountLine = { code: string; name: string; amount: number };

type CashFlow = {
  from: string;
  to: string;
  beginningCash: number;
  operating: { total: number; byAccount: AccountLine[] };
  investing: { total: number };
  financing: { total: number; byAccount: AccountLine[] };
  netCashFlow: number;
  endingCash: number;
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

export default function CashFlowPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const [report, setReport] = useState<CashFlow | null>(null);
  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  async function loadReport(fromDate?: Date, toDate?: Date) {
    const params = new URLSearchParams();
    if (fromDate) params.set("from", toISODate(fromDate));
    if (toDate) params.set("to", toISODate(toDate));
    const res = await fetch(
      `/api/business/companies/${companyId}/reports/cash-flow?${params}`
    );
    if (res.ok) setReport(await res.json());
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

  return (
    <div className="space-y-6">
      <style>{`@media print { .no-print { display: none !important; } }`}</style>
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Arus Kas</h1>
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
          <CardTitle>Aktivitas Operasi</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {report.operating.byAccount.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">Belum ada aktivitas operasi</p>
          ) : (
            report.operating.byAccount.map((a) => (
              <Row key={a.code} label={a.name} value={a.amount} indent />
            ))
          )}
          <Row label="Kas Bersih dari Aktivitas Operasi" value={report.operating.total} bold />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aktivitas Investasi</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <p className="py-2 text-sm text-muted-foreground">
            Belum ada transaksi investasi tercatat (modul Aset Tetap belum tersedia)
          </p>
          <Row label="Kas Bersih dari Aktivitas Investasi" value={report.investing.total} bold />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aktivitas Pendanaan</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {report.financing.byAccount.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">Belum ada aktivitas pendanaan</p>
          ) : (
            report.financing.byAccount.map((a) => (
              <Row key={a.code} label={a.name} value={a.amount} indent />
            ))
          )}
          <Row label="Kas Bersih dari Aktivitas Pendanaan" value={report.financing.total} bold />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ringkasan</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <Row label="Kenaikan (Penurunan) Kas Bersih" value={report.netCashFlow} bold />
          <Row label="Kas & Setara Kas Awal Periode" value={report.beginningCash} indent />
          <Row label="Kas & Setara Kas Akhir Periode" value={report.endingCash} bold />
        </CardContent>
      </Card>

      {report.isBalanced && (
        <div className="flex justify-end no-print">
          <Badge className="bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="size-3.5" />
            Seimbang
          </Badge>
        </div>
      )}
    </div>
  );
}

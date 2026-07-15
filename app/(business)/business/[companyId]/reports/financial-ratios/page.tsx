"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { TrendingUp, Wallet, Scale, Waves } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { IconChip } from "@/components/icon-chip";

type Verdict = "sehat" | "perhatian" | "kritis";

type Ratios = {
  asOf: string;
  periodFrom: string;
  periodTo: string;
  cashAndBank: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  grossProfitMargin: number | null;
  netProfitMargin: number | null;
  cashRatio: number | null;
  debtToEquityRatio: number | null;
  cashRunwayMonths: number | null;
  verdicts: {
    netProfitMargin: Verdict;
    cashRatio: Verdict;
    debtToEquityRatio: Verdict;
    cashRunwayMonths: Verdict;
  };
};

const VERDICT_BADGE: Record<Verdict, { label: string; className: string }> = {
  sehat: { label: "Sehat", className: "bg-emerald-100 text-emerald-800" },
  perhatian: { label: "Perlu Perhatian", className: "bg-amber-100 text-amber-800" },
  kritis: { label: "Kritis", className: "bg-red-100 text-red-800" },
};

function formatPercent(value: number | null) {
  if (value === null) return "—";
  return `${(value * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
}

function RatioCard({
  icon,
  color,
  title,
  value,
  verdict,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  color: "emerald" | "blue" | "violet" | "amber";
  title: string;
  value: string;
  verdict?: Verdict;
  description: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-3">
          <IconChip icon={icon} color={color} size="sm" />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        {verdict && (
          <Badge className={VERDICT_BADGE[verdict].className}>
            {VERDICT_BADGE[verdict].label}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-1.5">
        <p className="text-3xl font-bold tabular-nums">{value}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function FinancialRatiosPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const [ratios, setRatios] = useState<Ratios | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/business/companies/${companyId}/reports/financial-ratios`);
      if (res.ok) setRatios(await res.json());
    })();
  }, [companyId]);

  if (!ratios) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rasio Keuangan</h1>
        <p className="text-sm text-muted-foreground">
          Neraca per {new Date(ratios.asOf).toLocaleDateString("id-ID")} · Laba Rugi &amp; Arus
          Kas {new Date(ratios.periodFrom).toLocaleDateString("id-ID")} —{" "}
          {new Date(ratios.periodTo).toLocaleDateString("id-ID")}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <RatioCard
          icon={TrendingUp}
          color="emerald"
          title="Margin Laba Kotor"
          value={formatPercent(ratios.grossProfitMargin)}
          description="Dari tiap Rp100.000 penjualan, berapa sisa setelah dikurangi harga pokok penjualan (belum dikurangi beban operasional)."
        />
        <RatioCard
          icon={TrendingUp}
          color="emerald"
          title="Margin Laba Bersih"
          value={formatPercent(ratios.netProfitMargin)}
          verdict={ratios.verdicts.netProfitMargin}
          description="Dari tiap Rp100.000 penjualan, berapa yang beneran jadi untung bersih — sudah dikurangi semua beban."
        />
        <RatioCard
          icon={Wallet}
          color="blue"
          title="Rasio Kas"
          value={ratios.cashRatio === null ? "Tidak ada utang" : formatPercent(ratios.cashRatio)}
          verdict={ratios.verdicts.cashRatio}
          description="Kalau semua utang usaha ditagih sekarang juga, berapa persen yang bisa langsung dilunasi pakai Kas & Bank yang ada."
        />
        <RatioCard
          icon={Scale}
          color="violet"
          title="Rasio Utang terhadap Modal"
          value={
            ratios.debtToEquityRatio === null ? "Tidak ada utang" : formatPercent(ratios.debtToEquityRatio)
          }
          verdict={ratios.verdicts.debtToEquityRatio}
          description="Seberapa besar bisnis ini dibiayai utang dibanding modal sendiri — makin kecil, makin sedikit ketergantungan ke utang."
        />
        <RatioCard
          icon={Waves}
          color="blue"
          title="Ketahanan Kas"
          value={
            ratios.cashRunwayMonths === null
              ? "Arus kas positif"
              : `${ratios.cashRunwayMonths.toLocaleString("id-ID", { maximumFractionDigits: 1 })} bulan`
          }
          verdict={ratios.verdicts.cashRunwayMonths}
          description="Kalau arus kas operasi lagi minus, perkiraan berapa lama bisnis masih bisa jalan pakai Kas & Bank yang ada sekarang, tanpa pemasukan tambahan."
        />
      </div>

      <Card className="bg-muted/30 border-dashed">
        <CardContent className="text-xs text-muted-foreground py-4">
          Rasio ini panduan umum buat gambaran cepat kondisi bisnismu, bukan pengganti nasihat
          akuntan atau konsultan keuangan profesional — terutama buat keputusan besar (pinjaman
          bank, investasi, dll).
        </CardContent>
      </Card>
    </div>
  );
}

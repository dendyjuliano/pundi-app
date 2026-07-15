import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { resolveCompanyAccess } from "@/lib/business/access";
import {
  computeBalanceSheet,
  computeCashFlow,
  computeIncomeStatement,
  defaultFiscalYearRange,
  endOfTodayWIB,
  isCashAccount,
} from "@/lib/business/reports";
import Company from "@/models/business/Company";

type Verdict = "sehat" | "perhatian" | "kritis";

// Threshold heuristik umum buat UMKM — BUKAN nasihat audit/akuntan
// profesional, sengaja disclaimer di UI. Angka dipilih biar gampang
// dijelasin ke owner non-akuntan, bukan textbook standar industri.
function marginVerdict(margin: number | null): Verdict {
  if (margin === null) return "perhatian"; // belum ada pendapatan buat dinilai
  if (margin >= 0.1) return "sehat";
  if (margin >= 0) return "perhatian";
  return "kritis";
}

function cashRatioVerdict(ratio: number | null): Verdict {
  if (ratio === null) return "sehat"; // tidak ada utang sama sekali
  if (ratio >= 1) return "sehat";
  if (ratio >= 0.5) return "perhatian";
  return "kritis";
}

function debtToEquityVerdict(
  ratio: number | null,
  equityTotal: number,
  liabilitiesTotal: number
): Verdict {
  // Tidak ada utang sama sekali — sehat apapun kondisi modalnya, TERMASUK
  // company baru yang modal & utangnya masih 0-0 (belum mulai transaksi,
  // bukan berarti "kritis"). Insolven (modal negatif/nol) baru jadi sinyal
  // beneran kalau ADA utang yang perlu dilunasi tapi modalnya tidak cukup.
  if (liabilitiesTotal <= 0) return "sehat";
  if (equityTotal <= 0) return "kritis";
  if (ratio === null) return "sehat";
  if (ratio <= 0.5) return "sehat";
  if (ratio <= 1) return "perhatian";
  return "kritis";
}

function cashRunwayVerdict(months: number | null): Verdict {
  if (months === null) return "sehat"; // arus kas operasi positif
  if (months >= 6) return "sehat";
  if (months >= 3) return "perhatian";
  return "kritis";
}

export async function GET(
  request: Request,
  ctx: RouteContext<"/api/business/companies/[id]/reports/financial-ratios">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const access = await resolveCompanyAccess(user.id, id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const company = await Company.findById(id);
  if (!company) {
    return NextResponse.json({ error: "Perusahaan tidak ditemukan" }, { status: 404 });
  }

  const asOf = endOfTodayWIB();
  const { from, to } = defaultFiscalYearRange(company.fiscalYearStartMonth);

  const [balanceSheet, incomeStatement, cashFlow] = await Promise.all([
    computeBalanceSheet(id, asOf),
    computeIncomeStatement(id, from, to),
    computeCashFlow(id, from, to),
  ]);

  const cashAndBank = balanceSheet.assets.byAccount
    .filter((a) => isCashAccount({ type: "asset", name: a.name }))
    .reduce((s, a) => s + a.balance, 0);

  const grossProfitMargin =
    incomeStatement.operatingRevenue > 0
      ? incomeStatement.grossProfit / incomeStatement.operatingRevenue
      : null;
  const netProfitMargin =
    incomeStatement.operatingRevenue > 0
      ? incomeStatement.netIncome / incomeStatement.operatingRevenue
      : null;

  const cashRatio =
    balanceSheet.liabilities.total > 0 ? cashAndBank / balanceSheet.liabilities.total : null;

  const debtToEquityRatio =
    balanceSheet.equity.total > 0
      ? balanceSheet.liabilities.total / balanceSheet.equity.total
      : balanceSheet.liabilities.total > 0
        ? Infinity
        : null;

  // Berapa bulan sudah berjalan sejak awal tahun fiskal s/d hari ini —
  // dipakai buat rata-ratakan arus kas operasi per bulan.
  const now = new Date();
  const monthsInPeriod = Math.max(
    1,
    (now.getUTCFullYear() - from.getUTCFullYear()) * 12 +
      (now.getUTCMonth() - from.getUTCMonth()) +
      1
  );
  const avgMonthlyOperatingCash = cashFlow.operating.total / monthsInPeriod;
  const cashRunwayMonths =
    avgMonthlyOperatingCash < 0 ? cashAndBank / Math.abs(avgMonthlyOperatingCash) : null;

  return NextResponse.json({
    asOf,
    periodFrom: from,
    periodTo: to,
    cashAndBank,
    totalAssets: balanceSheet.assets.total,
    totalLiabilities: balanceSheet.liabilities.total,
    totalEquity: balanceSheet.equity.total,
    grossProfitMargin,
    netProfitMargin,
    cashRatio,
    debtToEquityRatio: Number.isFinite(debtToEquityRatio) ? debtToEquityRatio : null,
    cashRunwayMonths,
    verdicts: {
      netProfitMargin: marginVerdict(netProfitMargin),
      cashRatio: cashRatioVerdict(cashRatio),
      debtToEquityRatio: debtToEquityVerdict(
        debtToEquityRatio,
        balanceSheet.equity.total,
        balanceSheet.liabilities.total
      ),
      cashRunwayMonths: cashRunwayVerdict(cashRunwayMonths),
    },
  });
}

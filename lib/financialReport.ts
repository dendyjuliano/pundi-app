import { getYearlyDashboardSummary } from "@/lib/dashboardSummary";
import { getYearlyInvestmentData } from "@/lib/reports";

export type FinancialHealthVerdict = "Sehat" | "Perlu Perhatian" | "Waspada";

// Rule-of-thumb keuangan umum (BUKAN nasihat finansial profesional —
// disclaimer ini juga dicetak di PDF-nya):
// - Savings rate (realisasi investasi / total income) ≥20% + mayoritas
//   bulan sesuai budget → "Sehat"
// - Savings rate ≥10%, ATAU minimal separuh bulan sesuai budget →
//   "Perlu Perhatian"
// - Selain itu → "Waspada"
function computeVerdict(
  savingsRate: number,
  adherenceRate: number
): FinancialHealthVerdict {
  if (savingsRate >= 0.2 && adherenceRate >= 0.75) return "Sehat";
  if (savingsRate >= 0.1 || adherenceRate >= 0.5) return "Perlu Perhatian";
  return "Waspada";
}

export async function getAnnualFinancialReport(userId: string, year: number) {
  const [yearly, investment] = await Promise.all([
    getYearlyDashboardSummary(userId, year),
    getYearlyInvestmentData(userId, year),
  ]);

  const totalInvestRealized = investment.months.reduce(
    (sum, m) => sum + m.realized,
    0
  );
  const totalInvestPlanned = investment.months.reduce(
    (sum, m) => sum + m.planned,
    0
  );
  const monthsNotMelenceng = yearly.months.filter((m) => !m.melenceng).length;

  const savingsRate =
    yearly.totalIncome > 0 ? totalInvestRealized / yearly.totalIncome : 0;
  const adherenceRate = monthsNotMelenceng / 12;

  const verdict = computeVerdict(savingsRate, adherenceRate);

  return {
    ...yearly,
    investment,
    totalInvestRealized,
    totalInvestPlanned,
    savingsRate,
    adherenceRate,
    monthsNotMelenceng,
    verdict,
  };
}

export type AnnualFinancialReport = Awaited<
  ReturnType<typeof getAnnualFinancialReport>
>;

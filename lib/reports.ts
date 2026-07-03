import { connectToDatabase } from "@/lib/mongodb";
import AllocationCategory from "@/models/AllocationCategory";
import Expense from "@/models/Expense";
import { getMonthlyBudgetOrDraft } from "@/lib/monthlyBudget";

const MONTH_SHORT_LABEL = [
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

export async function getMonthlyReportData(userId: string, month: string) {
  await connectToDatabase();

  const budget = await getMonthlyBudgetOrDraft(userId, month);
  const allocationCategories = await AllocationCategory.find({ userId });
  const foodCategoryIds = new Set(
    allocationCategories
      .filter((c) => c.type === "food")
      .map((c) => c._id.toString())
  );

  const foodBudget = budget.allocations
    .filter((a: { categoryId: unknown; amount: number }) =>
      foodCategoryIds.has(String(a.categoryId))
    )
    .reduce((sum: number, a: { amount: number }) => sum + a.amount, 0);
  const lainLainBudget = budget.totalBersih;
  const totalTarget = foodBudget + lainLainBudget;

  const [y, m] = month.split("-").map(Number);
  const monthStart = new Date(y, m - 1, 1);
  const monthEnd = new Date(y, m, 0, 23, 59, 59, 999);

  const expenses = await Expense.find({
    userId,
    date: { $gte: monthStart, $lte: monthEnd },
  }).lean();

  const totalActual = expenses.reduce((sum, e) => sum + e.amount, 0);

  const byDay = new Map<string, number>();
  for (const e of expenses) {
    if (e.category !== "makan") continue;
    const key = e.date.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + e.amount);
  }
  const dailyMakanValues = Array.from(byDay.values());
  const makanHighest = dailyMakanValues.length
    ? Math.max(...dailyMakanValues)
    : 0;
  const makanAverage = dailyMakanValues.length
    ? dailyMakanValues.reduce((sum, v) => sum + v, 0) / dailyMakanValues.length
    : 0;

  return {
    month,
    totalActual,
    totalTarget,
    foodBudget,
    lainLainBudget,
    makanHighest,
    makanAverage,
  };
}

// Rencana vs realisasi investasi per bulan sepanjang tahun — dipakai chart
// khusus di Reports. `hasInvestCategory` dipakai frontend untuk sembunyikan
// chart ini sama sekali kalau user tidak punya kategori alokasi bertipe
// "invest" (konsisten dengan Budget & Dashboard yang juga menyembunyikan
// bagian investasi kalau tidak relevan).
export async function getYearlyInvestmentData(userId: string, year: number) {
  await connectToDatabase();

  const allocationCategories = await AllocationCategory.find({ userId });
  const investCategoryIds = new Set(
    allocationCategories
      .filter((c) => c.type === "invest")
      .map((c) => c._id.toString())
  );
  const hasInvestCategory = investCategoryIds.size > 0;

  const monthStrings = Array.from(
    { length: 12 },
    (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`
  );

  const months = await Promise.all(
    monthStrings.map(async (month, i) => {
      const budget = await getMonthlyBudgetOrDraft(userId, month);
      const investLines = budget.allocations.filter(
        (a: { categoryId: unknown }) =>
          investCategoryIds.has(String(a.categoryId))
      );
      const planned = investLines.reduce(
        (sum: number, a: { amount: number }) => sum + a.amount,
        0
      );
      const realized = investLines.reduce(
        (sum: number, a: { realized?: number }) => sum + (a.realized ?? 0),
        0
      );
      return { month, label: MONTH_SHORT_LABEL[i], planned, realized };
    })
  );

  return { year, hasInvestCategory, months };
}

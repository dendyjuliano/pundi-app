import { connectToDatabase } from "@/lib/mongodb";
import AllocationCategory from "@/models/AllocationCategory";
import DailyBudgetSetting from "@/models/DailyBudgetSetting";
import Expense from "@/models/Expense";
import { daysInMonth, getMonthlyBudgetOrDraft } from "@/lib/monthlyBudget";

export function toMonthString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function getWeeksInMonth(month: string) {
  return Math.ceil(daysInMonth(month) / 7);
}

function getWeekRangeInMonth(month: string, weekNumber: number) {
  const totalDays = daysInMonth(month);
  const startDay = (weekNumber - 1) * 7 + 1;
  const endDay = Math.min(weekNumber * 7, totalDays);
  const [y, m] = month.split("-").map(Number);
  const start = new Date(y, m - 1, startDay);
  const end = new Date(y, m - 1, endDay, 23, 59, 59, 999);
  return { start, end, dayCount: endDay - startDay + 1 };
}

function sumByCategory(
  expenses: { category: string; amount: number }[],
  category: "makan" | "lain-lain"
) {
  return expenses
    .filter((e) => e.category === category)
    .reduce((sum, e) => sum + e.amount, 0);
}

// Shared per-month breakdown (income/allocation from budget, actual spend
// split by category) reused by both the monthly and yearly dashboard views.
async function getMonthBreakdown(userId: string, month: string) {
  const budget = await getMonthlyBudgetOrDraft(userId, month);

  const allocationCategories = await AllocationCategory.find({ userId });
  const foodCategoryIds = new Set(
    allocationCategories
      .filter((c) => c.type === "food")
      .map((c) => c._id.toString())
  );
  const investCategoryIds = new Set(
    allocationCategories
      .filter((c) => c.type === "invest")
      .map((c) => c._id.toString())
  );

  const foodBudget = budget.allocations
    .filter((a: { categoryId: unknown; amount: number }) =>
      foodCategoryIds.has(String(a.categoryId))
    )
    .reduce((sum: number, a: { amount: number }) => sum + a.amount, 0);
  const lainLainBudget = budget.totalBersih;

  const investLines = budget.allocations.filter(
    (a: { categoryId: unknown }) => investCategoryIds.has(String(a.categoryId))
  );
  const investPlanned = investLines.reduce(
    (sum: number, a: { amount: number }) => sum + a.amount,
    0
  );
  const investRealized = investLines.reduce(
    (sum: number, a: { realized?: number }) => sum + (a.realized ?? 0),
    0
  );
  const hasInvestCategory = investCategoryIds.size > 0;

  const [y, m] = month.split("-").map(Number);
  const monthStart = new Date(y, m - 1, 1);
  const monthEnd = new Date(y, m, 0, 23, 59, 59, 999);

  const expenses = await Expense.find({
    userId,
    date: { $gte: monthStart, $lte: monthEnd },
  }).lean();

  const makanActual = sumByCategory(expenses, "makan");
  const lainLainActual = sumByCategory(expenses, "lain-lain");
  const totalActual = makanActual + lainLainActual;
  const totalTarget = foodBudget + lainLainBudget;

  return {
    budget,
    expenses,
    makanActual,
    lainLainActual,
    makanBudget: foodBudget,
    lainLainBudget,
    totalActual,
    totalTarget,
    melenceng: totalActual > totalTarget,
    investPlanned,
    investRealized,
    hasInvestCategory,
  };
}

type CategoryInsight = {
  category: "makan" | "lain-lain";
  direction: "up" | "down";
  percent: number;
  message: string;
};

const CATEGORY_LABEL: Record<"makan" | "lain-lain", string> = {
  makan: "Makan",
  "lain-lain": "Lain-lain",
};

// Insight cuma layak ditampilkan kalau perubahannya cukup besar — di bawah
// ini dianggap fluktuasi harian biasa, bukan pola yang perlu diperhatikan.
const INSIGHT_THRESHOLD_PERCENT = 15;

// Bandingin pengeluaran bulan berjalan (s.d. `referenceDate`) dengan
// pengeluaran bulan lalu di rentang tanggal yang SAMA (bukan total sebulan
// penuh) — supaya adil, karena kalau baru tanggal 10 udah pasti lebih kecil
// dari total sebulan kemarin.
async function getMonthToDateInsights(
  userId: string,
  referenceDate: Date
): Promise<CategoryInsight[]> {
  const day = referenceDate.getDate();
  const currentMonthStart = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    1
  );
  const currentRangeEnd = endOfDay(referenceDate);

  const prevMonthStart = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() - 1,
    1
  );
  const prevMonthDayCount = daysInMonth(toMonthString(prevMonthStart));
  const prevRangeEnd = endOfDay(
    new Date(
      prevMonthStart.getFullYear(),
      prevMonthStart.getMonth(),
      Math.min(day, prevMonthDayCount)
    )
  );

  const [currentExpenses, prevExpenses] = await Promise.all([
    Expense.find({
      userId,
      date: { $gte: currentMonthStart, $lte: currentRangeEnd },
    }).lean(),
    Expense.find({
      userId,
      date: { $gte: prevMonthStart, $lte: prevRangeEnd },
    }).lean(),
  ]);

  const insights: CategoryInsight[] = [];
  for (const category of ["makan", "lain-lain"] as const) {
    const current = sumByCategory(currentExpenses, category);
    const previous = sumByCategory(prevExpenses, category);
    if (previous <= 0) continue; // tidak ada baseline buat dibandingkan

    const percent = ((current - previous) / previous) * 100;
    if (Math.abs(percent) < INSIGHT_THRESHOLD_PERCENT) continue;

    const direction = percent > 0 ? "up" : "down";
    const roundedPercent = Math.round(Math.abs(percent));
    insights.push({
      category,
      direction,
      percent: roundedPercent,
      message: `Pengeluaran ${CATEGORY_LABEL[category]} ${
        direction === "up" ? "naik" : "turun"
      } ${roundedPercent}% dari bulan lalu (s.d. tanggal yang sama)`,
    });
  }

  return insights;
}

export async function getDashboardSummary(
  userId: string,
  referenceDate: Date = new Date()
) {
  await connectToDatabase();

  const month = toMonthString(referenceDate);
  const isCurrentMonth = month === toMonthString(new Date());
  const {
    budget,
    expenses: monthExpenses,
    makanActual: monthMakanActual,
    lainLainActual: monthLainLainActual,
    makanBudget: foodBudget,
    lainLainBudget,
    totalActual,
    totalTarget,
    investPlanned,
    investRealized,
    hasInvestCategory,
  } = await getMonthBreakdown(userId, month);

  const dailyBudgetSetting = await DailyBudgetSetting.findOne({
    userId,
    effectiveFrom: { $lte: referenceDate },
  }).sort({ effectiveFrom: -1 });
  const amountPerDay = dailyBudgetSetting?.amountPerDay ?? 0;

  const recentExpenses = [...monthExpenses]
    .sort(
      (a, b) =>
        b.date.getTime() - a.date.getTime() ||
        b.createdAt.getTime() - a.createdAt.getTime()
    )
    .slice(0, 5)
    .map((e) => ({
      id: e._id.toString(),
      date: e.date.toISOString(),
      category: e.category as "makan" | "lain-lain",
      amount: e.amount,
      note: e.note,
    }));

  const totalDaysInMonth = daysInMonth(month);
  const dailyLainLainBudget = lainLainBudget / totalDaysInMonth;

  let today = null;
  if (isCurrentMonth) {
    const todayExpenses = monthExpenses.filter(
      (e) =>
        e.date >= startOfDay(referenceDate) && e.date <= endOfDay(referenceDate)
    );
    const todayMakan = sumByCategory(todayExpenses, "makan");
    const todayLainLain = sumByCategory(todayExpenses, "lain-lain");
    const todayTotalActual = todayMakan + todayLainLain;
    const todayTotalTarget = amountPerDay + dailyLainLainBudget;
    today = {
      makan: todayMakan,
      lainLain: todayLainLain,
      makanTarget: amountPerDay,
      lainLainTarget: dailyLainLainBudget,
      sisaMakan: amountPerDay - todayMakan,
      sisaLainLain: dailyLainLainBudget - todayLainLain,
      totalActual: todayTotalActual,
      totalTarget: todayTotalTarget,
      melenceng: todayTotalActual > todayTotalTarget,
    };
  }

  const insights = isCurrentMonth
    ? await getMonthToDateInsights(userId, referenceDate)
    : [];

  const totalWeeks = getWeeksInMonth(month);
  const weeks = [];
  for (let weekNumber = 1; weekNumber <= totalWeeks; weekNumber++) {
    const { start: weekStart, end: weekEnd, dayCount: weekDayCount } =
      getWeekRangeInMonth(month, weekNumber);
    const weekExpenses = monthExpenses.filter(
      (e) => e.date >= weekStart && e.date <= weekEnd
    );
    const weekMakanActual = sumByCategory(weekExpenses, "makan");
    const weekLainLainActual = sumByCategory(weekExpenses, "lain-lain");
    const weekMakanBudget = amountPerDay * weekDayCount;
    const weekLainLainBudget = dailyLainLainBudget * weekDayCount;
    const weekTotalActual = weekMakanActual + weekLainLainActual;
    const weekTotalTarget = weekMakanBudget + weekLainLainBudget;

    weeks.push({
      number: weekNumber,
      startDay: weekStart.getDate(),
      endDay: weekEnd.getDate(),
      makan: weekMakanActual,
      lainLain: weekLainLainActual,
      makanBudget: weekMakanBudget,
      lainLainBudget: weekLainLainBudget,
      sisaMakan: weekMakanBudget - weekMakanActual,
      sisaLainLain: weekLainLainBudget - weekLainLainActual,
      totalActual: weekTotalActual,
      totalTarget: weekTotalTarget,
      melenceng: weekTotalActual > weekTotalTarget,
    });
  }

  return {
    month,
    isCurrentMonth,
    totalIncome: budget.totalIncome,
    totalAllocation: budget.totalAllocation,
    totalBersih: budget.totalBersih,
    isBudgetSaved: !budget.isNew,
    amountPerDay,
    today,
    weeks,
    insights,
    monthSummary: {
      makanActual: monthMakanActual,
      lainLainActual: monthLainLainActual,
      makanBudget: foodBudget,
      lainLainBudget,
      totalActual,
      totalTarget,
      melenceng: totalActual > totalTarget,
    },
    investment: hasInvestCategory
      ? { planned: investPlanned, realized: investRealized }
      : null,
    recentExpenses,
  };
}

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

export async function getYearlyDashboardSummary(userId: string, year: number) {
  await connectToDatabase();

  const monthStrings = Array.from(
    { length: 12 },
    (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`
  );

  const monthResults = await Promise.all(
    monthStrings.map(async (month, i) => {
      const breakdown = await getMonthBreakdown(userId, month);
      return {
        month,
        label: MONTH_SHORT_LABEL[i],
        totalIncome: breakdown.budget.totalIncome as number,
        totalAllocation: breakdown.budget.totalAllocation as number,
        makanActual: breakdown.makanActual,
        lainLainActual: breakdown.lainLainActual,
        makanBudget: breakdown.makanBudget,
        lainLainBudget: breakdown.lainLainBudget,
        totalActual: breakdown.totalActual,
        totalTarget: breakdown.totalTarget,
        melenceng: breakdown.melenceng,
      };
    })
  );

  const totalIncome = monthResults.reduce((sum, r) => sum + r.totalIncome, 0);
  const totalAllocation = monthResults.reduce(
    (sum, r) => sum + r.totalAllocation,
    0
  );
  const totalBersih = totalIncome - totalAllocation;
  const totalActual = monthResults.reduce((sum, r) => sum + r.totalActual, 0);
  const totalTarget = monthResults.reduce((sum, r) => sum + r.totalTarget, 0);

  return {
    year,
    totalIncome,
    totalAllocation,
    totalBersih,
    totalActual,
    totalTarget,
    melenceng: totalActual > totalTarget,
    months: monthResults.map((r) => ({
      month: r.month,
      label: r.label,
      makanActual: r.makanActual,
      lainLainActual: r.lainLainActual,
      makanBudget: r.makanBudget,
      lainLainBudget: r.lainLainBudget,
      totalActual: r.totalActual,
      totalTarget: r.totalTarget,
      melenceng: r.melenceng,
    })),
  };
}

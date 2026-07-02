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

  const foodBudget = budget.allocations
    .filter((a: { categoryId: unknown; amount: number }) =>
      foodCategoryIds.has(String(a.categoryId))
    )
    .reduce((sum: number, a: { amount: number }) => sum + a.amount, 0);
  const lainLainBudget = budget.totalBersih;

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
  };
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
    monthSummary: {
      makanActual: monthMakanActual,
      lainLainActual: monthLainLainActual,
      makanBudget: foodBudget,
      lainLainBudget,
      totalActual,
      totalTarget,
      melenceng: totalActual > totalTarget,
    },
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

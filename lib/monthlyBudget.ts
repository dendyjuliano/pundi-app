export function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export function endOfMonth(month: string): Date {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0, 23, 59, 59, 999);
}

export function previousMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}`;
}

export function nextMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m, 1);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}`;
}

export function isValidMonth(month: string | null): month is string {
  return !!month && /^\d{4}-\d{2}$/.test(month);
}

type BudgetLine = { categoryId: unknown; amount: number };

export function computeTotals(budget: {
  incomes: BudgetLine[];
  allocations: BudgetLine[];
}) {
  const totalIncome = budget.incomes.reduce((sum, i) => sum + i.amount, 0);
  const totalAllocation = budget.allocations.reduce(
    (sum, a) => sum + a.amount,
    0
  );
  return {
    totalIncome,
    totalAllocation,
    totalBersih: totalIncome - totalAllocation,
  };
}

// Bangun incomes/allocations draft untuk `month` dengan meng-carry-forward
// nilai dari `prevBudget` (kalau ada) per categoryId, dan menghitung ulang
// pos "food" dari jatah harian × jumlah hari bulan itu. Dipakai bareng oleh
// draft on-the-fly (`getMonthlyBudgetOrDraft`) dan propagasi permanen
// (`propagateBudgetForward`) supaya logikanya selalu identik.
function buildDraftLines(
  month: string,
  incomeCategories: { _id: unknown }[],
  allocationCategories: { _id: unknown; type: string }[],
  dailyBudgetSetting: { amountPerDay: number } | null,
  prevBudget: {
    incomes: { categoryId: { toString(): string }; amount: number }[];
    allocations: { categoryId: { toString(): string }; amount: number }[];
  } | null
) {
  const prevIncomeMap = new Map<string, number>(
    (prevBudget?.incomes ?? []).map((i) => [i.categoryId.toString(), i.amount])
  );
  const prevAllocationMap = new Map<string, number>(
    (prevBudget?.allocations ?? []).map((a) => [
      a.categoryId.toString(),
      a.amount,
    ])
  );

  const foodAmount = dailyBudgetSetting
    ? dailyBudgetSetting.amountPerDay * daysInMonth(month)
    : 0;

  const incomes = incomeCategories.map((c) => ({
    categoryId: c._id,
    amount: prevIncomeMap.get((c._id as { toString(): string }).toString()) ?? 0,
  }));

  const allocations = allocationCategories.map((c) => ({
    categoryId: c._id,
    amount:
      c.type === "food"
        ? foodAmount
        : prevAllocationMap.get(
            (c._id as { toString(): string }).toString()
          ) ?? 0,
    // Realisasi investasi selalu mulai dari 0 tiap bulan baru — ini nilai
    // aktual bulan berjalan, bukan rencana yang wajar di-carry-forward.
    realized: 0,
  }));

  return { incomes, allocations };
}

export async function getMonthlyBudgetOrDraft(userId: string, month: string) {
  const [{ default: MonthlyBudget }, { default: IncomeCategory }, { default: AllocationCategory }, { default: DailyBudgetSetting }] =
    await Promise.all([
      import("@/models/MonthlyBudget"),
      import("@/models/IncomeCategory"),
      import("@/models/AllocationCategory"),
      import("@/models/DailyBudgetSetting"),
    ]);

  const existing = await MonthlyBudget.findOne({ userId, month });
  if (existing) {
    const obj = existing.toObject();
    return { ...obj, isNew: false, ...computeTotals(obj) };
  }

  const prevBudget = await MonthlyBudget.findOne({
    userId,
    month: previousMonth(month),
  });

  const [incomeCategories, allocationCategories, dailyBudgetSetting] =
    await Promise.all([
      IncomeCategory.find({ userId }),
      AllocationCategory.find({ userId }),
      DailyBudgetSetting.findOne({
        userId,
        effectiveFrom: { $lte: endOfMonth(month) },
      }).sort({ effectiveFrom: -1 }),
    ]);

  const { incomes, allocations } = buildDraftLines(
    month,
    incomeCategories,
    allocationCategories,
    dailyBudgetSetting,
    prevBudget
  );

  const draft = { userId, month, incomes, allocations };
  return { ...draft, isNew: true, ...computeTotals(draft) };
}

// Dipanggil setelah `fromMonth` berhasil disimpan. Mengisi bulan-bulan
// SETELAHNYA yang masih benar-benar kosong (belum pernah punya
// MonthlyBudget tersimpan sama sekali) dengan nilai yang di-carry-forward
// dari bulan sebelumnya di rantai ini — jadi bukan cuma draft yang hilang
// kalau tidak dibuka, tapi benar-benar tertulis ke database. Berhenti begitu
// ketemu bulan yang sudah punya data sendiri (tidak pernah menimpa data
// yang sudah ada), atau setelah `maxMonths` iterasi sebagai batas aman.
export async function propagateBudgetForward(
  userId: string,
  fromMonth: string,
  maxMonths = 24
) {
  const [{ default: MonthlyBudget }, { default: IncomeCategory }, { default: AllocationCategory }, { default: DailyBudgetSetting }] =
    await Promise.all([
      import("@/models/MonthlyBudget"),
      import("@/models/IncomeCategory"),
      import("@/models/AllocationCategory"),
      import("@/models/DailyBudgetSetting"),
    ]);

  let prevBudget = await MonthlyBudget.findOne({ userId, month: fromMonth });
  if (!prevBudget) return [];

  const [incomeCategories, allocationCategories] = await Promise.all([
    IncomeCategory.find({ userId }),
    AllocationCategory.find({ userId }),
  ]);

  const createdMonths: string[] = [];
  let cursor = fromMonth;

  for (let i = 0; i < maxMonths; i++) {
    cursor = nextMonth(cursor);
    const alreadyExists = await MonthlyBudget.findOne({
      userId,
      month: cursor,
    });
    if (alreadyExists) break;

    const dailyBudgetSetting = await DailyBudgetSetting.findOne({
      userId,
      effectiveFrom: { $lte: endOfMonth(cursor) },
    }).sort({ effectiveFrom: -1 });

    const { incomes, allocations } = buildDraftLines(
      cursor,
      incomeCategories,
      allocationCategories,
      dailyBudgetSetting,
      prevBudget
    );

    prevBudget = await MonthlyBudget.create({
      userId,
      month: cursor,
      incomes,
      allocations,
    });
    createdMonths.push(cursor);
  }

  return createdMonths;
}

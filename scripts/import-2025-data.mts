import fs from "fs";
import path from "path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const envContent = fs.readFileSync(
  path.join(projectRoot, ".env.local"),
  "utf8"
);
for (const line of envContent.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

const { connectToDatabase } = await import(
  path.join(projectRoot, "lib/mongodb.ts")
);
const User = (await import(path.join(projectRoot, "models/User.ts"))).default;
const IncomeCategory = (
  await import(path.join(projectRoot, "models/IncomeCategory.ts"))
).default;
const AllocationCategory = (
  await import(path.join(projectRoot, "models/AllocationCategory.ts"))
).default;
const MonthlyBudget = (
  await import(path.join(projectRoot, "models/MonthlyBudget.ts"))
).default;
const Expense = (await import(path.join(projectRoot, "models/Expense.ts")))
  .default;
const DailyBudgetSetting = (
  await import(path.join(projectRoot, "models/DailyBudgetSetting.ts"))
).default;

await connectToDatabase();

const ADMIN_EMAIL = "admin@pundi.test";
const user = await User.findOne({ email: ADMIN_EMAIL });
if (!user) {
  console.error(`User ${ADMIN_EMAIL} not found`);
  process.exit(1);
}
const userId = user._id;

// ---- 1. Wipe existing data for this user ----
await Promise.all([
  IncomeCategory.deleteMany({ userId }),
  AllocationCategory.deleteMany({ userId }),
  MonthlyBudget.deleteMany({ userId }),
  Expense.deleteMany({ userId }),
  DailyBudgetSetting.deleteMany({ userId }),
]);
console.log("Cleared existing data for", ADMIN_EMAIL);

// ---- 2. Categories ----
const incomeCatNames = ["RDS Group/Phincon", "Freelance", "Lainya"];
const incomeCats = await IncomeCategory.insertMany(
  incomeCatNames.map((name) => ({ userId, name }))
);
const incomeCatByName = Object.fromEntries(
  incomeCats.map((c: { name: string; _id: unknown }) => [c.name, c._id])
);

const allocationCatDefs = [
  { name: "Makan (70k/Hari)", type: "food" },
  { name: "TF Ibu", type: "fixed" },
  { name: "TF Bapak", type: "fixed" },
  { name: "Kosan", type: "fixed" },
  { name: "Invest", type: "invest" },
];
const allocationCats = await AllocationCategory.insertMany(
  allocationCatDefs.map((d) => ({ userId, name: d.name, type: d.type }))
);
const allocCatByName = Object.fromEntries(
  allocationCats.map((c: { name: string; _id: unknown }) => [c.name, c._id])
);

// ---- 3. Daily budget setting ----
await DailyBudgetSetting.create({
  userId,
  amountPerDay: 70000,
  effectiveFrom: new Date(2025, 0, 1),
});

// ---- 4. Monthly budgets (income & allocation per month, 2025) ----
const months = [
  "2025-01",
  "2025-02",
  "2025-03",
  "2025-04",
  "2025-05",
  "2025-06",
  "2025-07",
  "2025-08",
  "2025-09",
  "2025-10",
  "2025-11",
  "2025-12",
];

const rds = [
  9350000, 9500000, 9450000, 9422000, 9350000, 9492000, 9457000, 9562000,
  9684500, 9649500, 12000000, 12300000,
];
const freelance = Array(12).fill(10000000);
const lainya = [
  0, 0, 2189800, 10700000, 0, 1200000, 6100000, 0, 3000000, 0, 6919000, 0,
];

const makanAlloc = Array(12).fill(2170000);
const tfIbu = [
  1000000, 1000000, 1000000, 500000, 1000000, 1300000, 1000000, 3000000,
  1635000, 1255581, 2000000, 1250000,
];
const tfBapak = [
  500000, 500000, 600000, 500000, 500000, 500000, 1300000, 150000, 300000,
  300000, 3300000, 1950000,
];
const kosan = [
  1000000, 1000000, 1000000, 1000000, 1000000, 1000000, 1000000, 1000000, 0,
  2000000, 1000000, 0,
];
const invest = [
  10000000, 10000000, 10000000, 15000000, 10000000, 9000000, 10000000,
  10000000, 14000000, 10000000, 10000000, 10000000,
];

for (let i = 0; i < 12; i++) {
  await MonthlyBudget.create({
    userId,
    month: months[i],
    incomes: [
      { categoryId: incomeCatByName["RDS Group/Phincon"], amount: rds[i] },
      { categoryId: incomeCatByName["Freelance"], amount: freelance[i] },
      { categoryId: incomeCatByName["Lainya"], amount: lainya[i] },
    ],
    allocations: [
      { categoryId: allocCatByName["Makan (70k/Hari)"], amount: makanAlloc[i] },
      { categoryId: allocCatByName["TF Ibu"], amount: tfIbu[i] },
      { categoryId: allocCatByName["TF Bapak"], amount: tfBapak[i] },
      { categoryId: allocCatByName["Kosan"], amount: kosan[i] },
      { categoryId: allocCatByName["Invest"], amount: invest[i] },
    ],
  });
}
console.log("Created 12 monthly budgets for 2025");

// ---- 5. Daily expenses (weekly aggregates, validated against source totals) ----
type WeekAgg = { makan: number; lainLain: number } | null;
type MonthAgg = {
  monthIndex: number; // 0-based
  daysInMonth: number;
  weeks: WeekAgg[]; // index 0..4 => week1..week5
  // Feb special case: row5 merges into week4 range instead of a real week5
  mergeLastIntoWeek4?: boolean;
};

const monthData: MonthAgg[] = [
  {
    monthIndex: 0,
    daysInMonth: 31,
    weeks: [
      { makan: 540800, lainLain: 3060000 },
      { makan: 540400, lainLain: 872400 },
      { makan: 479400, lainLain: 841000 },
      { makan: 465200, lainLain: 393700 },
      { makan: 145600, lainLain: 0 },
    ],
  },
  {
    monthIndex: 1,
    daysInMonth: 28,
    mergeLastIntoWeek4: true,
    weeks: [
      { makan: 424300, lainLain: 1807000 },
      { makan: 364800, lainLain: 1035800 },
      { makan: 301200, lainLain: 597891 },
      { makan: 508300, lainLain: 357900 },
      { makan: 346800, lainLain: 145200 }, // merges into week4 range
    ],
  },
  {
    monthIndex: 2,
    daysInMonth: 31,
    weeks: [
      { makan: 631800, lainLain: 3725200 },
      { makan: 239100, lainLain: 1995810 },
      { makan: 303800, lainLain: 1268515 },
      { makan: 370200, lainLain: 321600 },
      null,
    ],
  },
  {
    monthIndex: 3,
    daysInMonth: 30,
    weeks: [
      { makan: 247000, lainLain: 5012143 },
      { makan: 167500, lainLain: 3709100 },
      { makan: 489638, lainLain: 2230620 },
      { makan: 436400, lainLain: 814549 },
      null,
    ],
  },
  {
    monthIndex: 4,
    daysInMonth: 31,
    weeks: [
      { makan: 593100, lainLain: 2813719 },
      { makan: 454000, lainLain: 414000 },
      { makan: 360000, lainLain: 164000 },
      { makan: 463400, lainLain: 656800 },
      { makan: 235000, lainLain: 395790 },
    ],
  },
  {
    monthIndex: 5,
    daysInMonth: 30,
    weeks: [
      { makan: 157200, lainLain: 416200 },
      { makan: 570700, lainLain: 3006600 },
      { makan: 360200, lainLain: 848000 },
      { makan: 449300, lainLain: 1407300 },
      { makan: 453000, lainLain: 1915400 },
    ],
  },
  {
    monthIndex: 6,
    daysInMonth: 31,
    weeks: [
      { makan: 503000, lainLain: 4275750 },
      { makan: 497200, lainLain: 1323600 },
      { makan: 499400, lainLain: 798100 },
      { makan: 543200, lainLain: 763400 },
      { makan: 212800, lainLain: 1503500 },
    ],
  },
  {
    monthIndex: 7,
    daysInMonth: 31,
    weeks: [
      { makan: 230700, lainLain: 2252200 },
      { makan: 471400, lainLain: 719900 },
      { makan: 454100, lainLain: 564500 },
      { makan: 522600, lainLain: 407191 },
      { makan: 439900, lainLain: 722000 },
    ],
  },
  {
    monthIndex: 8,
    daysInMonth: 30,
    weeks: [
      { makan: 77000, lainLain: 1385975 },
      { makan: 516474, lainLain: 3460551 },
      { makan: 565900, lainLain: 95500 },
      { makan: 539100, lainLain: 175000 },
      null, // excluded: not part of source's official monthly total
    ],
  },
  {
    monthIndex: 9,
    daysInMonth: 31,
    weeks: [
      { makan: 374000, lainLain: 3710181 },
      { makan: 495600, lainLain: 1280500 },
      { makan: 526900, lainLain: 254700 },
      { makan: 503800, lainLain: 161000 },
      null, // excluded: not part of source's official monthly total
    ],
  },
  {
    monthIndex: 10,
    daysInMonth: 30,
    weeks: [
      { makan: 341000, lainLain: 3443400 },
      { makan: 739898, lainLain: 1952424 },
      { makan: 1101794, lainLain: 636400 },
      { makan: 501800, lainLain: 620400 },
      { makan: 382900, lainLain: 960000 },
    ],
  },
  {
    monthIndex: 11,
    daysInMonth: 31,
    weeks: [
      { makan: 129000, lainLain: 1503132 },
      { makan: 603250, lainLain: 956823 },
      { makan: 493400, lainLain: 358720 },
      { makan: 850000, lainLain: 1743975 },
      { makan: 1635200, lainLain: 1763300 },
    ],
  },
];

const WEEK_REPRESENTATIVE_DAY = [4, 11, 18, 25, 30];

const expenseDocs: Record<string, unknown>[] = [];

for (const m of monthData) {
  for (let w = 0; w < m.weeks.length; w++) {
    const agg = m.weeks[w];
    if (!agg) continue;

    let day = WEEK_REPRESENTATIVE_DAY[w];
    if (m.mergeLastIntoWeek4 && w === 4) {
      day = 27; // still within week4 range (22-28) for the 28-day month
    }
    day = Math.min(day, m.daysInMonth);
    const date = new Date(2025, m.monthIndex, day);

    if (agg.makan > 0) {
      expenseDocs.push({
        userId,
        date,
        category: "makan",
        amount: agg.makan,
        note: "Impor data 2025 (agregat mingguan)",
      });
    }
    if (agg.lainLain > 0) {
      expenseDocs.push({
        userId,
        date,
        category: "lain-lain",
        amount: agg.lainLain,
        note: "Pengeluaran lain-lain (impor data 2025, agregat mingguan)",
      });
    }
  }
}

await Expense.insertMany(expenseDocs);
console.log(`Created ${expenseDocs.length} expense entries`);

// ---- 6. Validation: compare inserted sums against known monthly totals ----
const knownMonthlyTotals = [
  7338500, 5889191, 8856025, 13106950, 6549809, 9583900, 10919950, 6784491,
  6815500, 7306681, 10680016, 10036800,
];

for (let i = 0; i < 12; i++) {
  const [y, mo] = months[i].split("-").map(Number);
  const start = new Date(y, mo - 1, 1);
  const end = new Date(y, mo, 0, 23, 59, 59, 999);
  const sum = await Expense.aggregate([
    { $match: { userId, date: { $gte: start, $lte: end } } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const total = sum[0]?.total ?? 0;
  const expected = knownMonthlyTotals[i];
  const status = total === expected ? "OK" : "MISMATCH";
  console.log(
    `${months[i]}: imported=${total} expected=${expected} [${status}]`
  );
}

process.exit(0);

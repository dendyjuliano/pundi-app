import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getCurrentUser } from "@/lib/session";
import { resolveCompanyAccess } from "@/lib/business/access";
import Company from "@/models/business/Company";
import JournalEntry from "@/models/business/JournalEntry";

type ReportSection =
  | "operating-revenue"
  | "cogs"
  | "operating-expense"
  | "non-operating-revenue"
  | "non-operating-expense";

const REVENUE_SECTIONS: ReportSection[] = ["operating-revenue", "non-operating-revenue"];

const MONTH_LABEL = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

function defaultRange(fiscalYearStartMonth: number) {
  const now = new Date();
  const currentMonth = now.getUTCMonth() + 1;
  const startYear =
    currentMonth >= fiscalYearStartMonth
      ? now.getUTCFullYear()
      : now.getUTCFullYear() - 1;
  const from = new Date(Date.UTC(startYear, fiscalYearStartMonth - 1, 1));
  const to = new Date(Date.UTC(startYear + 1, fiscalYearStartMonth - 1, 1));
  to.setUTCMilliseconds(-1);
  return { from, to };
}

export async function GET(
  request: Request,
  ctx: RouteContext<"/api/business/companies/[id]/reports/income-statement/monthly">
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

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  let from: Date;
  let to: Date;
  if (fromParam || toParam) {
    from = fromParam ? new Date(fromParam) : new Date(0);
    to = toParam ? new Date(toParam) : new Date();
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return NextResponse.json({ error: "invalid from/to" }, { status: 400 });
    }
  } else {
    const range = defaultRange(company.fiscalYearStartMonth);
    from = range.from;
    to = range.to;
  }

  // Pola aggregation sama persis route income-statement utama, cuma
  // di-group tambahan per tahun+bulan biar dapat breakdown tren bulanan —
  // tetap compute-on-read, tidak ada saldo bulanan yang disimpan.
  const rows = await JournalEntry.aggregate([
    { $match: { companyId: new Types.ObjectId(id), date: { $gte: from, $lte: to } } },
    { $unwind: "$lines" },
    {
      $lookup: {
        from: "accounts",
        localField: "lines.accountId",
        foreignField: "_id",
        as: "account",
      },
    },
    { $unwind: "$account" },
    { $match: { "account.reportSection": { $exists: true, $ne: null } } },
    {
      $group: {
        _id: {
          year: { $year: "$date" },
          month: { $month: "$date" },
          reportSection: "$account.reportSection",
        },
        netCredit: { $sum: { $subtract: ["$lines.credit", "$lines.debit"] } },
      },
    },
  ]);

  const buckets = new Map<string, Record<ReportSection, number>>();
  for (const row of rows) {
    const key = `${row._id.year}-${String(row._id.month).padStart(2, "0")}`;
    const section = row._id.reportSection as ReportSection;
    if (!buckets.has(key)) {
      buckets.set(key, {
        "operating-revenue": 0,
        cogs: 0,
        "operating-expense": 0,
        "non-operating-revenue": 0,
        "non-operating-expense": 0,
      });
    }
    const bucket = buckets.get(key)!;
    const amount = REVENUE_SECTIONS.includes(section) ? row.netCredit : -row.netCredit;
    bucket[section] += amount;
  }

  // Isi semua bulan dalam rentang, termasuk yang kosong, biar tren tidak
  // "melompat" di chart waktu ada bulan tanpa transaksi.
  const months: {
    month: string;
    label: string;
    revenue: number;
    expense: number;
    netIncome: number;
  }[] = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
  while (cursor <= end) {
    const key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`;
    const bucket = buckets.get(key) ?? {
      "operating-revenue": 0,
      cogs: 0,
      "operating-expense": 0,
      "non-operating-revenue": 0,
      "non-operating-expense": 0,
    };
    const revenue = bucket["operating-revenue"] + bucket["non-operating-revenue"];
    const expense = bucket.cogs + bucket["operating-expense"] + bucket["non-operating-expense"];
    months.push({
      month: key,
      label: `${MONTH_LABEL[cursor.getUTCMonth()]} ${cursor.getUTCFullYear()}`,
      revenue,
      expense,
      netIncome: revenue - expense,
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return NextResponse.json({ months });
}

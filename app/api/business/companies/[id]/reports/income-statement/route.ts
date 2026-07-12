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

function defaultRange(fiscalYearStartMonth: number) {
  const now = new Date();
  const currentMonth = now.getUTCMonth() + 1; // 1-12
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
  ctx: RouteContext<"/api/business/companies/[id]/reports/income-statement">
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

  // Aggregate baris jurnal per reportSection akun; baris asset/liability/
  // equity (tanpa reportSection) dibuang dari hasil karena Neraca di luar
  // scope MVP. Subtotal dihitung di JS (bukan aggregation lanjutan) biar
  // gampang dibaca & diuji, bukan on-the-fly saldo akun tersimpan.
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
          reportSection: "$account.reportSection",
          accountId: "$account._id",
          code: "$account.code",
          name: "$account.name",
          costBehavior: "$account.costBehavior",
        },
        netCredit: { $sum: { $subtract: ["$lines.credit", "$lines.debit"] } },
      },
    },
  ]);

  const sectionTotals: Record<ReportSection, number> = {
    "operating-revenue": 0,
    cogs: 0,
    "operating-expense": 0,
    "non-operating-revenue": 0,
    "non-operating-expense": 0,
  };
  const byAccount: {
    reportSection: ReportSection;
    accountId: string;
    code: string;
    name: string;
    costBehavior?: string;
    amount: number;
  }[] = [];

  for (const row of rows) {
    const section = row._id.reportSection as ReportSection;
    // Bagian revenue naturally positif waktu di-credit; bagian expense
    // dinegasikan biar nominalnya positif sebagai "jumlah beban".
    const amount =
      section === "operating-revenue" || section === "non-operating-revenue"
        ? row.netCredit
        : -row.netCredit;
    sectionTotals[section] += amount;
    byAccount.push({
      reportSection: section,
      accountId: row._id.accountId.toString(),
      code: row._id.code,
      name: row._id.name,
      costBehavior: row._id.costBehavior,
      amount,
    });
  }

  const operatingRevenue = sectionTotals["operating-revenue"];
  const cogs = sectionTotals.cogs;
  const grossProfit = operatingRevenue - cogs;
  const operatingExpense = sectionTotals["operating-expense"];
  const operatingProfit = grossProfit - operatingExpense;
  const nonOperatingRevenue = sectionTotals["non-operating-revenue"];
  const nonOperatingExpense = sectionTotals["non-operating-expense"];
  const netIncome = operatingProfit + nonOperatingRevenue - nonOperatingExpense;

  return NextResponse.json({
    from,
    to,
    operatingRevenue,
    cogs,
    grossProfit,
    operatingExpense,
    operatingProfit,
    nonOperatingRevenue,
    nonOperatingExpense,
    netIncome,
    byAccount,
  });
}

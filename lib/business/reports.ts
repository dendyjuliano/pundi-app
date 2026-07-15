import { Types } from "mongoose";
import Account from "@/models/business/Account";
import JournalEntry from "@/models/business/JournalEntry";

// Ekstraksi murni dari app/api/business/companies/[id]/reports/{income-
// statement,balance-sheet,cash-flow}/route.ts — logic TIDAK diubah sama
// sekali, cuma dipindah ke sini biar bisa dipanggil ULANG dari route
// financial-ratios tanpa HTTP round-trip atau duplikasi ke-4. Route asal
// masing-masing tetap pegang auth + query-param parsing sendiri, cuma
// manggil fungsi compute di sini lalu `NextResponse.json(result)`.

export function defaultFiscalYearRange(fiscalYearStartMonth: number) {
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

// Akhir hari ini PER KALENDER WIB (bukan UTC) — dari fix bug Fase 81:
// tanggal transaksi disimpan sebagai UTC-midnight dari tanggal kalender
// yang dipilih user (WIB, UTC+7). Antara jam 00:00-07:00 WIB, kalender
// UTC masih di tanggal sebelumnya — pakai `new Date()` mentah bikin
// transaksi "hari ini" (WIB) kelihatan kayak tanggalnya di masa depan.
export function endOfTodayWIB(): Date {
  const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
  const wibNow = new Date(Date.now() + WIB_OFFSET_MS);
  const end = new Date(
    Date.UTC(wibNow.getUTCFullYear(), wibNow.getUTCMonth(), wibNow.getUTCDate() + 1)
  );
  end.setUTCMilliseconds(-1);
  return end;
}

type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";
type AccountLite = { _id: unknown; code: string; name: string; type: AccountType };

// Akun "kas & setara kas" — asset yang namanya mengandung "kas"/"bank".
export function isCashAccount(account: { type: string; name: string }) {
  return account.type === "asset" && /kas|bank/i.test(account.name);
}

type ReportSection =
  | "operating-revenue"
  | "cogs"
  | "operating-expense"
  | "non-operating-revenue"
  | "non-operating-expense";

export async function computeIncomeStatement(companyId: string, from: Date, to: Date) {
  const rows = await JournalEntry.aggregate([
    { $match: { companyId: new Types.ObjectId(companyId), date: { $gte: from, $lte: to } } },
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

  return {
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
  };
}

type AccountLine = { accountId: string; code: string; name: string; balance: number };

export async function computeBalanceSheet(companyId: string, asOf: Date) {
  const balanceRows = await JournalEntry.aggregate([
    { $match: { companyId: new Types.ObjectId(companyId), date: { $lte: asOf } } },
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
    { $match: { "account.type": { $in: ["asset", "liability", "equity"] } } },
    {
      $group: {
        _id: {
          accountId: "$account._id",
          code: "$account.code",
          name: "$account.name",
          type: "$account.type",
          normalBalance: "$account.normalBalance",
        },
        totalDebit: { $sum: "$lines.debit" },
        totalCredit: { $sum: "$lines.credit" },
      },
    },
  ]);

  const assets: AccountLine[] = [];
  const liabilities: AccountLine[] = [];
  const contributedCapital: AccountLine[] = [];

  for (const row of balanceRows) {
    const balance =
      row._id.normalBalance === "debit"
        ? row.totalDebit - row.totalCredit
        : row.totalCredit - row.totalDebit;
    const line: AccountLine = {
      accountId: row._id.accountId.toString(),
      code: row._id.code,
      name: row._id.name,
      balance,
    };
    if (row._id.type === "asset") assets.push(line);
    else if (row._id.type === "liability") liabilities.push(line);
    else contributedCapital.push(line);
  }

  const incomeRows = await JournalEntry.aggregate([
    { $match: { companyId: new Types.ObjectId(companyId), date: { $lte: asOf } } },
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
        _id: null,
        netCredit: { $sum: { $subtract: ["$lines.credit", "$lines.debit"] } },
      },
    },
  ]);
  const retainedEarnings = incomeRows[0]?.netCredit ?? 0;

  const assetsTotal = assets.reduce((s, a) => s + a.balance, 0);
  const liabilitiesTotal = liabilities.reduce((s, a) => s + a.balance, 0);
  const contributedCapitalTotal = contributedCapital.reduce((s, a) => s + a.balance, 0);
  const equityTotal = contributedCapitalTotal + retainedEarnings;
  const totalLiabilitiesAndEquity = liabilitiesTotal + equityTotal;

  return {
    asOf,
    assets: { byAccount: assets, total: assetsTotal },
    liabilities: { byAccount: liabilities, total: liabilitiesTotal },
    equity: {
      contributedCapital: { byAccount: contributedCapital, total: contributedCapitalTotal },
      retainedEarnings,
      total: equityTotal,
    },
    totalLiabilitiesAndEquity,
    isBalanced: Math.round(assetsTotal * 100) === Math.round(totalLiabilitiesAndEquity * 100),
  };
}

export async function computeCashFlow(companyId: string, from: Date, to: Date) {
  const accounts = await Account.find({ companyId });
  const accountById = new Map(accounts.map((a) => [a._id.toString(), a as unknown as AccountLite]));

  const priorEntries = await JournalEntry.find({ companyId, date: { $lt: from } });
  let beginningCash = 0;
  for (const entry of priorEntries) {
    for (const line of entry.lines) {
      const acc = accountById.get(line.accountId.toString());
      if (acc && isCashAccount(acc)) beginningCash += line.debit - line.credit;
    }
  }

  const periodEntries = await JournalEntry.find({
    companyId,
    date: { $gte: from, $lte: to },
  });

  let periodCashDelta = 0;
  let operatingTotal = 0;
  let financingTotal = 0;
  const operatingByAccount = new Map<string, { code: string; name: string; amount: number }>();
  const financingByAccount = new Map<string, { code: string; name: string; amount: number }>();

  for (const entry of periodEntries) {
    const touchesCash = entry.lines.some((l: { accountId: unknown }) => {
      const a = accountById.get(String(l.accountId));
      return a ? isCashAccount(a) : false;
    });
    if (!touchesCash) continue;

    for (const line of entry.lines) {
      const acc = accountById.get(line.accountId.toString());
      if (!acc) continue;

      if (isCashAccount(acc)) {
        periodCashDelta += line.debit - line.credit;
        continue;
      }

      const contribution = line.credit - line.debit;
      if (contribution === 0) continue;

      const key = acc._id!.toString();
      if (acc.type === "equity") {
        financingTotal += contribution;
        const existing = financingByAccount.get(key) ?? { code: acc.code, name: acc.name, amount: 0 };
        existing.amount += contribution;
        financingByAccount.set(key, existing);
      } else {
        operatingTotal += contribution;
        const existing = operatingByAccount.get(key) ?? { code: acc.code, name: acc.name, amount: 0 };
        existing.amount += contribution;
        operatingByAccount.set(key, existing);
      }
    }
  }

  const investingTotal = 0;
  const netCashFlow = operatingTotal + investingTotal + financingTotal;
  const endingCash = beginningCash + periodCashDelta;

  return {
    from,
    to,
    beginningCash,
    operating: { total: operatingTotal, byAccount: [...operatingByAccount.values()] },
    investing: { total: investingTotal },
    financing: { total: financingTotal, byAccount: [...financingByAccount.values()] },
    netCashFlow,
    endingCash,
    isBalanced: Math.round(netCashFlow * 100) === Math.round(periodCashDelta * 100),
  };
}

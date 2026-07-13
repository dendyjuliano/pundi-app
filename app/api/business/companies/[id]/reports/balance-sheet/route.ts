import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getCurrentUser } from "@/lib/session";
import { resolveCompanyAccess } from "@/lib/business/access";
import Company from "@/models/business/Company";
import JournalEntry from "@/models/business/JournalEntry";

type AccountLine = { accountId: string; code: string; name: string; balance: number };

export async function GET(
  request: Request,
  ctx: RouteContext<"/api/business/companies/[id]/reports/balance-sheet">
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
  const asOfParam = searchParams.get("asOf");
  let asOf: Date;
  if (asOfParam) {
    asOf = new Date(asOfParam);
  } else {
    // Default ke AKHIR HARI INI PER KALENDER WIB, bukan `new Date()`
    // mentah atau kalender UTC — tanggal transaksi disimpan sebagai
    // UTC-midnight dari tanggal kalender yang dipilih user di date
    // picker (mis. "13 Jul" -> 2026-07-13T00:00:00Z, WIB = UTC+7). Antara
    // jam 00:00-07:00 WIB, kalender UTC masih di TANGGAL SEBELUMNYA —
    // kalau acuannya kalender UTC (bukan WIB), transaksi yang baru saja
    // dicatat "hari ini" (WIB) kelihatan kayak "tanggalnya di masa depan"
    // dan hilang dari Neraca. Pola geser +7 jam sama persis `wibNow()` di
    // app/api/cron/daily-reminder/route.ts.
    const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
    const wibNow = new Date(Date.now() + WIB_OFFSET_MS);
    asOf = new Date(
      Date.UTC(wibNow.getUTCFullYear(), wibNow.getUTCMonth(), wibNow.getUTCDate() + 1)
    );
    asOf.setUTCMilliseconds(-1);
  }
  if (isNaN(asOf.getTime())) {
    return NextResponse.json({ error: "invalid asOf" }, { status: 400 });
  }

  // Neraca itu snapshot per SATU tanggal (bukan rentang seperti Laporan
  // Laba Rugi) — semua baris jurnal sejak perusahaan berdiri s/d asOf
  // dihitung, tidak ada batas bawah.
  const balanceRows = await JournalEntry.aggregate([
    { $match: { companyId: new Types.ObjectId(id), date: { $lte: asOf } } },
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

  // Laba Ditahan (retained earnings) — kumulatif net income SEJAK AWAL
  // s/d asOf, bukan cuma tahun fiskal berjalan seperti Laporan Laba Rugi.
  // App ini tidak punya proses tutup buku (closing entries) yang mereset
  // akun revenue/expense tiap akhir periode, jadi supaya Neraca tetap
  // balance (Aset = Utang + Modal), sisi Modal harus mencerminkan SEMUA
  // laba/rugi yang pernah terjadi, bukan cuma periode ini. Reuse pola
  // aggregation sama persis reports/income-statement/route.ts.
  const incomeRows = await JournalEntry.aggregate([
    { $match: { companyId: new Types.ObjectId(id), date: { $lte: asOf } } },
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
  // netCredit positif buat akun revenue (credit > debit = pendapatan),
  // negatif buat akun expense (debit > credit = beban) — jumlahnya
  // langsung jadi net income tanpa perlu pisah revenue/expense dulu.
  const retainedEarnings = incomeRows[0]?.netCredit ?? 0;

  const assetsTotal = assets.reduce((s, a) => s + a.balance, 0);
  const liabilitiesTotal = liabilities.reduce((s, a) => s + a.balance, 0);
  const contributedCapitalTotal = contributedCapital.reduce((s, a) => s + a.balance, 0);
  const equityTotal = contributedCapitalTotal + retainedEarnings;
  const totalLiabilitiesAndEquity = liabilitiesTotal + equityTotal;

  return NextResponse.json({
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
  });
}

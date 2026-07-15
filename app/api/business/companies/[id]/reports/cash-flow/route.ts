import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { resolveCompanyAccess } from "@/lib/business/access";
import Company from "@/models/business/Company";
import Account from "@/models/business/Account";
import JournalEntry from "@/models/business/JournalEntry";

type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";
type AccountLite = { _id: unknown; code: string; name: string; type: AccountType };

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

// Akun "kas & setara kas" — asset yang namanya mengandung "kas"/"bank".
// Pola sama findAccount/cashCandidates yang sudah dipakai transactions/new
// & onboarding, cuma di sini dipakai buat KLASIFIKASI bukan pemilihan.
function isCashAccount(account: AccountLite) {
  return account.type === "asset" && /kas|bank/i.test(account.name);
}

export async function GET(
  request: Request,
  ctx: RouteContext<"/api/business/companies/[id]/reports/cash-flow">
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

  const accounts = await Account.find({ companyId: id });
  const accountById = new Map(accounts.map((a) => [a._id.toString(), a as AccountLite]));

  // Metode langsung (direct method) — karena semua transaksi sudah
  // tercatat double-entry, arus kas dihitung langsung dari baris jurnal,
  // bukan direkonstruksi dari selisih Neraca (metode tidak langsung) yang
  // baru relevan kalau app ini someday nyimpen data non-kas kompleks
  // (mis. depresiasi) yang butuh disesuaikan balik.
  const priorEntries = await JournalEntry.find({ companyId: id, date: { $lt: from } });
  let beginningCash = 0;
  for (const entry of priorEntries) {
    for (const line of entry.lines) {
      const acc = accountById.get(line.accountId.toString());
      if (acc && isCashAccount(acc)) beginningCash += line.debit - line.credit;
    }
  }

  const periodEntries = await JournalEntry.find({
    companyId: id,
    date: { $gte: from, $lte: to },
  });

  let periodCashDelta = 0;
  let operatingTotal = 0;
  let financingTotal = 0;
  const operatingByAccount = new Map<string, { code: string; name: string; amount: number }>();
  const financingByAccount = new Map<string, { code: string; name: string; amount: number }>();

  for (const entry of periodEntries) {
    // Entry yang sama sekali tidak nyentuh akun kas (mis. akrual murni:
    // debit Beban / kredit Utang Usaha, belum dibayar) TIDAK boleh masuk
    // Arus Kas sama sekali — kalau tetap diproses, baris non-kas-nya
    // akan saling meniadakan di TOTAL tapi tetap muncul individual di
    // byAccount, padahal tidak ada kas yang beneran bergerak.
    const touchesCash = entry.lines.some((l: { accountId: unknown }) => {
      const a = accountById.get(String(l.accountId));
      return a ? isCashAccount(a) : false;
    });
    if (!touchesCash) continue;

    for (const line of entry.lines) {
      const acc = accountById.get(line.accountId.toString());
      if (!acc) continue;

      if (isCashAccount(acc)) {
        // Transfer antar-akun kas (mis. setor dari Kas ke Bank) otomatis
        // saling meniadakan di sini (dua baris kas dalam satu entry),
        // sama seperti seharusnya di Laporan Arus Kas asli — bukan
        // aktivitas kas masuk/keluar yang beneran.
        periodCashDelta += line.debit - line.credit;
        continue;
      }

      // Baris NON-kas adalah "lawan" dari pergerakan kas — kontribusinya
      // ke arus kas adalah kebalikan sisi debit/kreditnya sendiri (karena
      // total debit = total kredit se-entry, jumlah kontribusi baris
      // non-kas persis sama besar dengan total pergerakan baris kas).
      const contribution = line.credit - line.debit;
      if (contribution === 0) continue;

      const key = acc._id!.toString();
      if (acc.type === "equity") {
        financingTotal += contribution;
        const existing = financingByAccount.get(key) ?? { code: acc.code, name: acc.name, amount: 0 };
        existing.amount += contribution;
        financingByAccount.set(key, existing);
      } else {
        // revenue, expense, asset non-kas (Piutang/Persediaan), liability
        // — semua dianggap Aktivitas Operasi, sejalan sama standar
        // akuntansi (perubahan piutang/persediaan/utang usaha memang
        // bagian arus kas operasi, bukan investasi/pendanaan)
        operatingTotal += contribution;
        const existing = operatingByAccount.get(key) ?? { code: acc.code, name: acc.name, amount: 0 };
        existing.amount += contribution;
        operatingByAccount.set(key, existing);
      }
    }
  }

  // Aktivitas Investasi selalu 0 buat sekarang — Chart of Accounts belum
  // punya akun Aset Tetap (di luar scope sampai modul itu ada), tapi
  // seksi ini tetap ditampilkan biar format laporan konsisten sama
  // standar 3-aktivitas yang biasa dicari bank/investor.
  const investingTotal = 0;
  const netCashFlow = operatingTotal + investingTotal + financingTotal;
  const endingCash = beginningCash + periodCashDelta;

  return NextResponse.json({
    from,
    to,
    beginningCash,
    operating: { total: operatingTotal, byAccount: [...operatingByAccount.values()] },
    investing: { total: investingTotal },
    financing: { total: financingTotal, byAccount: [...financingByAccount.values()] },
    netCashFlow,
    endingCash,
    // Sanity check: rekonstruksi arus kas dari baris non-kas (operating+
    // investing+financing) HARUS persis sama dengan pergerakan baris kas
    // langsung (periodCashDelta) — kalau beda, ada bug klasifikasi.
    isBalanced: Math.round(netCashFlow * 100) === Math.round(periodCashDelta * 100),
  });
}

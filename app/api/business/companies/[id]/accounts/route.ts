import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getCurrentUser } from "@/lib/session";
import { resolveCompanyAccess } from "@/lib/business/access";
import Account from "@/models/business/Account";
import JournalEntry from "@/models/business/JournalEntry";

const DEBIT_NORMAL_TYPES = new Set(["asset", "expense"]);
const REPORT_SECTIONS = new Set([
  "operating-revenue",
  "cogs",
  "operating-expense",
  "non-operating-revenue",
  "non-operating-expense",
]);

export async function GET(
  request: Request,
  ctx: RouteContext<"/api/business/companies/[id]/accounts">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const access = await resolveCompanyAccess(user.id, id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const activeOnly = searchParams.get("activeOnly") === "true";

  const filter: Record<string, unknown> = { companyId: id };
  if (type) filter.type = type;
  if (activeOnly) filter.isActive = true;

  const accounts = await Account.find(filter).sort({ code: 1 });

  // Saldo dihitung on-the-fly dari SEMUA baris jurnal per akun, satu
  // aggregate buat semua akun sekaligus (bukan N+1) — tidak pernah
  // disimpan/di-cache di dokumen Account.
  const totals = await JournalEntry.aggregate([
    { $match: { companyId: new Types.ObjectId(id) } },
    { $unwind: "$lines" },
    {
      $group: {
        _id: "$lines.accountId",
        totalDebit: { $sum: "$lines.debit" },
        totalCredit: { $sum: "$lines.credit" },
      },
    },
  ]);
  const totalsByAccountId = new Map(
    totals.map((t) => [t._id.toString(), t])
  );

  const result = accounts.map((a) => {
    const t = totalsByAccountId.get(a._id.toString()) ?? {
      totalDebit: 0,
      totalCredit: 0,
    };
    const balance =
      a.normalBalance === "debit"
        ? t.totalDebit - t.totalCredit
        : t.totalCredit - t.totalDebit;
    return { ...a.toObject(), balance };
  });

  return NextResponse.json(result);
}

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/business/companies/[id]/accounts">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const access = await resolveCompanyAccess(user.id, id, {
    minRole: "accountant",
  });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await request.json();
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const type = body.type;
  const reportSection = body.reportSection;
  const costBehavior = body.costBehavior;
  const parentId =
    typeof body.parentId === "string" && body.parentId ? body.parentId : undefined;

  if (!code) return NextResponse.json({ error: "code is required" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!["asset", "liability", "equity", "revenue", "expense"].includes(type)) {
    return NextResponse.json({ error: "invalid type" }, { status: 400 });
  }
  if (
    (type === "revenue" || type === "expense") &&
    !REPORT_SECTIONS.has(reportSection)
  ) {
    return NextResponse.json(
      { error: "reportSection is required for revenue/expense accounts" },
      { status: 400 }
    );
  }
  if (
    costBehavior !== undefined &&
    !["fixed", "variable"].includes(costBehavior)
  ) {
    return NextResponse.json({ error: "invalid costBehavior" }, { status: 400 });
  }

  const existing = await Account.findOne({ companyId: id, code });
  if (existing) {
    return NextResponse.json(
      { error: "Kode akun sudah dipakai" },
      { status: 409 }
    );
  }

  const account = await Account.create({
    companyId: id,
    code,
    name,
    type,
    normalBalance: DEBIT_NORMAL_TYPES.has(type) ? "debit" : "credit",
    reportSection:
      type === "revenue" || type === "expense" ? reportSection : undefined,
    costBehavior: type === "expense" ? costBehavior : undefined,
    parentId,
    isSystemDefault: false,
  });
  return NextResponse.json(account, { status: 201 });
}

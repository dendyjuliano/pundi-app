import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import { resolveCompanyAccess } from "@/lib/business/access";
import Account from "@/models/business/Account";
import RecurringBusinessExpense from "@/models/business/RecurringBusinessExpense";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/business/companies/[id]/recurring-expenses">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const access = await resolveCompanyAccess(user.id, id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  await connectToDatabase();
  const items = await RecurringBusinessExpense.find({ companyId: id }).sort({
    createdAt: 1,
  });
  return NextResponse.json(items);
}

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/business/companies/[id]/recurring-expenses">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const access = await resolveCompanyAccess(user.id, id, { minRole: "accountant" });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const amount = Number(body.amount);
  const accountId = typeof body.accountId === "string" ? body.accountId : "";
  const cashAccountId = typeof body.cashAccountId === "string" ? body.cashAccountId : "";
  const dayOfMonth = Number(body.dayOfMonth);
  const frequency = body.frequency === "yearly" ? "yearly" : "monthly";

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "amount must be a positive number" },
      { status: 400 }
    );
  }
  if (!accountId || !cashAccountId) {
    return NextResponse.json(
      { error: "accountId and cashAccountId are required" },
      { status: 400 }
    );
  }
  if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
    return NextResponse.json(
      { error: "dayOfMonth must be an integer between 1 and 31" },
      { status: 400 }
    );
  }

  let month: number | undefined;
  if (frequency === "yearly") {
    month = Number(body.month);
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json(
        { error: "month is required (1-12) when frequency is yearly" },
        { status: 400 }
      );
    }
  }

  await connectToDatabase();

  const accounts = await Account.find({
    companyId: id,
    _id: { $in: [accountId, cashAccountId] },
    isActive: true,
  });
  if (accounts.length !== new Set([accountId, cashAccountId]).size) {
    return NextResponse.json(
      { error: "accountId or cashAccountId is invalid, inactive, or not in this company" },
      { status: 400 }
    );
  }

  const item = await RecurringBusinessExpense.create({
    companyId: id,
    createdBy: user.id,
    name,
    amount,
    accountId,
    cashAccountId,
    dayOfMonth,
    frequency,
    month,
  });
  return NextResponse.json(item, { status: 201 });
}

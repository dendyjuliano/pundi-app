import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import { resolveCompanyAccess } from "@/lib/business/access";
import Account from "@/models/business/Account";
import RecurringBusinessExpense from "@/models/business/RecurringBusinessExpense";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/business/companies/[id]/recurring-expenses/[recurringId]">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, recurringId } = await ctx.params;
  const access = await resolveCompanyAccess(user.id, id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  await connectToDatabase();
  const item = await RecurringBusinessExpense.findOne({ _id: recurringId, companyId: id });
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(item);
}

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/business/companies/[id]/recurring-expenses/[recurringId]">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, recurringId } = await ctx.params;
  const access = await resolveCompanyAccess(user.id, id, { minRole: "accountant" });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await request.json();
  const update: {
    name?: string;
    amount?: number;
    accountId?: string;
    cashAccountId?: string;
    dayOfMonth?: number;
    active?: boolean;
    frequency?: "monthly" | "yearly";
    month?: number | null;
  } = {};

  if (typeof body.name === "string" && body.name.trim()) {
    update.name = body.name.trim();
  }
  if (body.amount !== undefined) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "amount must be a positive number" },
        { status: 400 }
      );
    }
    update.amount = amount;
  }
  if (body.dayOfMonth !== undefined) {
    const dayOfMonth = Number(body.dayOfMonth);
    if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
      return NextResponse.json(
        { error: "dayOfMonth must be an integer between 1 and 31" },
        { status: 400 }
      );
    }
    update.dayOfMonth = dayOfMonth;
  }
  if (typeof body.active === "boolean") {
    update.active = body.active;
  }
  if (body.frequency !== undefined) {
    if (body.frequency !== "monthly" && body.frequency !== "yearly") {
      return NextResponse.json(
        { error: "frequency must be 'monthly' or 'yearly'" },
        { status: 400 }
      );
    }
    update.frequency = body.frequency;
    if (body.frequency === "yearly") {
      const month = Number(body.month);
      if (!Number.isInteger(month) || month < 1 || month > 12) {
        return NextResponse.json(
          { error: "month is required (1-12) when frequency is yearly" },
          { status: 400 }
        );
      }
      update.month = month;
    } else {
      update.month = null;
    }
  } else if (body.month !== undefined) {
    const month = Number(body.month);
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json(
        { error: "month must be an integer between 1 and 12" },
        { status: 400 }
      );
    }
    update.month = month;
  }

  if (body.accountId !== undefined || body.cashAccountId !== undefined) {
    const accountId = typeof body.accountId === "string" ? body.accountId : undefined;
    const cashAccountId =
      typeof body.cashAccountId === "string" ? body.cashAccountId : undefined;
    const idsToCheck = [accountId, cashAccountId].filter(Boolean) as string[];

    await connectToDatabase();
    const accounts = await Account.find({
      companyId: id,
      _id: { $in: idsToCheck },
      isActive: true,
    });
    if (accounts.length !== new Set(idsToCheck).size) {
      return NextResponse.json(
        { error: "accountId or cashAccountId is invalid, inactive, or not in this company" },
        { status: 400 }
      );
    }
    if (accountId) update.accountId = accountId;
    if (cashAccountId) update.cashAccountId = cashAccountId;
  }

  await connectToDatabase();
  const item = await RecurringBusinessExpense.findOneAndUpdate(
    { _id: recurringId, companyId: id },
    update,
    { new: true }
  );
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(item);
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/business/companies/[id]/recurring-expenses/[recurringId]">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, recurringId } = await ctx.params;
  const access = await resolveCompanyAccess(user.id, id, { minRole: "accountant" });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  await connectToDatabase();
  const result = await RecurringBusinessExpense.findOneAndDelete({
    _id: recurringId,
    companyId: id,
  });
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}

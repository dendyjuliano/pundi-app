import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import RecurringExpense from "@/models/RecurringExpense";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/recurring-expenses/[id]">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await connectToDatabase();
  const item = await RecurringExpense.findOne({ _id: id, userId: user.id });
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(item);
}

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/recurring-expenses/[id]">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await request.json();

  const update: {
    name?: string;
    amount?: number;
    dayOfMonth?: number;
    active?: boolean;
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

  await connectToDatabase();
  const item = await RecurringExpense.findOneAndUpdate(
    { _id: id, userId: user.id },
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
  ctx: RouteContext<"/api/recurring-expenses/[id]">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await connectToDatabase();
  const result = await RecurringExpense.findOneAndDelete({
    _id: id,
    userId: user.id,
  });
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}

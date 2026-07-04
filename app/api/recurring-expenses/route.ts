import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import RecurringExpense from "@/models/RecurringExpense";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectToDatabase();
  const items = await RecurringExpense.find({ userId: user.id }).sort({
    createdAt: 1,
  });
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const amount = Number(body.amount);
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
  const item = await RecurringExpense.create({
    userId: user.id,
    name,
    amount,
    dayOfMonth,
    frequency,
    month,
  });
  return NextResponse.json(item, { status: 201 });
}

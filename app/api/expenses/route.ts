import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import Expense from "@/models/Expense";

const VALID_CATEGORIES = ["makan", "lain-lain"];

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const month = searchParams.get("month");

  const query: Record<string, unknown> = { userId: user.id };
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    query.date = {
      $gte: new Date(y, m - 1, 1),
      $lte: new Date(y, m, 0, 23, 59, 59, 999),
    };
  } else if (from || to) {
    const dateFilter: Record<string, Date> = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);
    query.date = dateFilter;
  }

  await connectToDatabase();
  const expenses = await Expense.find(query).sort({ date: -1, createdAt: -1 });
  return NextResponse.json(expenses);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { date, category, note } = body;
  const amount = Number(body.amount);

  if (!date || isNaN(new Date(date).getTime())) {
    return NextResponse.json({ error: "invalid date" }, { status: 400 });
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "invalid category" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "amount must be a positive number" },
      { status: 400 }
    );
  }
  if (category === "lain-lain" && !(typeof note === "string" && note.trim())) {
    return NextResponse.json(
      { error: "note is required for kategori lain-lain" },
      { status: 400 }
    );
  }

  await connectToDatabase();
  const expense = await Expense.create({
    userId: user.id,
    date: new Date(date),
    category,
    amount,
    note: typeof note === "string" ? note.trim() : undefined,
  });
  return NextResponse.json(expense, { status: 201 });
}

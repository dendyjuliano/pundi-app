import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import SavingsGoal from "@/models/SavingsGoal";
import SavingsContribution from "@/models/SavingsContribution";
import Expense from "@/models/Expense";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/savings-goals/[id]/contributions">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await connectToDatabase();
  const contributions = await SavingsContribution.find({
    goalId: id,
    userId: user.id,
  }).sort({ date: -1, createdAt: -1 });
  return NextResponse.json(contributions);
}

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/savings-goals/[id]/contributions">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  await connectToDatabase();
  const goal = await SavingsGoal.findOne({ _id: id, userId: user.id });
  if (!goal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const body = await request.json();
  const amount = Number(body.amount);
  const date = body.date ? new Date(body.date) : new Date();
  const note = typeof body.note === "string" ? body.note.trim() : undefined;

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "amount must be a positive number" },
      { status: 400 }
    );
  }
  if (isNaN(date.getTime())) {
    return NextResponse.json({ error: "invalid date" }, { status: 400 });
  }

  // Kontribusi otomatis ikut tercatat sebagai Expense kategori
  // "lain-lain" — biar Total Bersih/sisa budget di Dashboard ikut
  // berkurang (uang yang disisihkan buat nabung memang sudah "keluar"
  // dari yang bisa dibelanjakan), bukan cuma progress goal-nya doang.
  const expense = await Expense.create({
    userId: user.id,
    date,
    category: "lain-lain",
    amount,
    note: `Nabung: ${goal.name}`,
  });

  const contribution = await SavingsContribution.create({
    userId: user.id,
    goalId: id,
    amount,
    date,
    note,
    expenseId: expense._id,
  });
  return NextResponse.json(contribution, { status: 201 });
}

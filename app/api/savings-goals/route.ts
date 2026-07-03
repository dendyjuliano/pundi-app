import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import SavingsGoal from "@/models/SavingsGoal";
import SavingsContribution from "@/models/SavingsContribution";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectToDatabase();
  const goals = await SavingsGoal.find({ userId: user.id }).sort({
    createdAt: 1,
  });

  // Progress dihitung on-the-fly dari total kontribusi tiap goal, bukan
  // field ter-cache — pola yang sama dengan getMonthBreakdown yang
  // menjumlah Expense langsung tiap request.
  const totals = await SavingsContribution.aggregate([
    { $match: { userId: new Types.ObjectId(user.id) } },
    { $group: { _id: "$goalId", total: { $sum: "$amount" } } },
  ]);
  const totalsByGoalId = new Map(
    totals.map((t) => [t._id.toString(), t.total as number])
  );

  const result = goals.map((g) => ({
    _id: g._id,
    name: g.name,
    targetAmount: g.targetAmount,
    targetDate: g.targetDate,
    contributed: totalsByGoalId.get(g._id.toString()) ?? 0,
  }));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const targetAmount = Number(body.targetAmount);
  const targetDate = body.targetDate ? new Date(body.targetDate) : undefined;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    return NextResponse.json(
      { error: "targetAmount must be a positive number" },
      { status: 400 }
    );
  }
  if (targetDate && isNaN(targetDate.getTime())) {
    return NextResponse.json({ error: "invalid targetDate" }, { status: 400 });
  }

  await connectToDatabase();
  const goal = await SavingsGoal.create({
    userId: user.id,
    name,
    targetAmount,
    targetDate,
  });
  return NextResponse.json(goal, { status: 201 });
}

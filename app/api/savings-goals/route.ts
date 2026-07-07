import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { canEditSavingsGoal, getCurrentUser } from "@/lib/session";
import { validateFriendCollaboratorIds } from "@/lib/friendship";
import SavingsGoal from "@/models/SavingsGoal";
import SavingsContribution from "@/models/SavingsContribution";
import UserModel from "@/models/User";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectToDatabase();
  // Goal Pribadi milik sendiri + goal Bersama siapa saja di family yang
  // sama + goal apapun yang nambahin diri sendiri sebagai kolaborator
  // teman — lihat canAccessSavingsGoal/canEditSavingsGoal di
  // lib/session.ts buat aturan lengkapnya.
  const goals = await SavingsGoal.find({
    $or: [
      { userId: user.id },
      { familyId: user.familyId, shared: true },
      { friendCollaboratorIds: user.id },
    ],
  }).sort({ createdAt: 1 });

  // Progress dihitung on-the-fly dari total kontribusi tiap goal (dari
  // SEMUA kontributor, bukan cuma diri sendiri, buat goal Bersama), pola
  // yang sama dengan getMonthBreakdown yang menjumlah Expense langsung
  // tiap request.
  const goalIds = goals.map((g) => g._id);
  const totals = await SavingsContribution.aggregate([
    { $match: { goalId: { $in: goalIds } } },
    { $group: { _id: "$goalId", total: { $sum: "$amount" } } },
  ]);
  const totalsByGoalId = new Map(
    totals.map((t) => [t._id.toString(), t.total as number])
  );

  const allFriendCollaboratorIds = [
    ...new Set(goals.flatMap((g) => g.friendCollaboratorIds.map(String))),
  ];
  const friendUsers = await UserModel.find({
    _id: { $in: allFriendCollaboratorIds },
  });
  const friendNameById = new Map(
    friendUsers.map((u) => [u._id.toString(), u.name])
  );

  const result = goals.map((g) => ({
    _id: g._id,
    name: g.name,
    targetAmount: g.targetAmount,
    targetDate: g.targetDate,
    shared: g.shared,
    isOwner: g.userId.toString() === user.id,
    canManage: canEditSavingsGoal(g, user),
    contributed: totalsByGoalId.get(g._id.toString()) ?? 0,
    friendCollaborators: g.friendCollaboratorIds.map((id: { toString(): string }) => ({
      id: id.toString(),
      name: friendNameById.get(id.toString()) ?? "Teman",
    })),
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
  const shared = body.shared === true;
  const friendCollaboratorIds = Array.isArray(body.friendCollaboratorIds)
    ? (body.friendCollaboratorIds as unknown[]).filter(
        (id): id is string => typeof id === "string"
      )
    : [];

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

  const friendCheck = await validateFriendCollaboratorIds(
    user.id,
    friendCollaboratorIds
  );
  if (!friendCheck.ok) {
    return NextResponse.json({ error: friendCheck.error }, { status: 400 });
  }

  const goal = await SavingsGoal.create({
    userId: user.id,
    familyId: user.familyId,
    shared,
    friendCollaboratorIds,
    name,
    targetAmount,
    targetDate,
  });
  return NextResponse.json(goal, { status: 201 });
}

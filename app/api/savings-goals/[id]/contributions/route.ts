import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { canAccessSavingsGoal, getCurrentUser } from "@/lib/session";
import { formatRupiah } from "@/lib/format";
import { sendPushToUsers } from "@/lib/push";
import SavingsGoal from "@/models/SavingsGoal";
import SavingsContribution from "@/models/SavingsContribution";
import Expense from "@/models/Expense";
import UserModel from "@/models/User";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/savings-goals/[id]/contributions">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await connectToDatabase();
  const goal = await SavingsGoal.findById(id);
  if (!goal || !canAccessSavingsGoal(goal, user)) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  // Goal Bersama dikontribusi banyak anggota — kembalikan kontribusi dari
  // SEMUA kontributor (bukan cuma diri sendiri), di-enrich nama kontributor
  // buat ditampilkan di riwayat.
  const contributions = await SavingsContribution.find({
    goalId: id,
  }).sort({ date: -1, createdAt: -1 });

  const contributorIds = [...new Set(contributions.map((c) => c.userId.toString()))];
  const contributors = await UserModel.find({ _id: { $in: contributorIds } });
  const nameById = new Map(
    contributors.map((u) => [u._id.toString(), u.name])
  );

  const result = contributions.map((c) => ({
    _id: c._id,
    amount: c.amount,
    date: c.date,
    note: c.note,
    userId: c.userId,
    contributorName: nameById.get(c.userId.toString()) ?? "Anggota",
  }));

  return NextResponse.json(result);
}

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/savings-goals/[id]/contributions">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  await connectToDatabase();
  const goal = await SavingsGoal.findById(id);
  if (!goal || !canAccessSavingsGoal(goal, user)) {
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

  // Goal Bersama — kabari anggota keluarga LAIN (bukan diri sendiri) lewat
  // push notification, biar progress kontribusi kelihatan real-time tanpa
  // mereka harus buka halaman Target duluan. Best-effort: kegagalan kirim
  // push (mis. VAPID belum diset, subscription sudah tidak valid) TIDAK
  // boleh menggagalkan response kontribusi utama yang sudah sukses tersimpan.
  if (goal.shared) {
    try {
      const familyMembers = await UserModel.find({ familyId: user.familyId });
      const contributorName =
        familyMembers.find((u) => u._id.toString() === user.id)?.name ??
        "Anggota";
      const otherMemberIds = familyMembers
        .filter((u) => u._id.toString() !== user.id)
        .map((u) => u._id.toString());

      const totals = await SavingsContribution.aggregate([
        { $match: { goalId: goal._id } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);
      const totalContributed = totals[0]?.total ?? 0;
      const progressPct =
        goal.targetAmount > 0
          ? Math.min(100, Math.round((totalContributed / goal.targetAmount) * 100))
          : 0;

      await sendPushToUsers(otherMemberIds, {
        title: "Pundi",
        body: `${contributorName} baru menambah ${formatRupiah(
          amount
        )} ke "${goal.name}" — total kini ${progressPct}%`,
        url: "/target",
      });
    } catch {
      // best-effort, tidak menggagalkan response kontribusi utama
    }
  }

  return NextResponse.json(contribution, { status: 201 });
}

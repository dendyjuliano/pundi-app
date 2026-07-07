import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { canEditSavingsGoal, getCurrentUser } from "@/lib/session";
import SavingsGoal from "@/models/SavingsGoal";
import SavingsContribution from "@/models/SavingsContribution";
import Expense from "@/models/Expense";

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/savings-goals/[id]/contributions/[contributionId]">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, contributionId } = await ctx.params;
  await connectToDatabase();

  const contribution = await SavingsContribution.findOne({
    _id: contributionId,
    goalId: id,
  });
  if (!contribution) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Boleh hapus kalau kontribusi milik sendiri, ATAU kalau kamu pemilik
  // goal/admin keluarga (goal Bersama) — biar salah catat kontribusi
  // anggota lain bisa dikoreksi pengelola goal, bukan cuma si pencatat.
  const goal = await SavingsGoal.findById(id);
  const isOwnContribution = contribution.userId.toString() === user.id;
  if (!goal || (!isOwnContribution && !canEditSavingsGoal(goal, user))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await contribution.deleteOne();

  // Hapus kontribusi = koreksi "ini salah catat" — Expense yang otomatis
  // ke-link ikut dihapus juga, beda dari hapus GOAL (lihat [id]/route.ts)
  // yang sengaja TIDAK menghapus Expense historis yang sudah tercatat.
  // Dihapus TANPA filter userId — Expense-nya milik SI KONTRIBUTOR
  // (bisa beda dari yang menghapus, kalau penghapusnya pengelola goal).
  if (contribution.expenseId) {
    await Expense.deleteOne({ _id: contribution.expenseId });
  }

  return NextResponse.json({ success: true });
}

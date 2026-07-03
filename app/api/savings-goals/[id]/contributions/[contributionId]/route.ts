import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
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
  const result = await SavingsContribution.findOneAndDelete({
    _id: contributionId,
    goalId: id,
    userId: user.id,
  });
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Hapus kontribusi = koreksi "ini salah catat" — Expense yang otomatis
  // ke-link ikut dihapus juga, beda dari hapus GOAL (lihat [id]/route.ts)
  // yang sengaja TIDAK menghapus Expense historis yang sudah tercatat.
  if (result.expenseId) {
    await Expense.deleteOne({ _id: result.expenseId, userId: user.id });
  }

  return NextResponse.json({ success: true });
}

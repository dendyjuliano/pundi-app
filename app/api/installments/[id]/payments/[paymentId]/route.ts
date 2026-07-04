import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import Installment from "@/models/Installment";
import InstallmentPayment from "@/models/InstallmentPayment";
import Expense from "@/models/Expense";

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/installments/[id]/payments/[paymentId]">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, paymentId } = await ctx.params;
  await connectToDatabase();
  const result = await InstallmentPayment.findOneAndDelete({
    _id: paymentId,
    installmentId: id,
    userId: user.id,
  });
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Hapus payment = koreksi "ini salah catat" — Expense yang otomatis
  // ke-link ikut dihapus juga.
  if (result.expenseId) {
    await Expense.deleteOne({ _id: result.expenseId, userId: user.id });
  }

  // Kalau cicilan ini sebelumnya ke-mark lunas gara-gara payment yang
  // baru dihapus, balikin ke aktif lagi (progress-nya sekarang sudah di
  // bawah tenor, jadi belum benar-benar lunas).
  const installment = await Installment.findOne({ _id: id, userId: user.id });
  if (installment && !installment.active) {
    const monthsPaid = await InstallmentPayment.countDocuments({
      installmentId: id,
    });
    if (monthsPaid < installment.tenorMonths) {
      installment.active = true;
      await installment.save();
    }
  }

  return NextResponse.json({ success: true });
}

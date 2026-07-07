import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import SplitBill from "@/models/SplitBill";
import SplitBillShare from "@/models/SplitBillShare";
import UserModel from "@/models/User";

async function canAccess(billId: string, userId: string) {
  const share = await SplitBillShare.findOne({
    splitBillId: billId,
    userId,
  });
  return !!share;
}

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/split-bills/[id]">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await connectToDatabase();
  const bill = await SplitBill.findById(id);
  if (!bill || !(await canAccess(id, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const shares = await SplitBillShare.find({ splitBillId: id }).sort({
    createdAt: 1,
  });
  const participants = await UserModel.find({
    _id: { $in: shares.map((s) => s.userId) },
  });
  const nameById = new Map(participants.map((p) => [p._id.toString(), p.name]));

  return NextResponse.json({
    _id: bill._id,
    name: bill.name,
    subtotal: bill.subtotal,
    taxPercent: bill.taxPercent,
    totalAmount: bill.totalAmount,
    date: bill.date,
    payerId: bill.payerId,
    isPayer: bill.payerId.toString() === user.id,
    shares: shares.map((s) => ({
      _id: s._id,
      userId: s.userId,
      name: nameById.get(s.userId.toString()) ?? "Anggota",
      amount: s.amount,
      settled: s.settled,
      settledAt: s.settledAt,
      isMe: s.userId.toString() === user.id,
    })),
  });
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/split-bills/[id]">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await connectToDatabase();
  const bill = await SplitBill.findById(id);
  if (!bill || !(await canAccess(id, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (bill.payerId.toString() !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await bill.deleteOne();
  // Cascade hapus SEMUA share — running-log yang tidak masuk akal
  // disimpan begitu split bill induknya sudah tidak ada. Expense yang
  // SUDAH kesimpen dari share yang settled SENGAJA TIDAK ikut dihapus
  // (representasi uang yang beneran sudah "keluar" secara historis,
  // prinsip sama SavingsGoal/Installment delete).
  await SplitBillShare.deleteMany({ splitBillId: id });

  return NextResponse.json({ success: true });
}

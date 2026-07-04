import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import Installment from "@/models/Installment";
import InstallmentPayment from "@/models/InstallmentPayment";
import Expense from "@/models/Expense";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/installments/[id]/payments">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await connectToDatabase();
  const payments = await InstallmentPayment.find({
    installmentId: id,
    userId: user.id,
  }).sort({ date: -1, createdAt: -1 });
  return NextResponse.json(payments);
}

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/installments/[id]/payments">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  await connectToDatabase();
  const installment = await Installment.findOne({ _id: id, userId: user.id });
  if (!installment) {
    return NextResponse.json({ error: "Installment not found" }, { status: 404 });
  }

  const body = await request.json();
  const amount = Number(body.amount);
  const date = body.date ? new Date(body.date) : new Date();

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "amount must be a positive number" },
      { status: 400 }
    );
  }
  if (isNaN(date.getTime())) {
    return NextResponse.json({ error: "invalid date" }, { status: 400 });
  }

  // Pembayaran otomatis ikut tercatat sebagai Expense kategori
  // "lain-lain" — biar Total Bersih/sisa budget di Dashboard ikut
  // berkurang, bukan cuma progress cicilan-nya doang.
  const expense = await Expense.create({
    userId: user.id,
    date,
    category: "lain-lain",
    amount,
    note: `Cicilan: ${installment.name}`,
  });

  const payment = await InstallmentPayment.create({
    userId: user.id,
    installmentId: id,
    amount,
    date,
    expenseId: expense._id,
  });

  // Kalau bulan yang sudah terbayar sudah menyentuh tenor, tandai lunas
  // otomatis (active: false) — cron reminder berhenti ngingetin.
  const monthsPaid = await InstallmentPayment.countDocuments({
    installmentId: id,
  });
  if (monthsPaid >= installment.tenorMonths && installment.active) {
    installment.active = false;
    await installment.save();
  }

  return NextResponse.json(payment, { status: 201 });
}

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import Receivable from "@/models/Receivable";
import ReceivablePayment from "@/models/ReceivablePayment";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/receivables/[id]/payments">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await connectToDatabase();
  const payments = await ReceivablePayment.find({
    receivableId: id,
    userId: user.id,
  }).sort({ date: -1, createdAt: -1 });
  return NextResponse.json(payments);
}

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/receivables/[id]/payments">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await connectToDatabase();
  const receivable = await Receivable.findOne({ _id: id, userId: user.id });
  if (!receivable) {
    return NextResponse.json({ error: "Receivable not found" }, { status: 404 });
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

  // SENGAJA TIDAK bikin Expense/income apa pun — lihat catatan di
  // models/ReceivablePayment.ts.
  const payment = await ReceivablePayment.create({
    receivableId: id,
    userId: user.id,
    amount,
    date,
  });
  return NextResponse.json(payment, { status: 201 });
}

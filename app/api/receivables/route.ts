import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import Receivable from "@/models/Receivable";
import ReceivablePayment from "@/models/ReceivablePayment";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectToDatabase();
  const receivables = await Receivable.find({ userId: user.id }).sort({
    createdAt: -1,
  });

  // Progress dihitung on-the-fly dari total payment tiap piutang, bukan
  // field ter-cache — pola yang sama dengan SavingsGoal/Installment.
  const receivableIds = receivables.map((r) => r._id);
  const totals = await ReceivablePayment.aggregate([
    { $match: { receivableId: { $in: receivableIds } } },
    { $group: { _id: "$receivableId", paidAmount: { $sum: "$amount" } } },
  ]);
  const paidById = new Map(
    totals.map((t) => [t._id.toString(), t.paidAmount as number])
  );

  const result = receivables.map((r) => {
    const paidAmount = paidById.get(r._id.toString()) ?? 0;
    const remainingAmount = Math.max(0, r.amount - paidAmount);
    return {
      _id: r._id,
      debtorName: r.debtorName,
      amount: r.amount,
      description: r.description,
      dueDate: r.dueDate,
      paidAmount,
      remainingAmount,
      lunas: paidAmount >= r.amount,
    };
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const debtorName =
    typeof body.debtorName === "string" ? body.debtorName.trim() : "";
  const amount = Number(body.amount);
  const description =
    typeof body.description === "string" ? body.description.trim() : undefined;
  const dueDate = body.dueDate ? new Date(body.dueDate) : undefined;

  if (!debtorName) {
    return NextResponse.json(
      { error: "debtorName is required" },
      { status: 400 }
    );
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "amount must be a positive number" },
      { status: 400 }
    );
  }
  if (dueDate && isNaN(dueDate.getTime())) {
    return NextResponse.json({ error: "invalid dueDate" }, { status: 400 });
  }

  await connectToDatabase();
  const receivable = await Receivable.create({
    userId: user.id,
    debtorName,
    amount,
    description,
    dueDate,
  });
  return NextResponse.json(receivable, { status: 201 });
}

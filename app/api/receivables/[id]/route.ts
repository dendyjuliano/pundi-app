import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import Receivable from "@/models/Receivable";
import ReceivablePayment from "@/models/ReceivablePayment";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/receivables/[id]">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await connectToDatabase();
  const receivable = await Receivable.findOne({ _id: id, userId: user.id });
  if (!receivable) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(receivable);
}

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/receivables/[id]">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await request.json();

  const update: {
    debtorName?: string;
    amount?: number;
    description?: string;
    dueDate?: Date | null;
  } = {};
  if (typeof body.debtorName === "string" && body.debtorName.trim()) {
    update.debtorName = body.debtorName.trim();
  }
  if (body.amount !== undefined) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "amount must be a positive number" },
        { status: 400 }
      );
    }
    update.amount = amount;
  }
  if (typeof body.description === "string") {
    update.description = body.description.trim();
  }
  if (body.dueDate !== undefined) {
    if (body.dueDate === null) {
      update.dueDate = null;
    } else {
      const dueDate = new Date(body.dueDate);
      if (isNaN(dueDate.getTime())) {
        return NextResponse.json({ error: "invalid dueDate" }, { status: 400 });
      }
      update.dueDate = dueDate;
    }
  }

  await connectToDatabase();
  const receivable = await Receivable.findOneAndUpdate(
    { _id: id, userId: user.id },
    update,
    { new: true }
  );
  if (!receivable) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(receivable);
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/receivables/[id]">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await connectToDatabase();
  const receivable = await Receivable.findOneAndDelete({
    _id: id,
    userId: user.id,
  });
  if (!receivable) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  // Cascade — running-log yang tidak masuk akal disimpan begitu piutang
  // induknya sudah tidak ada. Tidak ada Expense yang perlu
  // dipertimbangkan sama sekali (beda dari SavingsGoal/Installment),
  // karena piutang memang tidak pernah menyentuh Expense.
  await ReceivablePayment.deleteMany({ receivableId: id, userId: user.id });

  return NextResponse.json({ success: true });
}

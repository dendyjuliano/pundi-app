import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import Expense from "@/models/Expense";

const VALID_CATEGORIES = ["makan", "lain-lain"];

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/expenses/[id]">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await request.json();

  await connectToDatabase();
  const existing = await Expense.findOne({ _id: id, userId: user.id });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const update: Record<string, unknown> = {};
  if (body.date !== undefined) {
    if (isNaN(new Date(body.date).getTime())) {
      return NextResponse.json({ error: "invalid date" }, { status: 400 });
    }
    update.date = new Date(body.date);
  }
  if (body.category !== undefined) {
    if (!VALID_CATEGORIES.includes(body.category)) {
      return NextResponse.json({ error: "invalid category" }, { status: 400 });
    }
    update.category = body.category;
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
  if (body.note !== undefined) {
    update.note = typeof body.note === "string" ? body.note.trim() : "";
  }

  const nextCategory = (update.category as string) ?? existing.category;
  const nextNote = (update.note as string) ?? existing.note;
  if (nextCategory === "lain-lain" && !(nextNote && nextNote.trim())) {
    return NextResponse.json(
      { error: "note is required for kategori lain-lain" },
      { status: 400 }
    );
  }

  const expense = await Expense.findOneAndUpdate(
    { _id: id, userId: user.id },
    update,
    { new: true }
  );
  return NextResponse.json(expense);
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/expenses/[id]">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await connectToDatabase();
  const result = await Expense.findOneAndDelete({ _id: id, userId: user.id });
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}

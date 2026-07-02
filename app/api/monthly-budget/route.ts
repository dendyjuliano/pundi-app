import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import MonthlyBudget from "@/models/MonthlyBudget";
import {
  computeTotals,
  getMonthlyBudgetOrDraft,
  isValidMonth,
  propagateBudgetForward,
} from "@/lib/monthlyBudget";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  if (!isValidMonth(month)) {
    return NextResponse.json(
      { error: "month must be in YYYY-MM format" },
      { status: 400 }
    );
  }

  await connectToDatabase();
  const result = await getMonthlyBudgetOrDraft(user.id, month);
  return NextResponse.json(result);
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { month, incomes, allocations } = body;

  if (!isValidMonth(month)) {
    return NextResponse.json(
      { error: "month must be in YYYY-MM format" },
      { status: 400 }
    );
  }
  if (!Array.isArray(incomes) || !Array.isArray(allocations)) {
    return NextResponse.json(
      { error: "incomes and allocations must be arrays" },
      { status: 400 }
    );
  }

  await connectToDatabase();
  const budget = await MonthlyBudget.findOneAndUpdate(
    { userId: user.id, month },
    { userId: user.id, month, incomes, allocations },
    { new: true, upsert: true }
  );

  // Isi bulan-bulan setelahnya yang masih benar-benar kosong dengan nilai
  // yang di-carry-forward dari bulan ini, supaya tidak perlu dibuka satu-
  // satu — berhenti otomatis begitu ketemu bulan yang sudah punya data.
  const propagatedMonths = await propagateBudgetForward(user.id, month);

  const obj = budget.toObject();
  return NextResponse.json({
    ...obj,
    isNew: false,
    ...computeTotals(obj),
    propagatedMonths,
  });
}

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser, resolveAdminTargetUserId } from "@/lib/session";
import AllocationCategory from "@/models/AllocationCategory";
import { getMonthlyBudgetOrDraft, isValidMonth } from "@/lib/monthlyBudget";

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

  const resolution = await resolveAdminTargetUserId(
    user,
    searchParams.get("userId")
  );
  if (!resolution.ok) {
    return NextResponse.json(
      { error: resolution.error },
      { status: resolution.status }
    );
  }
  const targetUserId = resolution.targetUserId;

  await connectToDatabase();
  const budget = await getMonthlyBudgetOrDraft(targetUserId, month);
  const allocationCategories = await AllocationCategory.find({
    userId: targetUserId,
  });
  const nameMap = new Map(
    allocationCategories.map((c) => [c._id.toString(), c.name])
  );

  const totalIncome = budget.totalIncome;
  const slices = budget.allocations.map(
    (a: { categoryId: unknown; amount: number }) => ({
      name: nameMap.get(String(a.categoryId)) ?? "Lainnya",
      amount: a.amount,
      percentage: totalIncome ? (a.amount / totalIncome) * 100 : 0,
    })
  );
  slices.push({
    name: "Total Bersih",
    amount: budget.totalBersih,
    percentage: totalIncome ? (budget.totalBersih / totalIncome) * 100 : 0,
  });

  return NextResponse.json({ month, totalIncome, slices });
}

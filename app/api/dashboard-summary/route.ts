import { NextResponse } from "next/server";
import { getCurrentUser, resolveAdminTargetUserId } from "@/lib/session";
import { getDashboardSummary } from "@/lib/dashboardSummary";
import { isValidMonth } from "@/lib/monthlyBudget";

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

  const [y, m] = month.split("-").map(Number);
  // Use "now" if the requested month is the current month so daily-budget
  // lookups and the "today" section resolve against the real current date;
  // otherwise anchor to the 1st of the requested month.
  const now = new Date();
  const isCurrentMonth =
    now.getFullYear() === y && now.getMonth() + 1 === m;
  const referenceDate = isCurrentMonth ? now : new Date(y, m - 1, 1);

  const summary = await getDashboardSummary(targetUserId, referenceDate);
  return NextResponse.json(summary);
}

import { NextResponse } from "next/server";
import { getCurrentUser, resolveAdminTargetUserId } from "@/lib/session";
import { getYearlyInvestmentData } from "@/lib/reports";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get("year");
  const year = yearParam ? Number(yearParam) : new Date().getFullYear();
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "invalid year" }, { status: 400 });
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

  const data = await getYearlyInvestmentData(resolution.targetUserId, year);
  return NextResponse.json(data);
}

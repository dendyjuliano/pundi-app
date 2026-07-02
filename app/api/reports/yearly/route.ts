import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getMonthlyReportData } from "@/lib/reports";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get("year");
  const year = yearParam ? Number(yearParam) : new Date().getFullYear();
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "invalid year" }, { status: 400 });
  }

  const months = Array.from(
    { length: 12 },
    (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`
  );

  const data = await Promise.all(
    months.map((month) => getMonthlyReportData(user.id, month))
  );

  return NextResponse.json(data);
}

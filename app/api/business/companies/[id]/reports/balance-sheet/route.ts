import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { resolveCompanyAccess } from "@/lib/business/access";
import { computeBalanceSheet, endOfTodayWIB } from "@/lib/business/reports";
import Company from "@/models/business/Company";

export async function GET(
  request: Request,
  ctx: RouteContext<"/api/business/companies/[id]/reports/balance-sheet">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const access = await resolveCompanyAccess(user.id, id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const company = await Company.findById(id);
  if (!company) {
    return NextResponse.json({ error: "Perusahaan tidak ditemukan" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const asOfParam = searchParams.get("asOf");
  const asOf = asOfParam ? new Date(asOfParam) : endOfTodayWIB();
  if (isNaN(asOf.getTime())) {
    return NextResponse.json({ error: "invalid asOf" }, { status: 400 });
  }

  const result = await computeBalanceSheet(id, asOf);
  return NextResponse.json(result);
}

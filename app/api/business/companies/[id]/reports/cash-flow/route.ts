import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { resolveCompanyAccess } from "@/lib/business/access";
import { computeCashFlow, defaultFiscalYearRange } from "@/lib/business/reports";
import Company from "@/models/business/Company";

export async function GET(
  request: Request,
  ctx: RouteContext<"/api/business/companies/[id]/reports/cash-flow">
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
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  let from: Date;
  let to: Date;
  if (fromParam || toParam) {
    from = fromParam ? new Date(fromParam) : new Date(0);
    to = toParam ? new Date(toParam) : new Date();
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return NextResponse.json({ error: "invalid from/to" }, { status: 400 });
    }
  } else {
    const range = defaultFiscalYearRange(company.fiscalYearStartMonth);
    from = range.from;
    to = range.to;
  }

  const result = await computeCashFlow(id, from, to);
  return NextResponse.json(result);
}

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import { resolveCompanyAccess } from "@/lib/business/access";
import Company from "@/models/business/Company";
import CompanyMember from "@/models/business/CompanyMember";
import Account from "@/models/business/Account";
import JournalEntry from "@/models/business/JournalEntry";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/business/companies/[id]">
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
  return NextResponse.json({ ...company.toObject(), role: access.role });
}

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/business/companies/[id]">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const access = await resolveCompanyAccess(user.id, id, { minRole: "owner" });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await request.json();
  const update: {
    name?: string;
    legalName?: string;
    industry?: string;
    fiscalYearStartMonth?: number;
  } = {};
  if (typeof body.name === "string" && body.name.trim()) {
    update.name = body.name.trim();
  }
  if (typeof body.legalName === "string") {
    update.legalName = body.legalName.trim();
  }
  if (typeof body.industry === "string") {
    update.industry = body.industry.trim();
  }
  if (body.fiscalYearStartMonth !== undefined) {
    const month = Number(body.fiscalYearStartMonth);
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json(
        { error: "fiscalYearStartMonth must be 1-12" },
        { status: 400 }
      );
    }
    update.fiscalYearStartMonth = month;
  }

  const company = await Company.findByIdAndUpdate(id, update, { new: true });
  return NextResponse.json(company);
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/business/companies/[id]">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const access = await resolveCompanyAccess(user.id, id, { minRole: "owner" });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  await connectToDatabase();
  // Cascade penuh — company yang dihapus tidak menyisakan data yatim di
  // ledger-nya, beda dari SavingsGoal yang sengaja menyisakan Expense
  // historis (di sini tidak ada konsep "expense di luar ledger ini" yang
  // perlu dipertahankan).
  await JournalEntry.deleteMany({ companyId: id });
  await Account.deleteMany({ companyId: id });
  await CompanyMember.deleteMany({ companyId: id });
  await Company.deleteOne({ _id: id });

  return NextResponse.json({ success: true });
}

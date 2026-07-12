import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import { seedChartOfAccounts } from "@/lib/business/seedChartOfAccounts";
import { TRIAL_DAYS } from "@/lib/business/subscription";
import Company from "@/models/business/Company";
import CompanyMember from "@/models/business/CompanyMember";
import CompanySubscription from "@/models/business/CompanySubscription";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectToDatabase();
  const memberships = await CompanyMember.find({ userId: user.id });
  const companyIds = memberships.map((m) => m.companyId);
  const companies = await Company.find({ _id: { $in: companyIds } }).sort({
    createdAt: 1,
  });
  const roleByCompanyId = new Map(
    memberships.map((m) => [m.companyId.toString(), m.role])
  );

  const result = companies.map((c) => ({
    _id: c._id,
    name: c.name,
    legalName: c.legalName,
    industry: c.industry,
    role: roleByCompanyId.get(c._id.toString()),
  }));
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const legalName =
    typeof body.legalName === "string" ? body.legalName.trim() : undefined;
  const industry =
    typeof body.industry === "string" ? body.industry.trim() : undefined;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  await connectToDatabase();
  const company = await Company.create({
    name,
    legalName,
    industry,
    createdBy: user.id,
  });
  // Pembuat company otomatis jadi owner — dan seed Chart of Accounts
  // langsung sinkron di request yang sama (bukan job/queue), biar company
  // yang baru dibuat langsung siap dipakai posting jurnal.
  await CompanyMember.create({
    companyId: company._id,
    userId: user.id,
    role: "owner",
  });
  await seedChartOfAccounts(company._id.toString());
  await CompanySubscription.create({
    companyId: company._id,
    trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
    currentPeriodEnd: null,
  });

  return NextResponse.json(company, { status: 201 });
}

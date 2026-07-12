import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { resolveCompanyAccess } from "@/lib/business/access";
import Account from "@/models/business/Account";
import JournalEntry from "@/models/business/JournalEntry";

const REPORT_SECTIONS = new Set([
  "operating-revenue",
  "cogs",
  "operating-expense",
  "non-operating-revenue",
  "non-operating-expense",
]);

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/business/companies/[id]/accounts/[accountId]">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, accountId } = await ctx.params;
  const access = await resolveCompanyAccess(user.id, id, {
    minRole: "accountant",
  });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const account = await Account.findOne({ _id: accountId, companyId: id });
  if (!account) {
    return NextResponse.json({ error: "Akun tidak ditemukan" }, { status: 404 });
  }

  const body = await request.json();
  // code & type sengaja immutable setelah dibuat — ganti tipe akun setelah
  // ada jurnal bakal bikin saldo historis (dan normalBalance) salah baca.
  if (typeof body.name === "string" && body.name.trim()) {
    account.name = body.name.trim();
  }
  if (body.reportSection !== undefined) {
    if (
      (account.type === "revenue" || account.type === "expense") &&
      !REPORT_SECTIONS.has(body.reportSection)
    ) {
      return NextResponse.json({ error: "invalid reportSection" }, { status: 400 });
    }
    account.reportSection = body.reportSection;
  }
  if (body.costBehavior !== undefined) {
    if (
      body.costBehavior !== null &&
      !["fixed", "variable"].includes(body.costBehavior)
    ) {
      return NextResponse.json({ error: "invalid costBehavior" }, { status: 400 });
    }
    account.costBehavior = body.costBehavior ?? undefined;
  }
  if (typeof body.isActive === "boolean") {
    account.isActive = body.isActive;
  }
  if (body.parentId !== undefined) {
    account.parentId = body.parentId || undefined;
  }

  await account.save();
  return NextResponse.json(account);
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/business/companies/[id]/accounts/[accountId]">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, accountId } = await ctx.params;
  const access = await resolveCompanyAccess(user.id, id, {
    minRole: "accountant",
  });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const account = await Account.findOne({ _id: accountId, companyId: id });
  if (!account) {
    return NextResponse.json({ error: "Akun tidak ditemukan" }, { status: 404 });
  }

  const usageCount = await JournalEntry.countDocuments({
    companyId: id,
    "lines.accountId": accountId,
  });
  if (usageCount > 0) {
    return NextResponse.json(
      { error: "Akun sudah dipakai di jurnal, nonaktifkan saja" },
      { status: 409 }
    );
  }

  await account.deleteOne();
  return NextResponse.json({ success: true });
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { resolveCompanyAccess } from "@/lib/business/access";
import CompanyMember from "@/models/business/CompanyMember";

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/business/companies/[id]/members/[memberId]">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, memberId } = await ctx.params;
  const access = await resolveCompanyAccess(user.id, id, { minRole: "owner" });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await request.json();
  if (!["owner", "accountant", "staff"].includes(body.role)) {
    return NextResponse.json({ error: "invalid role" }, { status: 400 });
  }

  const member = await CompanyMember.findOne({ _id: memberId, companyId: id });
  if (!member) {
    return NextResponse.json({ error: "Anggota tidak ditemukan" }, { status: 404 });
  }

  if (member.role === "owner" && body.role !== "owner") {
    const otherOwners = await CompanyMember.countDocuments({
      companyId: id,
      role: "owner",
      _id: { $ne: memberId },
    });
    if (otherOwners === 0) {
      return NextResponse.json(
        { error: "Tidak boleh menurunkan owner terakhir" },
        { status: 409 }
      );
    }
  }

  member.role = body.role;
  await member.save();
  return NextResponse.json(member);
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/business/companies/[id]/members/[memberId]">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, memberId } = await ctx.params;
  const access = await resolveCompanyAccess(user.id, id, { minRole: "owner" });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const member = await CompanyMember.findOne({ _id: memberId, companyId: id });
  if (!member) {
    return NextResponse.json({ error: "Anggota tidak ditemukan" }, { status: 404 });
  }

  if (member.role === "owner") {
    const otherOwners = await CompanyMember.countDocuments({
      companyId: id,
      role: "owner",
      _id: { $ne: memberId },
    });
    if (otherOwners === 0) {
      return NextResponse.json(
        { error: "Tidak boleh menghapus owner terakhir" },
        { status: 409 }
      );
    }
  }

  await member.deleteOne();
  return NextResponse.json({ success: true });
}

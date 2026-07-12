import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { resolveCompanyAccess } from "@/lib/business/access";
import CompanyMember from "@/models/business/CompanyMember";
import UserModel from "@/models/User";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/business/companies/[id]/members">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const access = await resolveCompanyAccess(user.id, id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const members = await CompanyMember.find({ companyId: id }).sort({
    createdAt: 1,
  });
  const users = await UserModel.find({
    _id: { $in: members.map((m) => m.userId) },
  });
  const userById = new Map(users.map((u) => [u._id.toString(), u]));

  const result = members.map((m) => {
    const memberUser = userById.get(m.userId.toString());
    return {
      _id: m._id,
      userId: m.userId,
      role: m.role,
      name: memberUser?.name ?? "Anggota",
      email: memberUser?.email ?? "",
    };
  });
  return NextResponse.json(result);
}

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/business/companies/[id]/members">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const access = await resolveCompanyAccess(user.id, id, { minRole: "owner" });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await request.json();
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = body.role === "accountant" ? "accountant" : "staff";

  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  // Beda dari fitur Friends (yang punya alur invite/accept), di sini
  // TIDAK ada undangan email — user yang diundang harus SUDAH punya akun
  // Pundi. Kalau belum ada, 404 daripada bikin alur invite-token baru
  // yang di luar scope MVP.
  const targetUser = await UserModel.findOne({ email });
  if (!targetUser) {
    return NextResponse.json(
      { error: "User belum terdaftar di Pundi" },
      { status: 404 }
    );
  }

  const existing = await CompanyMember.findOne({
    companyId: id,
    userId: targetUser._id,
  });
  if (existing) {
    return NextResponse.json(
      { error: "User ini sudah jadi anggota" },
      { status: 409 }
    );
  }

  const member = await CompanyMember.create({
    companyId: id,
    userId: targetUser._id,
    role,
    invitedBy: user.id,
  });
  return NextResponse.json(member, { status: 201 });
}

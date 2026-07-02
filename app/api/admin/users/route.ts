import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import UserModel from "@/models/User";
import { getDashboardSummary } from "@/lib/dashboardSummary";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectToDatabase();
  const users = await UserModel.find({ familyId: user.familyId }).sort({
    createdAt: 1,
  });

  const withSummary = await Promise.all(
    users.map(async (u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      summary: await getDashboardSummary(u._id.toString()),
    }))
  );

  return NextResponse.json(withSummary);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = body.role === "admin" ? "admin" : "member";

  if (!name) {
    return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });
  }
  if (!email) {
    return NextResponse.json({ error: "Email wajib diisi" }, { status: 400 });
  }
  if (!password) {
    return NextResponse.json({ error: "Password wajib diisi" }, { status: 400 });
  }

  await connectToDatabase();
  const existing = await UserModel.findOne({ email });
  if (existing) {
    return NextResponse.json(
      { error: "Email sudah terdaftar" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const created = await UserModel.create({
    name,
    email,
    passwordHash,
    role,
    // Selalu ikut keluarga admin yang membuat — familyId TIDAK pernah
    // diambil dari body request, supaya admin tidak bisa menaruh user
    // baru ke keluarga lain.
    familyId: user.familyId,
  });

  return NextResponse.json(
    {
      id: created._id.toString(),
      name: created.name,
      email: created.email,
      role: created.role,
    },
    { status: 201 }
  );
}

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import UserModel from "@/models/User";
import FamilyModel from "@/models/Family";

export async function POST(request: Request) {
  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

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

  // Family "name" is purely an internal label (never shown in the UI) —
  // just use the registering admin's own name so it's traceable in the DB.
  const family = await FamilyModel.create({ name });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await UserModel.create({
    name,
    email,
    passwordHash,
    role: "admin",
    familyId: family._id,
  });

  return NextResponse.json(
    { id: user._id.toString(), name: user.name, email: user.email },
    { status: 201 }
  );
}

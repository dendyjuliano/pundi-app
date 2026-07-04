import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import UserModel from "@/models/User";

// Beda dari /api/admin/members (admin-only) — endpoint ini terbuka buat
// SEMUA anggota keluarga yang login, dipakai fitur target tabungan
// kolaboratif buat nampilin nama kontributor & daftar anggota yang bakal
// bisa lihat goal Bersama. Cuma expose id & name, tidak ada data sensitif.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectToDatabase();
  const users = await UserModel.find({ familyId: user.familyId }).sort({
    createdAt: 1,
  });

  return NextResponse.json(
    users.map((u) => ({ id: u._id.toString(), name: u.name }))
  );
}

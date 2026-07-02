import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import UserModel from "@/models/User";

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

  return NextResponse.json(
    users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      role: u.role as "admin" | "member",
    }))
  );
}

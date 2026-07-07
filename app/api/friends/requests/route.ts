import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import Friendship from "@/models/Friendship";
import UserModel from "@/models/User";

// Daftar permintaan pertemanan PENDING — dipisah dari GET /api/friends
// (yang cuma nampilin relasi accepted) karena UI-nya beda section:
// "Permintaan Masuk" (bisa diterima/tolak) vs "Permintaan Terkirim"
// (bisa dibatalkan).
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectToDatabase();
  const [incoming, outgoing] = await Promise.all([
    Friendship.find({ toUserId: user.id, status: "pending" }),
    Friendship.find({ fromUserId: user.id, status: "pending" }),
  ]);

  const otherIds = [
    ...incoming.map((f) => f.fromUserId),
    ...outgoing.map((f) => f.toUserId),
  ];
  const others = await UserModel.find({ _id: { $in: otherIds } });
  const nameById = new Map(others.map((u) => [u._id.toString(), u.name]));

  return NextResponse.json({
    incoming: incoming.map((f) => ({
      id: f._id.toString(),
      userId: f.fromUserId.toString(),
      name: nameById.get(f.fromUserId.toString()) ?? "Anggota",
    })),
    outgoing: outgoing.map((f) => ({
      id: f._id.toString(),
      userId: f.toUserId.toString(),
      name: nameById.get(f.toUserId.toString()) ?? "Anggota",
    })),
  });
}

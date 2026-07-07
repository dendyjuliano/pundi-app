import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import Friendship from "@/models/Friendship";
import UserModel from "@/models/User";

const MIN_QUERY_LENGTH = 3;
const MAX_RESULTS = 5;

// Cuma tampilin sedikit info (nama + email di-mask sebagian) dan batasi
// hasil maks 5 — sengaja BUKAN directory search bebas, biar orang tidak
// bisa gampang "jelajahi" seluruh user terdaftar cuma dengan ngetik
// huruf umum. Minimal 3 karakter juga mencegah query 1-2 huruf yang
// bakal narik ratusan hasil.
function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  const visible = local.slice(0, 1);
  return `${visible}${"*".repeat(Math.max(3, local.length - 1))}@${domain}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < MIN_QUERY_LENGTH) {
    return NextResponse.json([]);
  }

  await connectToDatabase();

  // Sembunyikan user yang sudah punya relasi AKTIF (pending/accepted) —
  // relasi "declined" SENGAJA tidak disembunyikan, biar masih bisa
  // dicari &amp; dikirim ulang requestnya.
  const activeRelations = await Friendship.find({
    $or: [{ fromUserId: user.id }, { toUserId: user.id }],
    status: { $in: ["pending", "accepted"] },
  });
  const excludedIds = new Set(
    activeRelations.map((f) =>
      f.fromUserId.toString() === user.id
        ? f.toUserId.toString()
        : f.fromUserId.toString()
    )
  );
  excludedIds.add(user.id);

  const pattern = new RegExp(escapeRegExp(q), "i");
  const matches = await UserModel.find({
    _id: { $nin: [...excludedIds] },
    $or: [{ name: pattern }, { email: pattern }],
  }).limit(MAX_RESULTS);

  return NextResponse.json(
    matches.map((m) => ({
      id: m._id.toString(),
      name: m.name,
      maskedEmail: maskEmail(m.email),
    }))
  );
}

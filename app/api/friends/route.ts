import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import { sendPushToUsers } from "@/lib/push";
import Friendship from "@/models/Friendship";
import UserModel from "@/models/User";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectToDatabase();
  const friendships = await Friendship.find({
    $or: [{ fromUserId: user.id }, { toUserId: user.id }],
    status: "accepted",
  });

  const otherIdByFriendshipId = new Map(
    friendships.map((f) => [
      f._id.toString(),
      (f.fromUserId.toString() === user.id
        ? f.toUserId
        : f.fromUserId
      ).toString(),
    ])
  );
  const friends = await UserModel.find({
    _id: { $in: [...otherIdByFriendshipId.values()] },
  });
  const friendById = new Map(friends.map((f) => [f._id.toString(), f]));

  return NextResponse.json(
    [...otherIdByFriendshipId.entries()]
      .map(([friendshipId, userId]) => {
        const friend = friendById.get(userId);
        if (!friend) return null;
        return {
          // `friendshipId` dipakai buat DELETE (unfriend) — beda dari
          // `id` yang dipakai buat identifikasi user (mis. dipilih
          // sebagai friendCollaborator di form Target Tabungan).
          friendshipId,
          id: friend._id.toString(),
          name: friend.name,
          email: friend.email,
        };
      })
      .filter((f): f is NonNullable<typeof f> => f !== null)
  );
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  // `userId` dipakai kalau kirim request dari hasil live search (Fase
  // pencarian teman) — di situ cuma email TER-MASK yang ditampilkan ke
  // client, jadi klik hasil search ngirim id-nya langsung, bukan email
  // asli. `email` tetap didukung buat form manual (ketik email persis).
  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!userId && !email) {
    return NextResponse.json(
      { error: "userId or email is required" },
      { status: 400 }
    );
  }

  await connectToDatabase();
  const target = userId
    ? await UserModel.findById(userId)
    : await UserModel.findOne({ email });
  if (!target) {
    return NextResponse.json(
      { error: "User tidak ditemukan / belum terdaftar di Pundi" },
      { status: 404 }
    );
  }
  if (target._id.toString() === user.id) {
    return NextResponse.json(
      { error: "Tidak bisa mengirim permintaan ke diri sendiri" },
      { status: 400 }
    );
  }

  const existing = await Friendship.findOne({
    $or: [
      { fromUserId: user.id, toUserId: target._id },
      { fromUserId: target._id, toUserId: user.id },
    ],
  });

  if (existing?.status === "accepted") {
    return NextResponse.json(
      { error: "Kalian sudah berteman" },
      { status: 400 }
    );
  }

  // A kirim request ke B padahal B juga baru saja kirim ke A (belum
  // sempat di-accept) — auto-match langsung jadi accepted di row yang
  // SUDAH ADA (bukan bikin row baru), biar tidak perlu accept manual
  // dua arah.
  if (
    existing?.status === "pending" &&
    existing.fromUserId.toString() === target._id.toString()
  ) {
    existing.status = "accepted";
    await existing.save();

    try {
      await sendPushToUsers([existing.fromUserId.toString()], {
        title: "Pundi",
        body: `${user.name ?? "Seseorang"} menerima permintaan pertemanan kamu`,
        url: "/friends",
      });
    } catch {
      // best-effort
    }

    return NextResponse.json(existing, { status: 201 });
  }

  if (existing?.status === "pending") {
    return NextResponse.json(
      { error: "Permintaan pertemanan sudah terkirim, tunggu konfirmasi" },
      { status: 400 }
    );
  }

  let friendship;
  if (existing?.status === "declined") {
    // Reuse row yang sama (bukan bikin baru) — unique index
    // {fromUserId,toUserId} bakal nolak insert baru kalau arahnya
    // persis sama dengan row declined yang sudah ada.
    existing.fromUserId = user.id;
    existing.toUserId = target._id;
    existing.status = "pending";
    friendship = await existing.save();
  } else {
    friendship = await Friendship.create({
      fromUserId: user.id,
      toUserId: target._id,
      status: "pending",
    });
  }

  try {
    await sendPushToUsers([target._id.toString()], {
      title: "Pundi",
      body: `${user.name ?? "Seseorang"} mengirim permintaan pertemanan`,
      url: "/friends",
    });
  } catch {
    // best-effort, tidak menggagalkan response utama
  }

  return NextResponse.json(friendship, { status: 201 });
}

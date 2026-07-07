import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import { sendPushToUsers } from "@/lib/push";
import Friendship from "@/models/Friendship";

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/friends/[id]">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await request.json();
  const status = body.status;
  if (status !== "accepted" && status !== "declined") {
    return NextResponse.json(
      { error: "status must be 'accepted' or 'declined'" },
      { status: 400 }
    );
  }

  await connectToDatabase();
  // Cuma penerima request yang boleh terima/tolak — bukan pengirimnya
  // sendiri, dan cuma yang masih pending (sudah accepted/declined tidak
  // bisa diubah lagi lewat sini).
  const friendship = await Friendship.findOne({
    _id: id,
    toUserId: user.id,
    status: "pending",
  });
  if (!friendship) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  friendship.status = status;
  await friendship.save();

  if (status === "accepted") {
    try {
      await sendPushToUsers([friendship.fromUserId.toString()], {
        title: "Pundi",
        body: `${user.name ?? "Seseorang"} menerima permintaan pertemanan kamu`,
        url: "/friends",
      });
    } catch {
      // best-effort
    }
  }

  return NextResponse.json(friendship);
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/friends/[id]">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await connectToDatabase();
  const friendship = await Friendship.findById(id);
  if (!friendship) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isSender = friendship.fromUserId.toString() === user.id;
  const isRecipient = friendship.toUserId.toString() === user.id;

  // Batalkan request pending: cuma pengirimnya sendiri yang boleh.
  // Unfriend (relasi sudah accepted): kedua pihak boleh, siapapun bisa
  // memutus pertemanan.
  const allowed =
    (friendship.status === "pending" && isSender) ||
    (friendship.status === "accepted" && (isSender || isRecipient));
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await friendship.deleteOne();
  return NextResponse.json({ success: true });
}

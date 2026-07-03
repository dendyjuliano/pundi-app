import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import PushSubscription from "@/models/PushSubscription";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  const p256dh = typeof body.keys?.p256dh === "string" ? body.keys.p256dh : "";
  const auth = typeof body.keys?.auth === "string" ? body.keys.auth : "";
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "invalid subscription" }, { status: 400 });
  }

  await connectToDatabase();
  // upsert by endpoint (bukan userId) — satu browser/device = satu endpoint
  // unik, dan endpoint yang sama bisa aja di-subscribe ulang (mis. user
  // logout-login lagi) tanpa bikin duplikat baris
  await PushSubscription.findOneAndUpdate(
    { endpoint },
    { userId: user.id, endpoint, keys: { p256dh, auth } },
    { upsert: true, new: true }
  );

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  if (!endpoint) {
    return NextResponse.json({ error: "endpoint is required" }, { status: 400 });
  }

  await connectToDatabase();
  await PushSubscription.deleteOne({ endpoint, userId: user.id });

  return NextResponse.json({ ok: true });
}

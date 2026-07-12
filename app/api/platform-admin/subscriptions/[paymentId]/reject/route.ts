import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import { isPlatformAdmin } from "@/lib/business/platformAdmin";
import SubscriptionPayment from "@/models/business/SubscriptionPayment";

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/platform-admin/subscriptions/[paymentId]/reject">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.email || !isPlatformAdmin(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { paymentId } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  const note = typeof body.note === "string" ? body.note.trim() || undefined : undefined;

  await connectToDatabase();

  const payment = await SubscriptionPayment.findOne({ _id: paymentId, status: "pending" });
  if (!payment) {
    return NextResponse.json({ error: "Klaim tidak ditemukan atau sudah diproses" }, { status: 404 });
  }

  payment.status = "rejected";
  payment.reviewedBy = user.id;
  payment.reviewedAt = new Date();
  if (note) payment.note = note;
  await payment.save();

  return NextResponse.json(payment);
}

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import { isPlatformAdmin } from "@/lib/business/platformAdmin";
import SubscriptionPayment from "@/models/business/SubscriptionPayment";
import CompanySubscription from "@/models/business/CompanySubscription";

export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/platform-admin/subscriptions/[paymentId]/approve">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.email || !isPlatformAdmin(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { paymentId } = await ctx.params;
  await connectToDatabase();

  const payment = await SubscriptionPayment.findOne({ _id: paymentId, status: "pending" });
  if (!payment) {
    return NextResponse.json({ error: "Klaim tidak ditemukan atau sudah diproses" }, { status: 404 });
  }

  payment.status = "approved";
  payment.reviewedBy = user.id;
  payment.reviewedAt = new Date();
  await payment.save();

  await CompanySubscription.findOneAndUpdate(
    { companyId: payment.companyId },
    { currentPeriodEnd: payment.periodEnd }
  );

  return NextResponse.json(payment);
}

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import ReceivablePayment from "@/models/ReceivablePayment";

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/receivables/[id]/payments/[paymentId]">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, paymentId } = await ctx.params;
  await connectToDatabase();
  const result = await ReceivablePayment.findOneAndDelete({
    _id: paymentId,
    receivableId: id,
    userId: user.id,
  });
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

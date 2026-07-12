import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import { isPlatformAdmin } from "@/lib/business/platformAdmin";
import SubscriptionPayment from "@/models/business/SubscriptionPayment";
import Company from "@/models/business/Company";
import UserModel from "@/models/User";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.email || !isPlatformAdmin(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "pending";

  await connectToDatabase();
  const payments = await SubscriptionPayment.find({ status }).sort({ claimedAt: -1 });

  const companyIds = [...new Set(payments.map((p) => p.companyId.toString()))];
  const userIds = [...new Set(payments.map((p) => p.claimedBy.toString()))];
  const [companies, users] = await Promise.all([
    Company.find({ _id: { $in: companyIds } }),
    UserModel.find({ _id: { $in: userIds } }),
  ]);
  const companyById = new Map(companies.map((c) => [c._id.toString(), c]));
  const userById = new Map(users.map((u) => [u._id.toString(), u]));

  return NextResponse.json(
    payments.map((p) => ({
      _id: p._id,
      companyName: companyById.get(p.companyId.toString())?.name ?? "(dihapus)",
      claimedByName: userById.get(p.claimedBy.toString())?.name ?? "(tidak diketahui)",
      claimedByEmail: userById.get(p.claimedBy.toString())?.email ?? "",
      amount: p.amount,
      claimedAt: p.claimedAt,
      periodStart: p.periodStart,
      periodEnd: p.periodEnd,
      note: p.note,
      status: p.status,
    }))
  );
}

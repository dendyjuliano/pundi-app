import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import { resolveCompanyAccess } from "@/lib/business/access";
import { addOneMonthUTC, MONTHLY_PRICE_IDR } from "@/lib/business/subscription";
import CompanySubscription from "@/models/business/CompanySubscription";
import SubscriptionPayment from "@/models/business/SubscriptionPayment";

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/business/companies/[id]/subscription/claim">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const access = await resolveCompanyAccess(user.id, id, { minRole: "owner" });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await request.json().catch(() => ({}));
  const note = typeof body.note === "string" ? body.note.trim() || undefined : undefined;

  await connectToDatabase();

  const existingPending = await SubscriptionPayment.findOne({
    companyId: id,
    status: "pending",
  });
  if (existingPending) {
    return NextResponse.json(
      { error: "Sudah ada klaim yang menunggu verifikasi" },
      { status: 409 }
    );
  }

  const sub = await CompanySubscription.findOne({ companyId: id });
  if (!sub) {
    return NextResponse.json({ error: "Perusahaan tidak ditemukan" }, { status: 404 });
  }

  const now = new Date();
  // Periode baru nyambung dari periode berjalan (kalau masih aktif) atau
  // trial, bukan dari tanggal klaim — biar owner yang klaim sebelum jatuh
  // tempo tidak "rugi" sisa masa aktifnya.
  const base = sub.currentPeriodEnd && sub.currentPeriodEnd > now ? sub.currentPeriodEnd : (sub.trialEndsAt > now ? sub.trialEndsAt : now);
  const periodStart = base;
  const periodEnd = addOneMonthUTC(periodStart);

  const payment = await SubscriptionPayment.create({
    companyId: id,
    amount: MONTHLY_PRICE_IDR,
    claimedBy: user.id,
    claimedAt: now,
    periodStart,
    periodEnd,
    status: "pending",
    note,
  });

  return NextResponse.json(payment, { status: 201 });
}

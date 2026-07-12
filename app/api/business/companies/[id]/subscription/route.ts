import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { resolveCompanyAccess } from "@/lib/business/access";
import { getSubscriptionStatus, MONTHLY_PRICE_IDR } from "@/lib/business/subscription";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/business/companies/[id]/subscription">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const access = await resolveCompanyAccess(user.id, id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { status, sub, pending, lastRejected } = await getSubscriptionStatus(id);

  // Instruksi transfer manual — diisi user sendiri di .env.local (bukan
  // di-hardcode, ini data rekening pribadi). Null kalau belum diisi, biar
  // UI bisa tampilkan pesan generik alih-alih rekening kosong.
  const bankInfo =
    process.env.BUSINESS_BANK_NAME &&
    process.env.BUSINESS_BANK_ACCOUNT_NUMBER &&
    process.env.BUSINESS_BANK_ACCOUNT_HOLDER
      ? {
          bankName: process.env.BUSINESS_BANK_NAME,
          accountNumber: process.env.BUSINESS_BANK_ACCOUNT_NUMBER,
          accountHolder: process.env.BUSINESS_BANK_ACCOUNT_HOLDER,
        }
      : null;

  return NextResponse.json({
    status,
    trialEndsAt: sub?.trialEndsAt ?? null,
    currentPeriodEnd: sub?.currentPeriodEnd ?? null,
    monthlyAmount: MONTHLY_PRICE_IDR,
    bankInfo,
    pendingPayment: pending
      ? { claimedAt: pending.claimedAt, amount: pending.amount }
      : null,
    lastRejectedPayment: lastRejected
      ? { reviewedAt: lastRejected.reviewedAt, note: lastRejected.note }
      : null,
  });
}

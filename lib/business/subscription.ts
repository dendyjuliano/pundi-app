import { connectToDatabase } from "@/lib/mongodb";
import CompanySubscription from "@/models/business/CompanySubscription";
import SubscriptionPayment from "@/models/business/SubscriptionPayment";

export const MONTHLY_PRICE_IDR = 99_000;
export const TRIAL_DAYS = 14;

export function addOneMonthUTC(date: Date) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

export type SubscriptionStatus = "trial" | "active" | "pending_verification" | "overdue";

// Status effective SELALU dihitung dari tanggal (trialEndsAt/
// currentPeriodEnd) + ada-tidaknya klaim pending saat request masuk,
// tidak pernah disimpan sebagai field terpisah — pola yang sama seperti
// saldo akun (Account) & Laporan Laba Rugi: compute-on-read, bukan cache
// yang bisa drift kalau lupa di-update di satu tempat.
export async function getSubscriptionStatus(companyId: string) {
  await connectToDatabase();
  const sub = await CompanySubscription.findOne({ companyId });
  const pending = await SubscriptionPayment.findOne({ companyId, status: "pending" });
  const now = new Date();

  let status: SubscriptionStatus;
  if (pending) {
    status = "pending_verification";
  } else if (sub?.currentPeriodEnd && sub.currentPeriodEnd > now) {
    status = "active";
  } else if (sub?.trialEndsAt && sub.trialEndsAt > now) {
    status = "trial";
  } else {
    status = "overdue";
  }

  // Cuma tampilkan alasan penolakan kalau klaim TERAKHIR company ini
  // memang yang ditolak — kalau sesudahnya ada klaim baru yang di-approve,
  // penolakan lama itu sudah tidak relevan buat ditampilkan lagi.
  const latestPayment = pending
    ? null
    : await SubscriptionPayment.findOne({ companyId }).sort({ claimedAt: -1 });
  const lastRejected = latestPayment?.status === "rejected" ? latestPayment : null;

  return { status, sub, pending, lastRejected };
}

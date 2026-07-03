import { NextResponse } from "next/server";
import webpush from "web-push";
import { connectToDatabase } from "@/lib/mongodb";
import Expense from "@/models/Expense";
import PushSubscription from "@/models/PushSubscription";
import { getMonthlyBudgetOrDraft } from "@/lib/monthlyBudget";
import { toMonthString } from "@/lib/dashboardSummary";
import { SITE_URL } from "@/lib/site";

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

// Cuma tanggal 1-3 WIB tiap bulan dianggap "awal bulan" — dikirim
// beberapa hari berturut-turut (bukan cuma tanggal 1) biar user yang
// kelewat notifikasi hari pertama masih kena reminder susulan, dan
// otomatis berhenti begitu budget-nya diisi (isNew jadi false).
const START_OF_MONTH_DAY_CUTOFF = 3;

// Kembalikan "sekarang" dalam kalender WIB (bukan UTC server) — dipakai
// buat nentuin batas hari ini & apakah lagi di awal bulan, karena Vercel
// Cron selalu jalan di UTC.
function wibNow(now: Date) {
  return new Date(now.getTime() + WIB_OFFSET_MS);
}

function wibStartOfDayUtc(now: Date) {
  const wib = wibNow(now);
  const wibMidnightAsIfUtc = new Date(
    Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate())
  );
  return new Date(wibMidnightAsIfUtc.getTime() - WIB_OFFSET_MS);
}

async function sendPush(
  sub: {
    _id: unknown;
    endpoint: string;
    keys: { p256dh: string; auth: string };
  },
  payload: { title: string; body: string; url: string }
): Promise<"sent" | "removed" | "failed"> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: sub.keys },
      JSON.stringify(payload)
    );
    return "sent";
  } catch (err) {
    // Subscription sudah tidak valid lagi (mis. user uninstall/clear
    // data browser) — bersihkan biar cron berikutnya tidak nyoba lagi
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 404 || statusCode === 410) {
      await PushSubscription.deleteOne({ _id: sub._id });
      return "removed";
    }
    return "failed";
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json(
      { error: "VAPID keys not configured" },
      { status: 500 }
    );
  }
  webpush.setVapidDetails(
    `mailto:hello@${new URL(SITE_URL).hostname}`,
    vapidPublicKey,
    vapidPrivateKey
  );

  await connectToDatabase();

  const now = new Date();
  const wib = wibNow(now);
  const todayStart = wibStartOfDayUtc(now);
  const currentMonth = toMonthString(wib);
  const isStartOfMonth = wib.getUTCDate() <= START_OF_MONTH_DAY_CUTOFF;

  const subscriptions = await PushSubscription.find();
  const subscriberIds = [...new Set(subscriptions.map((s) => s.userId.toString()))];

  // 1. Siapa yang belum input pengeluaran hari ini
  const usersWithExpenseToday = await Expense.distinct("userId", {
    userId: { $in: subscriberIds },
    date: { $gte: todayStart },
  });
  const alreadyLoggedToday = new Set(
    usersWithExpenseToday.map((id) => id.toString())
  );

  // 2. Siapa yang belum atur budget bulan ini (cuma dicek di awal bulan)
  const budgetPending = new Set<string>();
  if (isStartOfMonth) {
    for (const uid of subscriberIds) {
      const budget = await getMonthlyBudgetOrDraft(uid, currentMonth);
      if (budget.isNew) budgetPending.add(uid);
    }
  }

  let expenseReminderSent = 0;
  let budgetReminderSent = 0;
  let removed = 0;

  for (const sub of subscriptions) {
    const uid = sub.userId.toString();

    if (!alreadyLoggedToday.has(uid)) {
      const result = await sendPush(sub, {
        title: "Pundi",
        body: "Belum ada pengeluaran tercatat hari ini — jangan lupa dicatat ya!",
        url: "/dashboard",
      });
      if (result === "sent") expenseReminderSent++;
      if (result === "removed") removed++;
    }

    if (budgetPending.has(uid)) {
      const result = await sendPush(sub, {
        title: "Pundi",
        body: `Budget bulan ${currentMonth} belum diisi — yuk atur dulu biar Dashboard mulai ngitung`,
        url: "/budget",
      });
      if (result === "sent") budgetReminderSent++;
      if (result === "removed") removed++;
    }
  }

  return NextResponse.json({
    totalSubscriptions: subscriptions.length,
    alreadyLoggedToday: alreadyLoggedToday.size,
    isStartOfMonth,
    budgetPending: budgetPending.size,
    expenseReminderSent,
    budgetReminderSent,
    removed,
  });
}

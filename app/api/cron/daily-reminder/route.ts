import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Expense from "@/models/Expense";
import PushSubscription from "@/models/PushSubscription";
import RecurringExpense from "@/models/RecurringExpense";
import Installment from "@/models/Installment";
import RecurringBusinessExpense from "@/models/business/RecurringBusinessExpense";
import CompanyMember from "@/models/business/CompanyMember";
import { getMonthlyBudgetOrDraft } from "@/lib/monthlyBudget";
import { toMonthString } from "@/lib/dashboardSummary";
import { formatRupiah } from "@/lib/format";
import { configureWebPush, sendPushToSubscription } from "@/lib/push";

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

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!configureWebPush()) {
    return NextResponse.json(
      { error: "VAPID keys not configured" },
      { status: 500 }
    );
  }

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

  // 3. Pengeluaran berulang yang jatuh tempo hari ini (dikelompokkan per
  // user karena satu user bisa punya beberapa item jatuh tempo bareng).
  // Item "yearly" cuma jatuh tempo kalau BULAN-nya juga cocok, bukan
  // tiap bulan kayak "monthly" — `frequency: { $ne: "yearly" }` sengaja
  // dipakai (bukan `frequency: "monthly"`) biar item lama yang dibuat
  // sebelum field `frequency` ada (belum kesimpen di DB sama sekali)
  // tetap ke-anggap "monthly" tanpa perlu migrasi data.
  const dueRecurringExpenses = await RecurringExpense.find({
    userId: { $in: subscriberIds },
    active: true,
    dayOfMonth: wib.getUTCDate(),
    $or: [
      { frequency: { $ne: "yearly" } },
      { frequency: "yearly", month: wib.getUTCMonth() + 1 },
    ],
  });
  const recurringByUser = new Map<string, typeof dueRecurringExpenses>();
  for (const item of dueRecurringExpenses) {
    const uid = item.userId.toString();
    const list = recurringByUser.get(uid) ?? [];
    list.push(item);
    recurringByUser.set(uid, list);
  }

  // 4. Cicilan yang jatuh tempo hari ini (dikelompokkan per user, pola
  // sama persis pengeluaran berulang di atas)
  const dueInstallments = await Installment.find({
    userId: { $in: subscriberIds },
    active: true,
    dayOfMonth: wib.getUTCDate(),
  });
  const installmentsByUser = new Map<string, typeof dueInstallments>();
  for (const item of dueInstallments) {
    const uid = item.userId.toString();
    const list = installmentsByUser.get(uid) ?? [];
    list.push(item);
    installmentsByUser.set(uid, list);
  }

  // 5. Beban berulang Pundi Business jatuh tempo hari ini — sama pola
  // semi-otomatis persis di atas (cuma diingatkan, TIDAK auto-post
  // jurnal), tapi penerimanya SEMUA member company itu yang punya push
  // subscription (bukan cuma pembuat item), karena staff pun bisa catat
  // transaksi lewat template "Bayar Beban Operasional".
  const dueBusinessRecurringExpenses = await RecurringBusinessExpense.find({
    active: true,
    dayOfMonth: wib.getUTCDate(),
    $or: [
      { frequency: { $ne: "yearly" } },
      { frequency: "yearly", month: wib.getUTCMonth() + 1 },
    ],
  });
  const businessCompanyIds = [
    ...new Set(dueBusinessRecurringExpenses.map((i) => i.companyId.toString())),
  ];
  const businessMembers = await CompanyMember.find({
    companyId: { $in: businessCompanyIds },
  });
  const memberUserIdsByCompany = new Map<string, string[]>();
  for (const m of businessMembers) {
    const cid = m.companyId.toString();
    const list = memberUserIdsByCompany.get(cid) ?? [];
    list.push(m.userId.toString());
    memberUserIdsByCompany.set(cid, list);
  }
  const businessRecurringByUser = new Map<string, typeof dueBusinessRecurringExpenses>();
  for (const item of dueBusinessRecurringExpenses) {
    const memberIds = memberUserIdsByCompany.get(item.companyId.toString()) ?? [];
    for (const uid of memberIds) {
      if (!subscriberIds.includes(uid)) continue;
      const list = businessRecurringByUser.get(uid) ?? [];
      list.push(item);
      businessRecurringByUser.set(uid, list);
    }
  }

  let expenseReminderSent = 0;
  let budgetReminderSent = 0;
  let recurringReminderSent = 0;
  let installmentReminderSent = 0;
  let businessRecurringReminderSent = 0;
  let removed = 0;

  for (const sub of subscriptions) {
    const uid = sub.userId.toString();

    if (!alreadyLoggedToday.has(uid)) {
      const result = await sendPushToSubscription(sub, {
        title: "Pundi",
        body: "Belum ada pengeluaran tercatat hari ini — jangan lupa dicatat ya!",
        url: "/dashboard",
      });
      if (result === "sent") expenseReminderSent++;
      if (result === "removed") removed++;
    }

    if (budgetPending.has(uid)) {
      const result = await sendPushToSubscription(sub, {
        title: "Pundi",
        body: `Budget bulan ${currentMonth} belum diisi — yuk atur dulu biar Dashboard mulai ngitung`,
        url: "/budget",
      });
      if (result === "sent") budgetReminderSent++;
      if (result === "removed") removed++;
    }

    // Semi-otomatis: cuma diingatkan, TIDAK auto-create Expense — user
    // yang tap notifikasi ini yang benar-benar mencatatnya (lewat dialog
    // yang sudah ke-prefill), biar nominal masih bisa dikoreksi kalau
    // beda dari biasanya (mis. tagihan listrik naik).
    for (const item of recurringByUser.get(uid) ?? []) {
      const frequencyLabel = item.frequency === "yearly" ? " (tahunan)" : "";
      const result = await sendPushToSubscription(sub, {
        title: "Pundi",
        body: `${item.name}${frequencyLabel} ${formatRupiah(
          item.amount
        )} jatuh tempo hari ini — tap buat catat`,
        url: `/dashboard?confirmRecurring=${item._id}`,
      });
      if (result === "sent") recurringReminderSent++;
      if (result === "removed") removed++;
    }

    // Sama semi-otomatis kayak pengeluaran berulang — user yang tap
    // notifikasi ini yang benar-benar mencatatnya lewat dialog konfirmasi
    // (bisa dikoreksi nominalnya kalau beda), bukan auto-create.
    for (const item of installmentsByUser.get(uid) ?? []) {
      const result = await sendPushToSubscription(sub, {
        title: "Pundi",
        body: `${item.name} ${formatRupiah(
          item.monthlyInstallment
        )} jatuh tempo hari ini — tap buat catat`,
        url: `/dashboard?confirmInstallment=${item._id}`,
      });
      if (result === "sent") installmentReminderSent++;
      if (result === "removed") removed++;
    }

    for (const item of businessRecurringByUser.get(uid) ?? []) {
      const frequencyLabel = item.frequency === "yearly" ? " (tahunan)" : "";
      const result = await sendPushToSubscription(sub, {
        title: "Pundi Business",
        body: `${item.name}${frequencyLabel} ${formatRupiah(
          item.amount
        )} jatuh tempo hari ini — tap buat catat`,
        url: `/business/${item.companyId}/transactions/new?confirmRecurring=${item._id}`,
      });
      if (result === "sent") businessRecurringReminderSent++;
      if (result === "removed") removed++;
    }
  }

  return NextResponse.json({
    totalSubscriptions: subscriptions.length,
    alreadyLoggedToday: alreadyLoggedToday.size,
    isStartOfMonth,
    budgetPending: budgetPending.size,
    recurringDue: dueRecurringExpenses.length,
    installmentDue: dueInstallments.length,
    businessRecurringDue: dueBusinessRecurringExpenses.length,
    expenseReminderSent,
    budgetReminderSent,
    recurringReminderSent,
    installmentReminderSent,
    businessRecurringReminderSent,
    removed,
  });
}

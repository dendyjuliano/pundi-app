import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import { validateFriendCollaboratorIds } from "@/lib/friendship";
import { sendPushToUsers } from "@/lib/push";
import { formatRupiah } from "@/lib/format";
import SplitBill from "@/models/SplitBill";
import SplitBillShare from "@/models/SplitBillShare";
import Expense from "@/models/Expense";
import UserModel from "@/models/User";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectToDatabase();
  const myShares = await SplitBillShare.find({ userId: user.id }).sort({
    createdAt: -1,
  });
  const billIds = myShares.map((s) => s.splitBillId);
  const bills = await SplitBill.find({ _id: { $in: billIds } });
  const billById = new Map(bills.map((b) => [b._id.toString(), b]));

  // Progress "X dari Y orang lunas" + "owedToMe" (jumlah yang masih
  // dipiutangkan ke bagian ORANG LAIN, cuma relevan kalau saya payer)
  // per bill — dipakai juga buat widget "Piutang Aktif" di Dashboard.
  const allShares = await SplitBillShare.find({
    splitBillId: { $in: billIds },
  });
  const progressByBill = new Map<
    string,
    { settled: number; total: number; owedToMe: number }
  >();
  for (const s of allShares) {
    const key = s.splitBillId.toString();
    const bill = billById.get(key);
    const entry = progressByBill.get(key) ?? {
      settled: 0,
      total: 0,
      owedToMe: 0,
    };
    entry.total += 1;
    if (s.settled) entry.settled += 1;
    if (
      bill &&
      !s.settled &&
      s.userId.toString() !== bill.payerId.toString()
    ) {
      entry.owedToMe += s.amount;
    }
    progressByBill.set(key, entry);
  }

  const result = myShares
    .map((s) => {
      const bill = billById.get(s.splitBillId.toString());
      if (!bill) return null;
      const isPayer = bill.payerId.toString() === user.id;
      const progress = progressByBill.get(bill._id.toString()) ?? {
        settled: 0,
        total: 0,
        owedToMe: 0,
      };
      return {
        _id: bill._id,
        name: bill.name,
        subtotal: bill.subtotal,
        taxPercent: bill.taxPercent,
        totalAmount: bill.totalAmount,
        date: bill.date,
        isPayer,
        myShareId: s._id,
        myAmount: s.amount,
        mySettled: s.settled,
        participantsSettled: progress.settled,
        participantsTotal: progress.total,
        owedToMe: isPayer ? progress.owedToMe : 0,
      };
    })
    .filter((b): b is NonNullable<typeof b> => b !== null);

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const subtotal = Number(body.subtotal);
  const taxPercent = body.taxPercent !== undefined ? Number(body.taxPercent) : 0;
  const date = body.date ? new Date(body.date) : new Date();
  const participantIds = Array.isArray(body.participantIds)
    ? (body.participantIds as unknown[]).filter(
        (id): id is string => typeof id === "string"
      )
    : [];

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!Number.isFinite(subtotal) || subtotal <= 0) {
    return NextResponse.json(
      { error: "subtotal must be a positive number" },
      { status: 400 }
    );
  }
  if (!Number.isFinite(taxPercent) || taxPercent < 0) {
    return NextResponse.json(
      { error: "taxPercent must be a non-negative number" },
      { status: 400 }
    );
  }
  if (isNaN(date.getTime())) {
    return NextResponse.json({ error: "invalid date" }, { status: 400 });
  }
  if (participantIds.length === 0) {
    return NextResponse.json(
      { error: "at least one participant is required" },
      { status: 400 }
    );
  }
  if (participantIds.includes(user.id)) {
    return NextResponse.json(
      { error: "payer is already included implicitly" },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const participantUsers = await UserModel.find({
    _id: { $in: participantIds },
  });
  if (participantUsers.length !== participantIds.length) {
    return NextResponse.json(
      { error: "some participant not found" },
      { status: 400 }
    );
  }

  // Partisipan boleh anggota family yang sama ATAU teman accepted milik
  // payer — dua sumber sekaligus (pola combined picker, bukan cuma
  // family-wide kayak SavingsGoal.shared).
  const familyMemberIds = new Set(
    participantUsers
      .filter((u) => u.familyId.toString() === user.familyId)
      .map((u) => u._id.toString())
  );
  const nonFamilyIds = participantIds.filter((id) => !familyMemberIds.has(id));
  if (nonFamilyIds.length > 0) {
    const friendCheck = await validateFriendCollaboratorIds(
      user.id,
      nonFamilyIds
    );
    if (!friendCheck.ok) {
      return NextResponse.json({ error: friendCheck.error }, { status: 400 });
    }
  }

  const taxAmount = Math.round(subtotal * (taxPercent / 100));
  const totalAmount = subtotal + taxAmount;

  const allParticipantIds = [user.id, ...participantIds];
  const count = allParticipantIds.length;
  const baseShare = Math.floor(totalAmount / count);
  const remainder = totalAmount - baseShare * count;
  const payerShareAmount = baseShare + remainder;

  const bill = await SplitBill.create({
    payerId: user.id,
    name,
    subtotal,
    taxPercent,
    totalAmount,
    date,
  });

  // Bagian payer sendiri LANGSUNG jadi Expense-nya — itu beneran uang
  // yang dia keluarkan buat porsinya sendiri, bukan yang ditalangin
  // buat orang lain (itu piutang, bukan pengeluaran dia).
  const payerExpense = await Expense.create({
    userId: user.id,
    date,
    category: "lain-lain",
    amount: payerShareAmount,
    note: `Split Bill: ${name}`,
  });

  const shareDocs = [
    {
      splitBillId: bill._id,
      userId: user.id,
      amount: payerShareAmount,
      settled: true,
      settledAt: new Date(),
      expenseId: payerExpense._id,
    },
    ...participantIds.map((id) => ({
      splitBillId: bill._id,
      userId: id,
      amount: baseShare,
      settled: false,
    })),
  ];
  await SplitBillShare.insertMany(shareDocs);

  try {
    await sendPushToUsers(participantIds, {
      title: "Pundi",
      body: `${user.name ?? "Seseorang"} mengikutkanmu ke split bill "${name}" — bagianmu ${formatRupiah(
        baseShare
      )}`,
      url: "/split-bills",
    });
  } catch {
    // best-effort, tidak menggagalkan response utama
  }

  return NextResponse.json(bill, { status: 201 });
}

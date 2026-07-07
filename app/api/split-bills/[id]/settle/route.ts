import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import { sendPushToUsers } from "@/lib/push";
import { formatRupiah } from "@/lib/format";
import SplitBill from "@/models/SplitBill";
import SplitBillShare from "@/models/SplitBillShare";
import Expense from "@/models/Expense";

export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/split-bills/[id]/settle">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await connectToDatabase();

  const bill = await SplitBill.findById(id);
  if (!bill) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Cuma partisipan yang bersangkutan yang boleh nge-settle bagiannya
  // SENDIRI — bukan payer, bukan partisipan lain (sama alasan kenapa
  // cuma kontributor asli yang boleh hapus kontribusi Savings Goal-nya
  // sendiri: ini bikin Expense di budget PRIBADI orang itu).
  const share = await SplitBillShare.findOne({
    splitBillId: id,
    userId: user.id,
  });
  if (!share) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (share.settled) {
    return NextResponse.json(
      { error: "Bagian ini sudah ditandai lunas" },
      { status: 400 }
    );
  }

  const expense = await Expense.create({
    userId: user.id,
    date: new Date(),
    category: "lain-lain",
    amount: share.amount,
    note: `Bayar: ${bill.name}`,
  });

  share.settled = true;
  share.settledAt = new Date();
  share.expenseId = expense._id;
  await share.save();

  try {
    await sendPushToUsers([bill.payerId.toString()], {
      title: "Pundi",
      body: `${user.name ?? "Seseorang"} sudah bayar bagiannya ${formatRupiah(
        share.amount
      )} buat "${bill.name}"`,
      url: "/split-bills",
    });
  } catch {
    // best-effort, tidak menggagalkan response utama
  }

  return NextResponse.json(share);
}

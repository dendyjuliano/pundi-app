import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import Installment from "@/models/Installment";
import InstallmentPayment from "@/models/InstallmentPayment";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/installments/[id]">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await connectToDatabase();
  const installment = await Installment.findOne({ _id: id, userId: user.id });
  if (!installment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(installment);
}

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/installments/[id]">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await request.json();

  // principal/annualInterestRate/tenorMonths/interestType SENGAJA TIDAK
  // bisa diedit lagi setelah dibuat — cuma dipakai sekali buat menghitung
  // monthlyInstallment di awal, mengubahnya belakangan jadi ambigu
  // maksudnya apa (apakah pokok sisa yang baru, atau pokok awal salah
  // ketik, dll). Kalau nominal cicilan beda dikit dari tagihan bank asli,
  // koreksi langsung lewat monthlyInstallment.
  const update: {
    name?: string;
    monthlyInstallment?: number;
    dayOfMonth?: number;
    active?: boolean;
  } = {};
  if (typeof body.name === "string" && body.name.trim()) {
    update.name = body.name.trim();
  }
  if (body.monthlyInstallment !== undefined) {
    const monthlyInstallment = Number(body.monthlyInstallment);
    if (!Number.isFinite(monthlyInstallment) || monthlyInstallment <= 0) {
      return NextResponse.json(
        { error: "monthlyInstallment must be a positive number" },
        { status: 400 }
      );
    }
    update.monthlyInstallment = monthlyInstallment;
  }
  if (body.dayOfMonth !== undefined) {
    const dayOfMonth = Number(body.dayOfMonth);
    if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
      return NextResponse.json(
        { error: "dayOfMonth must be an integer between 1 and 31" },
        { status: 400 }
      );
    }
    update.dayOfMonth = dayOfMonth;
  }
  if (typeof body.active === "boolean") {
    update.active = body.active;
  }

  await connectToDatabase();
  const installment = await Installment.findOneAndUpdate(
    { _id: id, userId: user.id },
    update,
    { new: true }
  );
  if (!installment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(installment);
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/installments/[id]">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await connectToDatabase();
  const installment = await Installment.findOneAndDelete({
    _id: id,
    userId: user.id,
  });
  if (!installment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  // Cascade hapus InstallmentPayment — running-log yang tidak masuk akal
  // disimpan begitu cicilan induknya sudah tidak ada. TAPI Expense yang
  // otomatis ke-link dari tiap payment SENGAJA TIDAK ikut dihapus — itu
  // representasi uang yang beneran sudah "keluar" secara historis, sama
  // prinsipnya kayak SavingsGoal delete.
  await InstallmentPayment.deleteMany({ installmentId: id, userId: user.id });

  return NextResponse.json({ success: true });
}

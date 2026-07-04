import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import { calculateMonthlyInstallment, type InterestType } from "@/lib/installment";
import Installment from "@/models/Installment";
import InstallmentPayment from "@/models/InstallmentPayment";

const VALID_INTEREST_TYPES: InterestType[] = ["flat", "efektif"];

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectToDatabase();
  const installments = await Installment.find({ userId: user.id }).sort({
    createdAt: 1,
  });

  // Progress dihitung on-the-fly dari total payment tiap cicilan, bukan
  // field ter-cache — pola yang sama dengan SavingsGoal.
  const installmentIds = installments.map((i) => i._id);
  const stats = await InstallmentPayment.aggregate([
    { $match: { installmentId: { $in: installmentIds } } },
    {
      $group: {
        _id: "$installmentId",
        monthsPaid: { $sum: 1 },
        totalPaid: { $sum: "$amount" },
      },
    },
  ]);
  const statsByInstallmentId = new Map(
    stats.map((s) => [s._id.toString(), s])
  );

  const result = installments.map((i) => {
    const stat = statsByInstallmentId.get(i._id.toString());
    const monthsPaid = stat?.monthsPaid ?? 0;
    const totalPaid = stat?.totalPaid ?? 0;
    const remainingMonths = Math.max(0, i.tenorMonths - monthsPaid);
    return {
      _id: i._id,
      name: i.name,
      interestType: i.interestType,
      tenorMonths: i.tenorMonths,
      monthlyInstallment: i.monthlyInstallment,
      dayOfMonth: i.dayOfMonth,
      active: i.active,
      monthsPaid,
      totalPaid,
      remainingMonths,
      remainingAmount: remainingMonths * i.monthlyInstallment,
      lunas: monthsPaid >= i.tenorMonths,
    };
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const interestType = body.interestType as InterestType;
  const principal = Number(body.principal);
  const annualInterestRate = Number(body.annualInterestRate);
  const tenorMonths = Number(body.tenorMonths);
  const dayOfMonth = Number(body.dayOfMonth);

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!VALID_INTEREST_TYPES.includes(interestType)) {
    return NextResponse.json(
      { error: "interestType must be 'flat' or 'efektif'" },
      { status: 400 }
    );
  }
  if (!Number.isFinite(principal) || principal <= 0) {
    return NextResponse.json(
      { error: "principal must be a positive number" },
      { status: 400 }
    );
  }
  if (!Number.isFinite(annualInterestRate) || annualInterestRate < 0) {
    return NextResponse.json(
      { error: "annualInterestRate must be a non-negative number" },
      { status: 400 }
    );
  }
  if (!Number.isInteger(tenorMonths) || tenorMonths <= 0) {
    return NextResponse.json(
      { error: "tenorMonths must be a positive integer" },
      { status: 400 }
    );
  }
  if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
    return NextResponse.json(
      { error: "dayOfMonth must be an integer between 1 and 31" },
      { status: 400 }
    );
  }

  const monthlyInstallment = calculateMonthlyInstallment({
    principal,
    annualInterestRate,
    tenorMonths,
    interestType,
  });

  await connectToDatabase();
  const installment = await Installment.create({
    userId: user.id,
    name,
    interestType,
    principal,
    annualInterestRate,
    tenorMonths,
    monthlyInstallment,
    dayOfMonth,
  });
  return NextResponse.json(installment, { status: 201 });
}

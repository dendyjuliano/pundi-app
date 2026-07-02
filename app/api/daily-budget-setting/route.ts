import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import DailyBudgetSetting from "@/models/DailyBudgetSetting";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectToDatabase();
  const latest = await DailyBudgetSetting.findOne({ userId: user.id }).sort({
    effectiveFrom: -1,
  });
  return NextResponse.json(latest);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const amountPerDay = Number(body.amountPerDay);
  if (!Number.isFinite(amountPerDay) || amountPerDay <= 0) {
    return NextResponse.json(
      { error: "amountPerDay must be a positive number" },
      { status: 400 }
    );
  }
  const effectiveFrom = body.effectiveFrom
    ? new Date(body.effectiveFrom)
    : new Date();

  await connectToDatabase();
  const setting = await DailyBudgetSetting.create({
    userId: user.id,
    amountPerDay,
    effectiveFrom,
  });
  return NextResponse.json(setting, { status: 201 });
}

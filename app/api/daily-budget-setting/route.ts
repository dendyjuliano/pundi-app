import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import DailyBudgetSetting from "@/models/DailyBudgetSetting";
import AllocationCategory from "@/models/AllocationCategory";

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

  // Jatah harian cuma "kepakai" ke Total Alokasi/Bulan Ini kalau ada
  // kategori alokasi bertipe "food" yang menampungnya. Tanpa ini, jatah
  // harian yang diisi user diam-diam tidak pernah dihitung di mana pun
  // selain "Hari Ini"/"Minggu" (yang baca amountPerDay langsung) — jadi
  // pastikan kategorinya selalu ada begitu jatah harian pertama disimpan.
  const hasFoodCategory = await AllocationCategory.exists({
    userId: user.id,
    type: "food",
  });
  if (!hasFoodCategory) {
    await AllocationCategory.create({
      userId: user.id,
      name: "Makan",
      type: "food",
    });
  }

  return NextResponse.json(setting, { status: 201 });
}

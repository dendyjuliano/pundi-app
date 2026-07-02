import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import IncomeCategory from "@/models/IncomeCategory";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectToDatabase();
  const categories = await IncomeCategory.find({ userId: user.id }).sort({
    createdAt: 1,
  });
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  await connectToDatabase();
  const category = await IncomeCategory.create({ userId: user.id, name });
  return NextResponse.json(category, { status: 201 });
}

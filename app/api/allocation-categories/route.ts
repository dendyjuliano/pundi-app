import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import AllocationCategory from "@/models/AllocationCategory";

const VALID_TYPES = ["fixed", "food", "invest", "other"];

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectToDatabase();
  const categories = await AllocationCategory.find({ userId: user.id }).sort({
    createdAt: 1,
  });
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const type = body.type;
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "invalid type" }, { status: 400 });
  }

  await connectToDatabase();
  const category = await AllocationCategory.create({
    userId: user.id,
    name,
    type,
  });
  return NextResponse.json(category, { status: 201 });
}

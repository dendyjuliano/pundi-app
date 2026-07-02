import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import IncomeCategory from "@/models/IncomeCategory";

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/income-categories/[id]">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  await connectToDatabase();
  const category = await IncomeCategory.findOneAndUpdate(
    { _id: id, userId: user.id },
    { name },
    { new: true }
  );
  if (!category) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(category);
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/income-categories/[id]">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await connectToDatabase();
  const result = await IncomeCategory.findOneAndDelete({
    _id: id,
    userId: user.id,
  });
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}

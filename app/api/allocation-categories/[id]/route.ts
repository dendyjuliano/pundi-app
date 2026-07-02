import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import AllocationCategory from "@/models/AllocationCategory";

const VALID_TYPES = ["fixed", "food", "invest", "other"];

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/allocation-categories/[id]">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await request.json();

  const update: { name?: string; type?: string } = {};
  if (typeof body.name === "string" && body.name.trim()) {
    update.name = body.name.trim();
  }
  if (body.type !== undefined) {
    if (!VALID_TYPES.includes(body.type)) {
      return NextResponse.json({ error: "invalid type" }, { status: 400 });
    }
    update.type = body.type;
  }

  await connectToDatabase();
  const category = await AllocationCategory.findOneAndUpdate(
    { _id: id, userId: user.id },
    update,
    { new: true }
  );
  if (!category) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(category);
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/allocation-categories/[id]">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await connectToDatabase();
  const result = await AllocationCategory.findOneAndDelete({
    _id: id,
    userId: user.id,
  });
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}

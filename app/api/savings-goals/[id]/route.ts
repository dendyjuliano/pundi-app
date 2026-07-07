import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import {
  canAccessSavingsGoal,
  canEditSavingsGoal,
  getCurrentUser,
} from "@/lib/session";
import { validateFriendCollaboratorIds } from "@/lib/friendship";
import SavingsGoal from "@/models/SavingsGoal";
import SavingsContribution from "@/models/SavingsContribution";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/savings-goals/[id]">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await connectToDatabase();
  const goal = await SavingsGoal.findById(id);
  if (!goal || !canAccessSavingsGoal(goal, user)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(goal);
}

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/savings-goals/[id]">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await request.json();

  const update: {
    name?: string;
    targetAmount?: number;
    targetDate?: Date | null;
    shared?: boolean;
    friendCollaboratorIds?: string[];
  } = {};
  if (typeof body.name === "string" && body.name.trim()) {
    update.name = body.name.trim();
  }
  if (typeof body.shared === "boolean") {
    update.shared = body.shared;
  }
  if (Array.isArray(body.friendCollaboratorIds)) {
    update.friendCollaboratorIds = (
      body.friendCollaboratorIds as unknown[]
    ).filter((id): id is string => typeof id === "string");
  }
  if (body.targetAmount !== undefined) {
    const targetAmount = Number(body.targetAmount);
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      return NextResponse.json(
        { error: "targetAmount must be a positive number" },
        { status: 400 }
      );
    }
    update.targetAmount = targetAmount;
  }
  if (body.targetDate !== undefined) {
    if (body.targetDate === null) {
      update.targetDate = null;
    } else {
      const targetDate = new Date(body.targetDate);
      if (isNaN(targetDate.getTime())) {
        return NextResponse.json(
          { error: "invalid targetDate" },
          { status: 400 }
        );
      }
      update.targetDate = targetDate;
    }
  }

  await connectToDatabase();
  const existing = await SavingsGoal.findById(id);
  if (!existing || !canAccessSavingsGoal(existing, user)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canEditSavingsGoal(existing, user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (update.friendCollaboratorIds) {
    // Validasi terhadap teman milik PEMBUAT goal (bukan yang lagi
    // PATCH — bisa jadi admin keluarga yang mengelola goal Bersama
    // anggota lain), konsisten sama makna "kolaborator teman milik
    // pembuat goal" di POST create.
    const friendCheck = await validateFriendCollaboratorIds(
      existing.userId.toString(),
      update.friendCollaboratorIds
    );
    if (!friendCheck.ok) {
      return NextResponse.json({ error: friendCheck.error }, { status: 400 });
    }
  }

  Object.assign(existing, update);
  await existing.save();
  return NextResponse.json(existing);
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/savings-goals/[id]">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await connectToDatabase();
  const existing = await SavingsGoal.findById(id);
  if (!existing || !canAccessSavingsGoal(existing, user)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canEditSavingsGoal(existing, user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await existing.deleteOne();
  // Cascade — beda dari kategori (AllocationCategory/IncomeCategory) yang
  // sengaja no-cascade karena MonthlyBudget adalah snapshot historis;
  // SavingsContribution murni running-log yang tidak masuk akal disimpan
  // begitu goal induknya sudah tidak ada. Dihapus dari SEMUA kontributor
  // (bukan cuma userId yang minta hapus) — goal Bersama bisa punya
  // kontribusi dari banyak anggota keluarga.
  //
  // TAPI: Expense yang otomatis ke-link dari tiap kontribusi SENGAJA
  // TIDAK ikut dihapus di sini — itu representasi uang yang beneran
  // sudah "keluar" secara historis, sama prinsipnya kayak kenapa hapus
  // kategori tidak mencabut nominal yang sudah tersimpan di
  // MonthlyBudget bulan-bulan lalu. Hapus goal cuma berarti "berhenti
  // nge-track progress ke tujuan ini", bukan "kontribusi yang sudah
  // terjadi dianggap tidak pernah ada".
  await SavingsContribution.deleteMany({ goalId: id });

  return NextResponse.json({ success: true });
}

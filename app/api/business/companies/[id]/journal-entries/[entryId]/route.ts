import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { resolveCompanyAccess } from "@/lib/business/access";
import JournalEntry from "@/models/business/JournalEntry";

// SENGAJA tidak ada handler PATCH di file ini — jurnal yang sudah
// diposting immutable, koreksi lewat entry pembalik (lihat
// [entryId]/reverse/route.ts), bukan edit in-place.

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/business/companies/[id]/journal-entries/[entryId]">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, entryId } = await ctx.params;
  const access = await resolveCompanyAccess(user.id, id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const entry = await JournalEntry.findOne({ _id: entryId, companyId: id });
  if (!entry) {
    return NextResponse.json({ error: "Jurnal tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json(entry);
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/business/companies/[id]/journal-entries/[entryId]">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, entryId } = await ctx.params;
  const access = await resolveCompanyAccess(user.id, id, {
    minRole: "accountant",
  });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const entry = await JournalEntry.findOne({ _id: entryId, companyId: id });
  if (!entry) {
    return NextResponse.json({ error: "Jurnal tidak ditemukan" }, { status: 404 });
  }

  await entry.deleteOne();
  return NextResponse.json({ success: true });
}

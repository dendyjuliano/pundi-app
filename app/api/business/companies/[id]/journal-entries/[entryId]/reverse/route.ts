import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { resolveCompanyAccess } from "@/lib/business/access";
import JournalEntry from "@/models/business/JournalEntry";

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/business/companies/[id]/journal-entries/[entryId]/reverse">
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

  const original = await JournalEntry.findOne({ _id: entryId, companyId: id });
  if (!original) {
    return NextResponse.json({ error: "Jurnal tidak ditemukan" }, { status: 404 });
  }
  if (original.isReversed) {
    return NextResponse.json(
      { error: "Jurnal ini sudah pernah dikoreksi" },
      { status: 409 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const date = body.date ? new Date(body.date) : new Date();
  if (isNaN(date.getTime())) {
    return NextResponse.json({ error: "invalid date" }, { status: 400 });
  }

  // Entry BARU dengan debit/kredit tiap baris ditukar — koreksi lewat
  // jurnal pembalik, bukan edit in-place, biar jejak audit tetap utuh.
  const reversal = await JournalEntry.create({
    companyId: id,
    date,
    description: `Koreksi: ${original.description}`,
    lines: original.lines.map((line: { accountId: unknown; debit: number; credit: number; memo?: string }) => ({
      accountId: line.accountId,
      debit: line.credit,
      credit: line.debit,
      memo: line.memo,
    })),
    createdBy: user.id,
    sourceType: "reversal",
    reversalOfEntryId: original._id,
  });

  original.isReversed = true;
  await original.save();

  return NextResponse.json(reversal, { status: 201 });
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { resolveCompanyAccess } from "@/lib/business/access";
import Account from "@/models/business/Account";
import JournalEntry from "@/models/business/JournalEntry";

type LineInput = { accountId: string; debit: number; credit: number; memo?: string };

// Validasi baris jurnal: minimal 2 baris, tiap akun beneran milik company
// ini & aktif, tiap baris cuma boleh isi salah satu sisi (debit XOR
// kredit, bukan dua-duanya atau nol dua-duanya), dan yang paling penting
// total debit === total kredit (float-safe, dibulatkan 2 desimal sebelum
// dibandingkan, walau di app ini nominal rupiah selalu bulat).
async function validateLines(
  companyId: string,
  rawLines: unknown
): Promise<{ ok: true; lines: LineInput[] } | { ok: false; error: string }> {
  if (!Array.isArray(rawLines) || rawLines.length < 2) {
    return { ok: false, error: "lines must have at least 2 entries" };
  }

  const lines: LineInput[] = [];
  for (const raw of rawLines) {
    const line = raw as Record<string, unknown>;
    const accountId = typeof line.accountId === "string" ? line.accountId : "";
    const debit = Number(line.debit ?? 0);
    const credit = Number(line.credit ?? 0);
    const memo = typeof line.memo === "string" ? line.memo.trim() : undefined;

    if (!accountId) return { ok: false, error: "accountId is required on every line" };
    if (!Number.isFinite(debit) || debit < 0 || !Number.isFinite(credit) || credit < 0) {
      return { ok: false, error: "debit/credit must be non-negative numbers" };
    }
    const hasDebit = debit > 0;
    const hasCredit = credit > 0;
    if (hasDebit === hasCredit) {
      return {
        ok: false,
        error: "each line must have exactly one of debit or credit set",
      };
    }
    lines.push({ accountId, debit, credit, memo });
  }

  const accounts = await Account.find({
    companyId,
    _id: { $in: lines.map((l) => l.accountId) },
    isActive: true,
  });
  if (accounts.length !== new Set(lines.map((l) => l.accountId)).size) {
    return {
      ok: false,
      error: "one or more accounts are invalid, inactive, or not in this company",
    };
  }

  const totalDebit = Math.round(lines.reduce((s, l) => s + l.debit, 0) * 100) / 100;
  const totalCredit = Math.round(lines.reduce((s, l) => s + l.credit, 0) * 100) / 100;
  if (totalDebit !== totalCredit) {
    return { ok: false, error: "total debit must equal total credit" };
  }

  return { ok: true, lines };
}

export async function GET(
  request: Request,
  ctx: RouteContext<"/api/business/companies/[id]/journal-entries">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const access = await resolveCompanyAccess(user.id, id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const filter: Record<string, unknown> = { companyId: id };
  if (from || to) {
    const dateFilter: Record<string, Date> = {};
    if (from) {
      const fromDate = new Date(from);
      if (isNaN(fromDate.getTime())) {
        return NextResponse.json({ error: "invalid from" }, { status: 400 });
      }
      dateFilter.$gte = fromDate;
    }
    if (to) {
      const toDate = new Date(to);
      if (isNaN(toDate.getTime())) {
        return NextResponse.json({ error: "invalid to" }, { status: 400 });
      }
      dateFilter.$lte = toDate;
    }
    filter.date = dateFilter;
  }

  const entries = await JournalEntry.find(filter).sort({ date: -1, createdAt: -1 });
  return NextResponse.json(entries);
}

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/business/companies/[id]/journal-entries">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const access = await resolveCompanyAccess(user.id, id, { minRole: "staff" });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await request.json();
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  const date = body.date ? new Date(body.date) : new Date();

  if (!description) {
    return NextResponse.json({ error: "description is required" }, { status: 400 });
  }
  if (isNaN(date.getTime())) {
    return NextResponse.json({ error: "invalid date" }, { status: 400 });
  }

  const validation = await validateLines(id, body.lines);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const entry = await JournalEntry.create({
    companyId: id,
    date,
    description,
    lines: validation.lines,
    createdBy: user.id,
    sourceType: "manual",
  });
  return NextResponse.json(entry, { status: 201 });
}

import { connectToDatabase } from "@/lib/mongodb";
import CompanyMember from "@/models/business/CompanyMember";

export type CompanyRole = "owner" | "accountant" | "staff";

const ROLE_RANK: Record<CompanyRole, number> = {
  staff: 0,
  accountant: 1,
  owner: 2,
};

type CompanyAccessResult =
  | { ok: true; role: CompanyRole }
  | { ok: false; status: 403 | 404; error: string };

// Beda dari familyId (1:1, disimpan di JWT session), keanggotaan company
// bisa banyak per user dengan role beda-beda, jadi selalu di-re-derive dari
// DB tiap request (tidak pernah dipercaya dari client/URL semata). 404
// (bukan 403) kalau requester bukan member sama sekali — jangan bocorkan ke
// non-member bahwa company ini ada, pola sama resolveAdminTargetUserId di
// lib/session.ts.
export async function resolveCompanyAccess(
  userId: string,
  companyId: string,
  opts?: { minRole?: CompanyRole }
): Promise<CompanyAccessResult> {
  await connectToDatabase();
  const member = await CompanyMember.findOne({ companyId, userId });
  if (!member) {
    return { ok: false, status: 404, error: "Perusahaan tidak ditemukan" };
  }

  const minRole = opts?.minRole ?? "staff";
  if (ROLE_RANK[member.role as CompanyRole] < ROLE_RANK[minRole]) {
    return { ok: false, status: 403, error: "Tidak punya izin untuk aksi ini" };
  }

  return { ok: true, role: member.role as CompanyRole };
}

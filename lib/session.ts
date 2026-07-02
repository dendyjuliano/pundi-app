import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import UserModel from "@/models/User";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user;
}

type TargetResolution =
  | { ok: true; targetUserId: string }
  | { ok: false; status: number; error: string };

// Resolves which user's data to fetch for endpoints that support an
// admin viewing another user's data via `?userId=`. Enforces the family
// boundary: an admin can only ever view users within their own familyId,
// never anyone else's — this is checked here (server-side, against the
// DB) rather than trusted from the request, so it can't be bypassed.
export async function resolveAdminTargetUserId(
  requestingUser: { id: string; role: "admin" | "member"; familyId: string },
  requestedUserId: string | null
): Promise<TargetResolution> {
  if (!requestedUserId || requestedUserId === requestingUser.id) {
    return { ok: true, targetUserId: requestingUser.id };
  }
  if (requestingUser.role !== "admin") {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  await connectToDatabase();
  const target = await UserModel.findOne({
    _id: requestedUserId,
    familyId: requestingUser.familyId,
  });
  if (!target) {
    return { ok: false, status: 404, error: "User tidak ditemukan" };
  }

  return { ok: true, targetUserId: requestedUserId };
}

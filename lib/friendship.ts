import Friendship from "@/models/Friendship";

// Dipakai di route savings-goals (create & edit) buat mastiin
// `friendCollaboratorIds` yang dikirim beneran teman ACCEPTED milik user
// yang bikin/ubah goal — dicek server-side, bukan dipercaya dari body
// request begitu saja, biar orang tidak bisa nambahin sembarang user id
// (termasuk yang bukan teman sama sekali) jadi kolaborator goal-nya.
export async function validateFriendCollaboratorIds(
  userId: string,
  friendIds: string[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (friendIds.length === 0) return { ok: true };

  const friendships = await Friendship.find({
    $or: [{ fromUserId: userId }, { toUserId: userId }],
    status: "accepted",
  });
  const acceptedFriendIds = new Set(
    friendships.map((f) =>
      f.fromUserId.toString() === userId
        ? f.toUserId.toString()
        : f.fromUserId.toString()
    )
  );

  const invalid = friendIds.filter((id) => !acceptedFriendIds.has(id));
  if (invalid.length > 0) {
    return {
      ok: false,
      error: `Beberapa user bukan teman kamu, tidak bisa ditambahkan sebagai kolaborator`,
    };
  }

  return { ok: true };
}

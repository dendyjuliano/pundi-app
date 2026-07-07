"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserPlus, Check, X, Search } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { IconChip } from "@/components/icon-chip";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";

type Friend = { friendshipId: string; id: string; name: string; email: string };
type FriendRequest = { id: string; userId: string; name: string };
type SearchResult = { id: string; name: string; maskedEmail: string };

const MIN_QUERY_LENGTH = 3;

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  async function loadAll() {
    const [friendsRes, requestsRes] = await Promise.all([
      fetch("/api/friends"),
      fetch("/api/friends/requests"),
    ]);
    setFriends(await friendsRes.json());
    const requests = await requestsRes.json();
    setIncoming(requests.incoming);
    setOutgoing(requests.outgoing);
  }

  useEffect(() => {
    (async () => {
      await loadAll();
      setLoading(false);
    })();
  }, []);

  // Live search di-debounce 350ms — biar tidak nembak request tiap
  // ketikan, cuma nunggu jeda singkat setelah user berhenti ngetik.
  useEffect(() => {
    // Render sudah nge-gate panel hasil di bawah `query.trim().length >=
    // MIN_QUERY_LENGTH`, jadi tidak perlu reset `results` secara
    // synchronous di sini kalau query masih pendek — cukup skip fetch.
    if (query.trim().length < MIN_QUERY_LENGTH) return;

    const handle = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(
        `/api/friends/search?q=${encodeURIComponent(query.trim())}`
      );
      if (res.ok) setResults(await res.json());
      setSearching(false);
    }, 350);
    return () => clearTimeout(handle);
  }, [query]);

  async function handleSendToUser(userId: string, name: string) {
    setSendingId(userId);
    const res = await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setSendingId(null);
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error ?? "Gagal mengirim permintaan pertemanan");
      return;
    }
    toast.success(`Permintaan pertemanan terkirim ke ${name}`);
    setQuery("");
    setResults([]);
    loadAll();
  }

  async function handleRespond(id: string, status: "accepted" | "declined") {
    const res = await fetch(`/api/friends/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      toast.error("Gagal memproses permintaan");
      return;
    }
    toast.success(
      status === "accepted" ? "Permintaan diterima" : "Permintaan ditolak"
    );
    loadAll();
  }

  async function handleCancelOrUnfriend(id: string) {
    const res = await fetch(`/api/friends/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Gagal menghapus");
      return;
    }
    toast.success("Berhasil dihapus");
    loadAll();
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Teman</h1>
        <p className="text-sm text-muted-foreground">
          Tambah teman buat diundang jadi kolaborator Target Tabungan —
          terpisah dari keluarga, bisa dikombinasikan di satu goal yang sama
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <IconChip icon={UserPlus} color="blue" />
          <CardTitle>Tambah Teman</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari nama atau email (min. 3 huruf)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {query.trim().length >= MIN_QUERY_LENGTH && (
            <div className="space-y-1.5">
              {searching ? (
                <Skeleton className="h-10 w-full" />
              ) : results.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  Tidak ada user ditemukan
                </p>
              ) : (
                results.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {r.maskedEmail}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      disabled={sendingId === r.id}
                      onClick={() => handleSendToUser(r.id, r.name)}
                    >
                      {sendingId === r.id ? "Mengirim..." : "Kirim"}
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {incoming.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Permintaan Masuk</CardTitle>
            <CardDescription>
              Orang-orang yang ingin berteman dengan kamu
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {incoming.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-2.5"
              >
                <span className="font-medium text-sm">{r.name}</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-emerald-600 hover:text-emerald-700"
                    onClick={() => handleRespond(r.id, "accepted")}
                  >
                    <Check className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRespond(r.id, "declined")}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {outgoing.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Permintaan Terkirim</CardTitle>
            <CardDescription>Menunggu konfirmasi dari mereka</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {outgoing.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-2.5"
              >
                <span className="font-medium text-sm">{r.name}</span>
                <ConfirmDeleteButton
                  title="Batalkan permintaan ini?"
                  description={`Permintaan pertemanan ke ${r.name} akan dibatalkan.`}
                  onConfirm={() => handleCancelOrUnfriend(r.id)}
                  className="size-7 text-muted-foreground hover:text-destructive"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Daftar Teman</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {friends.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Belum ada teman — kirim permintaan pertemanan di atas
            </p>
          ) : (
            friends.map((f) => (
              <div
                key={f.friendshipId}
                className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-2.5"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{f.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {f.email}
                  </p>
                </div>
                <ConfirmDeleteButton
                  title={`Hapus pertemanan dengan ${f.name}?`}
                  description="Kalian tidak akan lagi terhubung sebagai teman. Kolaborator yang sudah ditambahkan ke Target Tabungan tetap ada sampai dihapus manual dari goal-nya."
                  onConfirm={() => handleCancelOrUnfriend(f.friendshipId)}
                  className="size-7 text-muted-foreground hover:text-destructive"
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

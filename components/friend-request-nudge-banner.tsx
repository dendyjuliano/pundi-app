"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const DISMISS_KEY = "pundi-friend-request-banner-dismissed";

// Tanggal LOKAL browser (bukan UTC) — pola sama persis
// SavingsGoalNudgeBanner: disimpan per-browser, dismiss cuma berlaku
// hari itu, muncul lagi besok kalau requestnya masih belum diproses.
function todayLocalISO() {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 10);
}

export function FriendRequestNudgeBanner() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === todayLocalISO()) return;

    (async () => {
      const res = await fetch("/api/friends/requests");
      if (!res.ok) return;
      const data = await res.json();
      setCount(data.incoming?.length ?? 0);
    })();
  }, []);

  function handleClose() {
    localStorage.setItem(DISMISS_KEY, todayLocalISO());
    setCount(0);
  }

  if (count === 0) return null;

  return (
    <Card className="border-0 bg-linear-to-br from-blue-500 to-indigo-600 text-white">
      <CardContent className="relative flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 size-7 text-white/80 hover:bg-white/10 hover:text-white sm:static sm:order-last sm:shrink-0"
          onClick={handleClose}
        >
          <X className="size-4" />
        </Button>
        <div className="flex items-start gap-3 pr-8 sm:min-w-0 sm:flex-1 sm:pr-0">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white/20">
            <UserPlus className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              {count} permintaan pertemanan baru
            </p>
            <p className="text-sm text-white/85">
              Ada yang ingin menambahkanmu sebagai teman di Pundi.
            </p>
          </div>
        </div>
        <Button
          asChild
          size="sm"
          className="w-full bg-white text-blue-700 hover:bg-white/90 sm:w-auto sm:shrink-0"
        >
          <Link href="/friends">Lihat</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

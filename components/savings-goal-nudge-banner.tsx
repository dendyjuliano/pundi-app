"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Target, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const DISMISS_KEY = "pundi-savings-banner-dismissed";

// Tanggal LOKAL browser (bukan UTC) — dipakai sebagai kunci "hari ini"
// biar pas dibandingkan besok (hari kalender baru), banner ini muncul
// lagi meski localStorage-nya belum di-clear. Disimpan per-browser,
// bukan per-akun (kalau ditutup di HP, tetap muncul lagi di laptop).
function todayLocalISO() {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 10);
}

export function SavingsGoalNudgeBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === todayLocalISO()) return;

    (async () => {
      const res = await fetch("/api/savings-goals");
      if (!res.ok) return;
      const goals = await res.json();
      if (goals.length === 0) setVisible(true);
    })();
  }, []);

  function handleClose() {
    localStorage.setItem(DISMISS_KEY, todayLocalISO());
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <Card className="border-0 bg-linear-to-br from-violet-500 to-purple-600 text-white">
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
            <Target className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Belum punya target tabungan</p>
            <p className="text-sm text-white/85">
              Bikin target buat tujuan tertentu (liburan, dana darurat, dst)
              dan pantau progressnya di satu tempat.
            </p>
          </div>
        </div>
        <Button
          asChild
          size="sm"
          className="w-full bg-white text-violet-700 hover:bg-white/90 sm:w-auto sm:shrink-0"
        >
          <Link href="/target">Buat Target</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationToggle() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setLoading(false);
        return;
      }
      setSupported(true);
      const registration = await navigator.serviceWorker.register("/sw.js");
      const existing = await registration.pushManager.getSubscription();
      setSubscribed(!!existing);
      setLoading(false);
    })();
  }, []);

  async function enable() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      toast.error("Fitur notifikasi belum dikonfigurasi di server ini");
      return;
    }

    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error(
          "Izin notifikasi ditolak — aktifkan lewat pengaturan browser kalau berubah pikiran"
        );
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = sub.toJSON();

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      if (!res.ok) {
        toast.error("Gagal mengaktifkan pengingat harian");
        return;
      }
      setSubscribed(true);
      toast.success("Pengingat harian diaktifkan");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      toast.success("Pengingat harian dimatikan");
    } finally {
      setBusy(false);
    }
  }

  // Sembunyikan total kalau browser tidak dukung Push API sama sekali
  // (mis. Safari iOS versi lama, atau belum ditambah ke Home Screen di
  // iOS — push cuma jalan setelah PWA di-install di sana)
  if (loading || !supported) return null;

  return (
    <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
      <div className="flex items-center gap-3">
        {subscribed ? (
          <Bell className="size-4 text-emerald-600 shrink-0" />
        ) : (
          <BellOff className="size-4 text-muted-foreground shrink-0" />
        )}
        <div>
          <p className="text-sm font-medium">Pengingat harian</p>
          <p className="text-xs text-muted-foreground">
            Notifikasi jam 12 siang kalau belum ada pengeluaran tercatat
            hari ini
          </p>
        </div>
      </div>
      <Button
        size="sm"
        variant={subscribed ? "outline" : "default"}
        disabled={busy}
        onClick={subscribed ? disable : enable}
      >
        {subscribed ? "Matikan" : "Aktifkan"}
      </Button>
    </div>
  );
}

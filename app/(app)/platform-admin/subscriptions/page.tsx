"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { IconChip } from "@/components/icon-chip";

type PendingClaim = {
  _id: string;
  companyName: string;
  claimedByName: string;
  claimedByEmail: string;
  amount: number;
  claimedAt: string;
  periodStart: string;
  periodEnd: string;
  note?: string;
};

export default function PlatformAdminSubscriptionsPage() {
  const [claims, setClaims] = useState<PendingClaim[] | null>(null);
  const [forbidden, setForbidden] = useState(false);

  async function load() {
    const res = await fetch("/api/platform-admin/subscriptions?status=pending");
    if (res.status === 403 || res.status === 401) {
      setForbidden(true);
      return;
    }
    if (res.ok) setClaims(await res.json());
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  async function approve(id: string) {
    const res = await fetch(`/api/platform-admin/subscriptions/${id}/approve`, {
      method: "POST",
    });
    if (!res.ok) {
      toast.error("Gagal approve klaim");
      return;
    }
    toast.success("Klaim disetujui");
    load();
  }

  async function reject(id: string) {
    const note = window.prompt("Alasan penolakan (opsional):") ?? undefined;
    const res = await fetch(`/api/platform-admin/subscriptions/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    if (!res.ok) {
      toast.error("Gagal reject klaim");
      return;
    }
    toast.success("Klaim ditolak");
    load();
  }

  if (forbidden) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Tidak punya akses</h1>
        <p className="text-sm text-muted-foreground">
          Halaman ini cuma bisa diakses platform admin.
        </p>
      </div>
    );
  }

  if (!claims) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <IconChip icon={ShieldCheck} color="violet" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Verifikasi Langganan</h1>
          <p className="text-sm text-muted-foreground">
            Klaim transfer manual Pundi Business yang menunggu diverifikasi
          </p>
        </div>
      </div>

      {claims.length === 0 ? (
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            Tidak ada klaim yang menunggu verifikasi.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {claims.map((c) => (
            <Card key={c._id}>
              <CardHeader>
                <CardTitle className="text-base">{c.companyName}</CardTitle>
                <CardDescription>
                  Diklaim oleh {c.claimedByName} ({c.claimedByEmail}) —{" "}
                  {new Date(c.claimedAt).toLocaleString("id-ID")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">
                  <span className="font-medium">{formatRupiah(c.amount)}</span> untuk
                  periode {new Date(c.periodStart).toLocaleDateString("id-ID")} —{" "}
                  {new Date(c.periodEnd).toLocaleDateString("id-ID")}
                </p>
                {c.note && (
                  <p className="text-sm text-muted-foreground">Catatan: {c.note}</p>
                )}
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => approve(c._id)}>
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => reject(c._id)}>
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

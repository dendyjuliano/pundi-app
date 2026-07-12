"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { UserPlus, Receipt } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconChip } from "@/components/icon-chip";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { formatRupiah } from "@/lib/format";

type Company = {
  _id: string;
  name: string;
  legalName?: string;
  industry?: string;
  role: "owner" | "accountant" | "staff";
};

type Member = {
  _id: string;
  userId: string;
  name: string;
  email: string;
  role: "owner" | "accountant" | "staff";
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  accountant: "Akuntan",
  staff: "Staff",
};

type Subscription = {
  status: "trial" | "active" | "pending_verification" | "overdue";
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  monthlyAmount: number;
  bankInfo: { bankName: string; accountNumber: string; accountHolder: string } | null;
  pendingPayment: { claimedAt: string; amount: number } | null;
  lastRejectedPayment: { reviewedAt: string; note?: string } | null;
};

const SUBSCRIPTION_BADGE: Record<
  Subscription["status"],
  { label: string; className: string }
> = {
  trial: { label: "Trial", className: "bg-blue-100 text-blue-800" },
  active: { label: "Aktif", className: "bg-emerald-100 text-emerald-800" },
  pending_verification: { label: "Menunggu Verifikasi", className: "bg-amber-100 text-amber-800" },
  overdue: { label: "Jatuh Tempo", className: "bg-red-100 text-red-800" },
};

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

export default function BusinessSettingsPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const [company, setCompany] = useState<Company | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"staff" | "accountant">("staff");
  const [claimNote, setClaimNote] = useState("");

  async function loadAll() {
    const [companyRes, membersRes, subscriptionRes] = await Promise.all([
      fetch(`/api/business/companies/${companyId}`),
      fetch(`/api/business/companies/${companyId}/members`),
      fetch(`/api/business/companies/${companyId}/subscription`),
    ]);
    if (companyRes.ok) {
      const c = await companyRes.json();
      setCompany(c);
      setName(c.name);
      setLegalName(c.legalName ?? "");
    }
    if (membersRes.ok) setMembers(await membersRes.json());
    if (subscriptionRes.ok) setSubscription(await subscriptionRes.json());
  }

  async function claimPayment() {
    const res = await fetch(`/api/business/companies/${companyId}/subscription/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: claimNote.trim() || undefined }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Gagal mengirim klaim pembayaran");
      return;
    }
    toast.success("Klaim terkirim, menunggu verifikasi");
    setClaimNote("");
    loadAll();
  }

  useEffect(() => {
    (async () => {
      await loadAll();
    })();
  }, [companyId]);

  const isOwner = company?.role === "owner";

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/business/companies/${companyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, legalName }),
    });
    if (!res.ok) {
      toast.error("Gagal menyimpan profil");
      return;
    }
    toast.success("Profil perusahaan disimpan");
    loadAll();
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    const res = await fetch(`/api/business/companies/${companyId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Gagal menambah anggota");
      return;
    }
    toast.success("Anggota ditambahkan");
    setInviteEmail("");
    loadAll();
  }

  async function changeRole(memberId: string, role: string) {
    const res = await fetch(
      `/api/business/companies/${companyId}/members/${memberId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      }
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Gagal mengubah role");
      return;
    }
    loadAll();
  }

  async function removeMember(memberId: string) {
    const res = await fetch(
      `/api/business/companies/${companyId}/members/${memberId}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Gagal menghapus anggota");
      return;
    }
    toast.success("Anggota dihapus");
    loadAll();
  }

  if (!company || !members) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Pengaturan</h1>

      {subscription && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3">
              <IconChip icon={Receipt} color="violet" size="sm" />
              <CardTitle className="text-base">Tagihan</CardTitle>
            </div>
            <Badge className={SUBSCRIPTION_BADGE[subscription.status].className}>
              {SUBSCRIPTION_BADGE[subscription.status].label}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {subscription.status === "trial" && subscription.trialEndsAt && (
              <p className="text-sm text-muted-foreground">
                Masa trial gratis berakhir dalam {daysUntil(subscription.trialEndsAt)}{" "}
                hari ({new Date(subscription.trialEndsAt).toLocaleDateString("id-ID")})
              </p>
            )}
            {subscription.status === "active" && subscription.currentPeriodEnd && (
              <p className="text-sm text-muted-foreground">
                Aktif sampai{" "}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString("id-ID")}
              </p>
            )}
            {subscription.status === "pending_verification" && subscription.pendingPayment && (
              <p className="text-sm text-muted-foreground">
                Klaim transfer {formatRupiah(subscription.pendingPayment.amount)} dikirim{" "}
                {new Date(subscription.pendingPayment.claimedAt).toLocaleDateString("id-ID")}
                , menunggu diverifikasi.
              </p>
            )}

            {subscription.lastRejectedPayment && (
              <div className="rounded-xl border border-dashed border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-800">
                Klaim sebelumnya ditolak
                {subscription.lastRejectedPayment.note
                  ? `: ${subscription.lastRejectedPayment.note}`
                  : ""}
                . Silakan cek kembali transfer kamu dan klaim ulang.
              </div>
            )}

            {(subscription.status === "overdue" || subscription.status === "trial") &&
              isOwner && (
                <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                  <p className="text-sm font-medium">
                    Transfer {formatRupiah(subscription.monthlyAmount)}/bulan ke:
                  </p>
                  {subscription.bankInfo ? (
                    <p className="text-sm text-muted-foreground">
                      {subscription.bankInfo.bankName} —{" "}
                      {subscription.bankInfo.accountNumber} a.n.{" "}
                      {subscription.bankInfo.accountHolder}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Info rekening belum tersedia — hubungi admin Pundi.
                    </p>
                  )}
                  <Input
                    placeholder="Catatan (opsional, mis. transfer BCA a.n. Budi)"
                    value={claimNote}
                    onChange={(e) => setClaimNote(e.target.value)}
                  />
                  <Button onClick={claimPayment}>Saya sudah transfer</Button>
                </div>
              )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Profil Perusahaan</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isOwner}
              placeholder="Nama perusahaan"
            />
            <Input
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              disabled={!isOwner}
              placeholder="Nama badan usaha resmi"
            />
            {isOwner && <Button type="submit">Simpan</Button>}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Anggota Tim</CardTitle>
          <CardDescription>
            Kelola siapa saja yang bisa mengakses perusahaan ini
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.map((m) => (
            <div key={m._id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{m.name}</p>
                <p className="text-xs text-muted-foreground truncate">{m.email}</p>
              </div>
              {isOwner ? (
                <div className="flex items-center gap-2 shrink-0">
                  <Select value={m.role} onValueChange={(v) => changeRole(m._id, v)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="accountant">Akuntan</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                  <ConfirmDeleteButton
                    title={`Hapus ${m.name} dari perusahaan?`}
                    description="Anggota ini tidak akan bisa lagi mengakses data perusahaan."
                    onConfirm={() => removeMember(m._id)}
                  />
                </div>
              ) : (
                <span className="text-sm text-muted-foreground shrink-0">
                  {ROLE_LABELS[m.role]}
                </span>
              )}
            </div>
          ))}

          {isOwner && (
            <form onSubmit={invite} className="flex items-center gap-2 pt-3 border-t">
              <IconChip icon={UserPlus} color="blue" size="sm" />
              <Input
                placeholder="Email anggota (harus sudah punya akun Pundi)"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1"
              />
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "staff" | "accountant")}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="accountant">Akuntan</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit">Undang</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

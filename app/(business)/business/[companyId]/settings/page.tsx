"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { UserPlus, Receipt, Repeat, Pause, Play } from "lucide-react";
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
import { CurrencyInput } from "@/components/currency-input";
import { formatRupiah } from "@/lib/format";

const MONTH_LABEL = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

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

type Account = { _id: string; code: string; name: string; type: string };

type RecurringBusinessExpense = {
  _id: string;
  name: string;
  amount: number;
  accountId: string;
  cashAccountId: string;
  dayOfMonth: number;
  frequency: "monthly" | "yearly";
  month?: number;
  active: boolean;
};

export default function BusinessSettingsPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const [company, setCompany] = useState<Company | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringBusinessExpense[]>([]);
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"staff" | "accountant">("staff");
  const [claimNote, setClaimNote] = useState("");
  const [recName, setRecName] = useState("");
  const [recAmount, setRecAmount] = useState(0);
  const [recAccountId, setRecAccountId] = useState("");
  const [recCashAccountId, setRecCashAccountId] = useState("");
  const [recDay, setRecDay] = useState("1");
  const [recFrequency, setRecFrequency] = useState<"monthly" | "yearly">("monthly");
  const [recMonth, setRecMonth] = useState("1");

  async function loadAll() {
    const [companyRes, membersRes, subscriptionRes, accountsRes, recurringRes] =
      await Promise.all([
        fetch(`/api/business/companies/${companyId}`),
        fetch(`/api/business/companies/${companyId}/members`),
        fetch(`/api/business/companies/${companyId}/subscription`),
        fetch(`/api/business/companies/${companyId}/accounts?activeOnly=true`),
        fetch(`/api/business/companies/${companyId}/recurring-expenses`),
      ]);
    if (companyRes.ok) {
      const c = await companyRes.json();
      setCompany(c);
      setName(c.name);
      setLegalName(c.legalName ?? "");
    }
    if (membersRes.ok) setMembers(await membersRes.json());
    if (subscriptionRes.ok) setSubscription(await subscriptionRes.json());
    if (accountsRes.ok) setAccounts(await accountsRes.json());
    if (recurringRes.ok) setRecurringExpenses(await recurringRes.json());
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
  const canManage = company?.role === "owner" || company?.role === "accountant";

  async function addRecurring(e: React.FormEvent) {
    e.preventDefault();
    if (!recName.trim() || recAmount <= 0 || !recAccountId || !recCashAccountId) {
      toast.error("Lengkapi nama, nominal, akun beban, dan akun sumber dana");
      return;
    }
    const res = await fetch(`/api/business/companies/${companyId}/recurring-expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: recName.trim(),
        amount: recAmount,
        accountId: recAccountId,
        cashAccountId: recCashAccountId,
        dayOfMonth: Number(recDay),
        frequency: recFrequency,
        month: recFrequency === "yearly" ? Number(recMonth) : undefined,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Gagal menambah beban berulang");
      return;
    }
    toast.success(`"${recName.trim()}" ditambahkan`);
    setRecName("");
    setRecAmount(0);
    setRecAccountId("");
    setRecCashAccountId("");
    setRecDay("1");
    setRecFrequency("monthly");
    setRecMonth("1");
    loadAll();
  }

  async function toggleRecurringActive(item: RecurringBusinessExpense) {
    const res = await fetch(
      `/api/business/companies/${companyId}/recurring-expenses/${item._id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !item.active }),
      }
    );
    if (!res.ok) {
      toast.error("Gagal mengubah status");
      return;
    }
    loadAll();
  }

  async function deleteRecurring(id: string) {
    const res = await fetch(
      `/api/business/companies/${companyId}/recurring-expenses/${id}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      toast.error("Gagal menghapus");
      return;
    }
    toast.success("Beban berulang dihapus");
    loadAll();
  }

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

  const expenseAccounts = accounts.filter((a) => a.type === "expense");
  const cashAccounts = accounts.filter(
    (a) =>
      a.type === "asset" &&
      ["kas", "bank"].some((n) => a.name.toLowerCase().includes(n))
  );
  const accountName = (id: string) => accounts.find((a) => a._id === id)?.name ?? "?";

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

      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <IconChip icon={Repeat} color="amber" />
          <div>
            <CardTitle>Beban Berulang</CardTitle>
            <CardDescription>
              Tagihan bulanan/tahunan (mis. sewa, domain, langganan) — kamu
              dapat notifikasi buat konfirmasi tiap tanggal jatuh tempo,
              tidak otomatis tercatat begitu saja
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {recurringExpenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada beban berulang
            </p>
          ) : (
            <ul className="space-y-2">
              {recurringExpenses.map((item) => (
                <li
                  key={item._id}
                  className={`flex items-start gap-3 rounded-xl border bg-muted/30 px-4 py-3 ${
                    item.active ? "" : "opacity-60"
                  }`}
                >
                  <IconChip icon={Repeat} color="amber" size="sm" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium truncate">{item.name}</span>
                      {item.frequency === "yearly" && (
                        <Badge variant="outline" className="text-[11px]">
                          Tahunan
                        </Badge>
                      )}
                      {!item.active && (
                        <Badge variant="outline" className="text-[11px]">
                          Nonaktif
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatRupiah(item.amount)} · {accountName(item.accountId)} dari{" "}
                      {accountName(item.cashAccountId)} ·{" "}
                      {item.frequency === "yearly"
                        ? `tiap ${MONTH_LABEL[(item.month ?? 1) - 1]}, tgl ${item.dayOfMonth}`
                        : `tiap tgl ${item.dayOfMonth}`}
                    </p>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-foreground"
                        onClick={() => toggleRecurringActive(item)}
                      >
                        {item.active ? (
                          <Pause className="size-4" />
                        ) : (
                          <Play className="size-4" />
                        )}
                      </Button>
                      <ConfirmDeleteButton
                        title={`Hapus "${item.name}"?`}
                        description="Jadwal pengingat ini akan dihapus. Jurnal yang sudah pernah dicatat dari item ini sebelumnya tidak ikut terhapus."
                        onConfirm={() => deleteRecurring(item._id)}
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {canManage && (
            <form onSubmit={addRecurring} className="space-y-2 border-t pt-4">
              <Input
                placeholder="Nama (mis. Virtual Office)"
                value={recName}
                onChange={(e) => setRecName(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <Select value={recAccountId} onValueChange={setRecAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Akun beban" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseAccounts.map((a) => (
                      <SelectItem key={a._id} value={a._id}>
                        {a.code} · {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={recCashAccountId} onValueChange={setRecCashAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Akun Kas/Bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {cashAccounts.map((a) => (
                      <SelectItem key={a._id} value={a._id}>
                        {a.code} · {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <CurrencyInput value={recAmount} onValueChange={setRecAmount} />
                <Select value={recDay} onValueChange={setRecDay}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        Tgl {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={recFrequency}
                  onValueChange={(v) => setRecFrequency(v as "monthly" | "yearly")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Bulanan</SelectItem>
                    <SelectItem value="yearly">Tahunan</SelectItem>
                  </SelectContent>
                </Select>
                {recFrequency === "yearly" && (
                  <Select value={recMonth} onValueChange={setRecMonth}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_LABEL.map((label, i) => (
                        <SelectItem key={i} value={String(i + 1)}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <Button type="submit">Tambah Beban Berulang</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IconChip } from "@/components/icon-chip";
import { UserPlus, LayoutDashboard } from "lucide-react";
import Link from "next/link";

type UserSummary = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  summary: {
    month: string;
    totalIncome: number;
    totalBersih: number;
    isBudgetSaved: boolean;
    monthSummary: {
      makanActual: number;
      makanBudget: number;
      lainLainActual: number;
      lainLainBudget: number;
      totalActual: number;
      totalTarget: number;
      melenceng: boolean;
    };
  };
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function loadUsers() {
    const res = await fetch("/api/admin/users");
    setUsers(await res.json());
  }

  useEffect(() => {
    (async () => {
      await loadUsers();
      setLoading(false);
    })();
  }, []);

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    setCreating(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Gagal membuat user");
      toast.error(data.error ?? "Gagal membuat user");
      return;
    }

    toast.success(`Anggota "${name}" dibuat`);
    setName("");
    setEmail("");
    setPassword("");
    setRole("member");
    loadUsers();
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan budget & pengeluaran semua anggota keluarga
        </p>
      </div>

      <Accordion type="single" collapsible className="space-y-3">
        {users.map((u) => {
          const spentPct = u.summary.monthSummary.totalTarget
            ? Math.min(
                100,
                (u.summary.monthSummary.totalActual /
                  u.summary.monthSummary.totalTarget) *
                  100
              )
            : 0;
          return (
            <Card key={u.id} className="py-0 overflow-hidden">
              <AccordionItem value={u.id} className="border-0">
                <AccordionTrigger className="hover:no-underline rounded-none px-5 py-4 hover:bg-muted/40">
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar className="size-10">
                      <AvatarFallback className="bg-linear-to-br from-emerald-500 to-teal-600 text-white text-xs font-medium">
                        {initials(u.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-sm font-medium truncate">
                        {u.name}{" "}
                        <span className="text-muted-foreground font-normal">
                          ({u.role})
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {u.email}
                      </p>
                      <div className="mt-1.5 h-1.5 w-full max-w-40 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            u.summary.monthSummary.melenceng
                              ? "bg-destructive"
                              : "bg-linear-to-r from-emerald-500 to-teal-600"
                          }`}
                          style={{ width: `${spentPct}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right mr-2 shrink-0">
                      <p className="text-sm font-semibold">
                        {formatRupiah(u.summary.totalBersih)}
                      </p>
                      <Badge
                        variant={
                          u.summary.monthSummary.melenceng
                            ? "destructive"
                            : "default"
                        }
                        className={
                          u.summary.monthSummary.melenceng
                            ? "text-[10px]"
                            : "text-[10px] bg-emerald-600 hover:bg-emerald-600"
                        }
                      >
                        {u.summary.monthSummary.melenceng
                          ? "Melenceng"
                          : "Sesuai target"}
                      </Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-5">
                  <div className="space-y-2 text-sm pl-12 pb-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Total Income
                      </span>
                      <span>{formatRupiah(u.summary.totalIncome)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Makan (bulan ini)
                      </span>
                      <span>
                        {formatRupiah(u.summary.monthSummary.makanActual)} /{" "}
                        {formatRupiah(u.summary.monthSummary.makanBudget)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Lain-lain (bulan ini)
                      </span>
                      <span>
                        {formatRupiah(u.summary.monthSummary.lainLainActual)}{" "}
                        / {formatRupiah(u.summary.monthSummary.lainLainBudget)}
                      </span>
                    </div>
                    <div className="flex justify-between font-medium pt-1 border-t">
                      <span>Total Pengeluaran</span>
                      <span>
                        {formatRupiah(u.summary.monthSummary.totalActual)} /{" "}
                        {formatRupiah(u.summary.monthSummary.totalTarget)}
                      </span>
                    </div>
                    {!u.summary.isBudgetSaved && (
                      <p className="text-amber-600 text-xs">
                        Budget bulan ini belum disimpan oleh user.
                      </p>
                    )}
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                    >
                      <Link href={`/dashboard?userId=${u.id}`}>
                        <LayoutDashboard className="size-3.5" />
                        Lihat Dashboard Lengkap
                      </Link>
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Card>
          );
        })}
      </Accordion>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <IconChip icon={UserPlus} color="emerald" />
          <div>
            <CardTitle>Tambah Anggota Baru</CardTitle>
            <CardDescription>
              Buat akun untuk anggota keluarga lain
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUser} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="name">Nama</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <PasswordInput
                id="admin-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as "admin" | "member")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              disabled={creating}
              size="lg"
              className="w-full bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-md shadow-emerald-500/25"
            >
              {creating ? "Membuat..." : "Buat Anggota"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

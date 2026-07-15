"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  BookOpen,
  Scale,
  Waves,
  HeartPulse,
  Settings,
  HelpCircle,
  MessageCircle,
  ArrowLeft,
  LogOut,
  ChevronRight,
  Plus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { IconChip } from "@/components/icon-chip";
import { WHATSAPP_URL } from "@/lib/contact";

type Company = { _id: string; name: string; role: "owner" | "accountant" | "staff" };

type MenuItem = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  external?: string;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Halaman ini SENGAJA cuma tujuan tab "Lainnya" di bottom nav mobile
// (lihat components/business/business-shell.tsx) — di desktop, semua
// menu di bawah ini sudah ada langsung di sidebar. Pola sama persis
// app/(app)/more/page.tsx punya personal Pundi.
export default function BusinessMorePage() {
  const { companyId } = useParams<{ companyId: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;

  const [companies, setCompanies] = useState<Company[] | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/business/companies");
      if (res.ok) setCompanies(await res.json());
    })();
  }, []);

  function switchCompany(nextId: string) {
    localStorage.setItem("pundi-business-last-company", nextId);
    router.push(`/business/${nextId}/dashboard`);
  }

  const menuItems: MenuItem[] = [
    { label: "Akun", icon: BookOpen, href: `/business/${companyId}/accounts` },
    { label: "Neraca", icon: Scale, href: `/business/${companyId}/reports/balance-sheet` },
    { label: "Arus Kas", icon: Waves, href: `/business/${companyId}/reports/cash-flow` },
    { label: "Rasio Keuangan", icon: HeartPulse, href: `/business/${companyId}/reports/financial-ratios` },
    { label: "Pengaturan", icon: Settings, href: `/business/${companyId}/settings` },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Lainnya</h1>

      <Card>
        <CardContent className="flex items-center gap-3">
          <Avatar className="size-12">
            <AvatarFallback className="bg-slate-800 text-white font-medium">
              {initials(user?.name ?? "")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold truncate">{user?.name}</p>
            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
          </div>
        </CardContent>
      </Card>

      {companies && companies.length > 0 && (
        <Card>
          <CardContent className="space-y-1 divide-y">
            {companies.map((c) => (
              <button
                key={c._id}
                onClick={() => switchCompany(c._id)}
                className={`flex w-full items-center justify-between gap-3 py-3 text-left first:pt-0 last:pb-0 ${
                  c._id === companyId ? "font-semibold" : "text-muted-foreground"
                }`}
              >
                <span className="truncate">{c.name}</span>
                {c._id === companyId && (
                  <span className="text-xs text-slate-600">Aktif</span>
                )}
              </button>
            ))}
            <Link
              href="/business/onboarding"
              className="flex items-center gap-3 py-3 text-sm font-medium text-slate-700 first:pt-0"
            >
              <Plus className="size-4" />
              Perusahaan Baru
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {menuItems.map((item) => (
            <Link
              key={item.label}
              href={item.href ?? "#"}
              className="flex items-center gap-3 px-4 py-3.5 border-b last:border-b-0"
            >
              <IconChip icon={item.icon} color="violet" size="sm" />
              <span className="flex-1 font-medium">{item.label}</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Link
            href={`/business/${companyId}/panduan`}
            className="flex items-center gap-3 px-4 py-3.5 border-b"
          >
            <IconChip icon={HelpCircle} color="blue" size="sm" />
            <span className="flex-1 font-medium">Panduan</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3.5"
          >
            <IconChip icon={MessageCircle} color="emerald" size="sm" />
            <span className="flex-1 font-medium">Hubungi Kami</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3.5 border-b">
            <IconChip icon={ArrowLeft} color="amber" size="sm" />
            <span className="flex-1 font-medium">Kembali ke Pundi</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-destructive"
          >
            <IconChip icon={LogOut} color="rose" size="sm" />
            <span className="flex-1 font-medium">Keluar</span>
          </button>
        </CardContent>
      </Card>
    </div>
  );
}

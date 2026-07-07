"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import {
  CreditCard,
  BarChart3,
  Settings,
  Users,
  UserPlus,
  HelpCircle,
  MessageCircle,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { IconChip } from "@/components/icon-chip";
import { WHATSAPP_URL } from "@/lib/contact";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type MenuItem = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  external?: string;
};

// Halaman ini SENGAJA cuma tujuan tab "More" di bottom nav mobile (lihat
// components/app-shell.tsx) — di desktop, semua menu di bawah ini sudah
// ada langsung di sidebar, jadi tidak ada link masuk ke sini dari sana.
// Sebelumnya menu-menu ini muncul sebagai DropdownMenu kecil yang gampang
// kepencet salah di mobile — dipindah jadi halaman penuh (pola umum
// "More"/"Profile" tab di app mobile pada umumnya) biar target tap lebih
// besar dan lebih gampang dibaca.
export default function MorePage() {
  const { data: session } = useSession();
  const user = session?.user;

  const menuSections: MenuItem[][] = [
    [
      { label: "Teman", icon: UserPlus, href: "/friends" },
      { label: "Cicilan", icon: CreditCard, href: "/installments" },
      { label: "Reports", icon: BarChart3, href: "/reports" },
      { label: "Settings", icon: Settings, href: "/settings" },
      ...(user?.role === "admin"
        ? [{ label: "Admin", icon: Users, href: "/admin" }]
        : []),
    ],
    [
      { label: "Panduan", icon: HelpCircle, href: "/panduan" },
      { label: "Hubungi Kami", icon: MessageCircle, external: WHATSAPP_URL },
    ],
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Lainnya</h1>

      <Card>
        <CardContent className="flex items-center gap-3">
          <Avatar className="size-12">
            <AvatarFallback className="bg-linear-to-br from-emerald-500 to-teal-600 text-white font-medium">
              {initials(user?.name ?? "")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold truncate">{user?.name}</p>
            <p className="text-sm text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
        </CardContent>
      </Card>

      {menuSections.map((items, i) => (
        <Card key={i} className="overflow-hidden py-0">
          <CardContent className="divide-y p-0">
            {items.map((item) => {
              const content = (
                <>
                  <IconChip icon={item.icon} size="sm" />
                  <span className="flex-1 text-sm font-medium">
                    {item.label}
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </>
              );
              return item.href ? (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50"
                >
                  {content}
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={item.external}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50"
                >
                  {content}
                </a>
              );
            })}
          </CardContent>
        </Card>
      ))}

      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5"
      >
        <LogOut className="size-4" />
        Keluar
      </button>
    </div>
  );
}

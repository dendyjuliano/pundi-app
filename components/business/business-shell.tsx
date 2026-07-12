"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useParams, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Briefcase,
  LayoutDashboard,
  BookOpen,
  PlusCircle,
  ScrollText,
  FileBarChart,
  Settings,
  ChevronDown,
  ArrowLeft,
  LogOut,
  Plus,
  HelpCircle,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Company = { _id: string; name: string; role: "owner" | "accountant" | "staff" };

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

function navItems(companyId: string): NavItem[] {
  return [
    { href: `/business/${companyId}/dashboard`, label: "Dashboard", icon: LayoutDashboard },
    { href: `/business/${companyId}/accounts`, label: "Akun", icon: BookOpen },
    { href: `/business/${companyId}/transactions/new`, label: "Transaksi Baru", icon: PlusCircle },
    { href: `/business/${companyId}/journal-entries`, label: "Jurnal", icon: ScrollText },
    { href: `/business/${companyId}/reports/income-statement`, label: "Laporan Laba Rugi", icon: FileBarChart },
    { href: `/business/${companyId}/settings`, label: "Pengaturan", icon: Settings },
  ];
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function BusinessShell({
  user,
  children,
}: {
  user: { name: string; email: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams<{ companyId?: string }>();
  const companyId = params?.companyId;

  const [companies, setCompanies] = useState<Company[] | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/business/companies");
      if (res.ok) setCompanies(await res.json());
    })();
  }, []);

  function switchCompany(nextId: string) {
    // Otorisasi tetap di-re-derive server-side dari companyId di URL tiap
    // request — ini cuma navigasi UX, bukan sumber kebenaran akses.
    localStorage.setItem("pundi-business-last-company", nextId);
    router.push(`/business/${nextId}/dashboard`);
  }

  const currentCompany = companies?.find((c) => c._id === companyId);
  const items = companyId ? navItems(companyId) : [];

  return (
    <div className="min-h-screen bg-muted/30">
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r bg-sidebar">
        <div className="flex items-center gap-2.5 px-5 h-16 border-b">
          <div className="flex size-8 items-center justify-center rounded-xl bg-linear-to-br from-slate-700 to-slate-900 shadow-sm">
            <Briefcase className="size-4 text-white" />
          </div>
          <span className="font-semibold text-lg">Pundi Business</span>
        </div>

        {companies && companies.length > 0 && (
          <div className="px-3 pt-3">
            <DropdownMenu>
              <DropdownMenuTrigger className="w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-sidebar-accent">
                <span className="truncate">
                  {currentCompany?.name ?? "Pilih Perusahaan"}
                </span>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {companies.map((c) => (
                  <DropdownMenuItem key={c._id} onClick={() => switchCompany(c._id)}>
                    {c.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/business/onboarding">
                    <Plus className="size-4" />
                    Perusahaan Baru
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <nav className="flex-1 px-3 py-4 space-y-1">
          {items.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t space-y-1">
          {companyId && (
            <Link
              href={`/business/${companyId}/panduan`}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <HelpCircle className="size-4" />
              Panduan
            </Link>
          )}
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <ArrowLeft className="size-4" />
            Kembali ke Pundi
          </Link>
        </div>

        <div className="p-3 border-t">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full flex items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-sidebar-accent">
              <Avatar className="size-8">
                <AvatarFallback className="bg-slate-800 text-white text-xs font-medium">
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="size-4" />
                Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Top bar mobile — desktop-first buat MVP, nav lengkap via dropdown */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-4 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-linear-to-br from-slate-700 to-slate-900">
            <Briefcase className="size-3.5 text-white" />
          </div>
          <span className="font-semibold">Pundi Business</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Avatar className="size-8">
              <AvatarFallback className="bg-slate-800 text-white text-xs font-medium">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <DropdownMenuItem key={item.href} asChild>
                  <Link href={item.href}>
                    <Icon className="size-4" />
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            {companyId && (
              <DropdownMenuItem asChild>
                <Link href={`/business/${companyId}/panduan`}>
                  <HelpCircle className="size-4" />
                  Panduan
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link href="/dashboard">
                <ArrowLeft className="size-4" />
                Kembali ke Pundi
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="size-4" />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <main className="md:pl-64">
        <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>
    </div>
  );
}

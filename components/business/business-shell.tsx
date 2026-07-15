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
  Scale,
  Waves,
  Settings,
  ChevronDown,
  ArrowLeft,
  LogOut,
  Plus,
  HelpCircle,
  MoreHorizontal,
  MessageCircle,
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
import { WHATSAPP_URL } from "@/lib/contact";
import { setPundiMode } from "@/lib/pundiMode";

type Company = { _id: string; name: string; role: "owner" | "accountant" | "staff" };

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };
type NavGroup = { label: string | null; items: NavItem[] };

// Grouped buat sidebar desktop — pola sama persis NAV_GROUPS di
// components/app-shell.tsx (personal), biar jelas sekilas mana yang
// buat input harian, mana laporan, mana konfigurasi. Mobile bottom tab
// bar tetap flat (lihat MOBILE_TABS di bawah) — tidak ada ruang buat
// section header di sana.
function navGroups(companyId: string): NavGroup[] {
  return [
    {
      label: null,
      items: [
        { href: `/business/${companyId}/dashboard`, label: "Dashboard", icon: LayoutDashboard },
      ],
    },
    {
      label: "Input",
      items: [
        { href: `/business/${companyId}/transactions/new`, label: "Transaksi Baru", icon: PlusCircle },
        { href: `/business/${companyId}/journal-entries`, label: "Jurnal", icon: ScrollText },
      ],
    },
    {
      label: "Laporan",
      items: [
        { href: `/business/${companyId}/reports/income-statement`, label: "Laporan Laba Rugi", icon: FileBarChart },
        { href: `/business/${companyId}/reports/balance-sheet`, label: "Neraca", icon: Scale },
        { href: `/business/${companyId}/reports/cash-flow`, label: "Arus Kas", icon: Waves },
      ],
    },
    {
      label: "Pengaturan",
      items: [
        { href: `/business/${companyId}/accounts`, label: "Akun", icon: BookOpen },
        { href: `/business/${companyId}/settings`, label: "Pengaturan", icon: Settings },
      ],
    },
  ];
}

// Bottom tab mobile dibatasi 4 tujuan harian + 1 slot "More" — pola sama
// persis components/app-shell.tsx (personal): Akun/Neraca/Pengaturan
// dipindah ke halaman /more karena lebih jarang dicek dibanding
// Dashboard/Transaksi Baru/Jurnal/Laporan Laba Rugi. Label dipersingkat
// jadi 1 kata (beda dari label lengkap di sidebar desktop) — label
// panjang (mis. "Laporan Laba Rugi") kebungkus 2 baris di slot sempit
// ini dan bikin baris ikon jadi tidak sejajar.
const MOBILE_TABS: { suffix: string; label: string }[] = [
  { suffix: "/dashboard", label: "Dashboard" },
  { suffix: "/transactions/new", label: "Catat" },
  { suffix: "/journal-entries", label: "Jurnal" },
  { suffix: "/reports/income-statement", label: "Laba Rugi" },
];

// Rute yang bikin tab "More" nyala aktif — termasuk /more sendiri plus
// setiap halaman yang cuma bisa dijangkau lewat sana di mobile.
const MORE_MENU_SUFFIXES = [
  "/more",
  "/accounts",
  "/reports/balance-sheet",
  "/reports/cash-flow",
  "/settings",
  "/panduan",
];

// Judul header mobile pas lagi di salah satu halaman yang cuma bisa
// dijangkau lewat tab "More" — dipetakan ke suffix path (bukan full path,
// companyId di tengah URL beda-beda) buat nampilin tombol back + judul
// menggantikan logo Pundi Business biasa.
const SECONDARY_PAGE_TITLES: { suffix: string; label: string }[] = [
  { suffix: "/accounts", label: "Akun" },
  { suffix: "/reports/balance-sheet", label: "Neraca" },
  { suffix: "/reports/cash-flow", label: "Arus Kas" },
  { suffix: "/settings", label: "Pengaturan" },
  { suffix: "/panduan", label: "Panduan" },
];

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
    setPundiMode("business");
  }, []);

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
  const groups = companyId ? navGroups(companyId) : [];
  const items = groups.flatMap((g) => g.items);
  const mobileTabItems = MOBILE_TABS.map((tab) => {
    const item = items.find((i) => i.href.endsWith(tab.suffix));
    return item ? { href: item.href, label: tab.label, icon: item.icon } : null;
  }).filter((item): item is NonNullable<typeof item> => item !== null);
  const moreActive = MORE_MENU_SUFFIXES.some((suffix) => pathname.endsWith(suffix));
  const secondaryPageTitle = SECONDARY_PAGE_TITLES.find((s) =>
    pathname.endsWith(s.suffix)
  )?.label;

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

        <nav className="flex-1 px-3 py-4 space-y-4">
          {groups.map((group, i) => (
            <div key={group.label ?? `group-${i}`} className="space-y-1">
              {group.label && (
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => {
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
            </div>
          ))}
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

      {/* Top bar mobile — tombol back + judul pas di halaman yang cuma
          dijangkau lewat tab "More" (pola sama persis components/
          app-shell.tsx personal), logo Pundi Business biasa di halaman
          lain */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-4 border-b bg-background/95 backdrop-blur">
        {secondaryPageTitle && companyId ? (
          <Link
            href={`/business/${companyId}/more`}
            className="-ml-1 flex items-center gap-2 rounded-lg px-1 py-1 text-foreground"
          >
            <ArrowLeft className="size-5" />
            <span className="font-semibold">{secondaryPageTitle}</span>
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-linear-to-br from-slate-700 to-slate-900">
              <Briefcase className="size-3.5 text-white" />
            </div>
            <span className="font-semibold">Pundi Business</span>
          </div>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Avatar className="size-8">
              <AvatarFallback className="bg-slate-800 text-white text-xs font-medium">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </DropdownMenuLabel>
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
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="size-4" />
                Hubungi
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
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

      <main className="md:pl-64 pb-24 md:pb-0">
        <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>

      {/* Bottom tab bar mobile — floating pill, pola & bahasa desain sama
          persis components/app-shell.tsx personal (Fase 46/71) */}
      {companyId && (
        <nav className="md:hidden fixed bottom-3 inset-x-3 z-30 rounded-2xl border bg-background/95 backdrop-blur shadow-lg shadow-black/5">
          <div className="grid grid-cols-5">
            {mobileTabItems.map((item) => {
              const active = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium whitespace-nowrap transition-transform active:scale-95",
                    active ? "text-slate-900 dark:text-white" : "text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "flex items-center justify-center rounded-full size-8 transition-colors",
                      active && "bg-linear-to-br from-slate-700 to-slate-900 text-white shadow-sm"
                    )}
                  >
                    <Icon className="size-4.5" />
                  </span>
                  {item.label}
                </Link>
              );
            })}
            <Link
              href={`/business/${companyId}/more`}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium whitespace-nowrap transition-transform active:scale-95",
                moreActive ? "text-slate-900 dark:text-white" : "text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "flex items-center justify-center rounded-full size-8 transition-colors",
                  moreActive && "bg-linear-to-br from-slate-700 to-slate-900 text-white shadow-sm"
                )}
              >
                <MoreHorizontal className="size-4.5" />
              </span>
              Lainnya
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
}

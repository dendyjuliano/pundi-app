"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  BarChart3,
  Settings,
  Users,
  LogOut,
  PiggyBank,
  HelpCircle,
  MessageCircle,
  Target,
  CreditCard,
  MoreHorizontal,
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

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
};

type NavGroup = {
  label: string | null;
  items: NavItem[];
};

// Grouped for the desktop sidebar so it's clear at a glance which items are
// for daily input, which are reports, and which are setup/configuration.
// Mobile bottom tab bar stays flat (no room for section headers there).
const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Input",
    items: [
      { href: "/expenses", label: "Pengeluaran", icon: Receipt },
      { href: "/budget", label: "Budget", icon: Wallet },
      { href: "/target", label: "Target", icon: Target },
      { href: "/installments", label: "Cicilan", icon: CreditCard },
    ],
  },
  {
    label: "Laporan",
    items: [{ href: "/reports", label: "Reports", icon: BarChart3 }],
  },
  {
    label: "Pengaturan",
    items: [
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/admin", label: "Admin", icon: Users, adminOnly: true },
    ],
  },
];

const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

// Bottom tab bar on mobile is limited to 4 daily-input destinations, plus a
// 5th "More" slot (see MORE_MENU_ROUTES/MORE_MENU_ITEMS below) — 6 flat
// icons was too cramped, and Reports/Settings are checked less often than
// Dashboard/Pengeluaran/Budget/Target.
const MOBILE_NAV_ITEMS = NAV_ITEMS.filter((item) =>
  ["/dashboard", "/expenses", "/budget", "/target"].includes(item.href),
);

// Routes that should light up the "More" tab as active when visited.
const MORE_MENU_ROUTES = [
  "/installments",
  "/reports",
  "/settings",
  "/admin",
  "/panduan",
];

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AppShell({
  user,
  children,
}: {
  user: { name: string; email: string; role: "admin" | "member" };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const visibleNavGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => !item.adminOnly || user.role === "admin",
    ),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r bg-sidebar">
        <div className="flex items-center gap-2.5 px-5 h-16 border-b">
          <div className="flex size-8 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 shadow-sm shadow-emerald-500/30">
            <PiggyBank className="size-4 text-white" />
          </div>
          <span className="font-semibold text-lg">Pundi</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-4">
          {visibleNavGroups.map((group, i) => (
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
                        ? "bg-linear-to-r from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/25"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
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
        <div className="px-3 py-3 border-t space-y-1">
          <Link
            href="/panduan"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              pathname.startsWith("/panduan")
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <HelpCircle className="size-4" />
            Panduan
          </Link>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <MessageCircle className="size-4" />
            Hubungi
          </a>
        </div>
        <div className="p-3 border-t">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full flex items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-sidebar-accent">
              <Avatar className="size-8">
                <AvatarFallback className="bg-linear-to-br from-emerald-500 to-teal-600 text-white text-xs font-medium">
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.role}
                </p>
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

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-4 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-linear-to-br from-emerald-500 to-teal-600">
            <PiggyBank className="size-3.5 text-white" />
          </div>
          <span className="font-semibold">Pundi</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Avatar className="size-8">
              <AvatarFallback className="bg-linear-to-br from-emerald-500 to-teal-600 text-white text-xs font-medium">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </DropdownMenuLabel>
            {user.role === "admin" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin">
                    <Users className="size-4" />
                    Admin
                  </Link>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/panduan">
                <HelpCircle className="size-4" />
                Panduan
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="size-4" />
                Hubungi
              </a>
            </DropdownMenuItem>
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
      </header>

      {/* Main content */}
      <main className="md:pl-64 pb-24 md:pb-0">
        <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>

      {/* Mobile bottom tab bar — floating pill, sama bahasa desain sama
          navbar landing page (Fase 46) */}
      <nav className="md:hidden fixed bottom-3 inset-x-3 z-30 rounded-2xl border bg-background/95 backdrop-blur shadow-lg shadow-black/5">
        <div className="grid grid-cols-5">
          {MOBILE_NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-transform active:scale-95",
                  active ? "text-emerald-600" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex items-center justify-center rounded-full size-8 transition-colors",
                    active &&
                      "bg-linear-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/30",
                  )}
                >
                  <Icon className="size-4.5" />
                </span>
                {item.label}
              </Link>
            );
          })}

          {(() => {
            const moreActive = MORE_MENU_ROUTES.some((r) =>
              pathname.startsWith(r),
            );
            return (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-transform active:scale-95",
                    moreActive ? "text-emerald-600" : "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex items-center justify-center rounded-full size-8 transition-colors",
                      moreActive &&
                        "bg-linear-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/30",
                    )}
                  >
                    <MoreHorizontal className="size-4.5" />
                  </span>
                  More
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="top" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/installments">
                      <CreditCard className="size-4" />
                      Cicilan
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/reports">
                      <BarChart3 className="size-4" />
                      Reports
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings className="size-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  {user.role === "admin" && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin">
                        <Users className="size-4" />
                        Admin
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/panduan">
                      <HelpCircle className="size-4" />
                      Panduan
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a
                      href={WHATSAPP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="size-4" />
                      Hubungi
                    </a>
                  </DropdownMenuItem>
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
            );
          })()}
        </div>
      </nav>
    </div>
  );
}

"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Briefcase,
  BookOpen,
  ScrollText,
  FileBarChart,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";

const BENEFITS = [
  {
    icon: BookOpen,
    title: "Chart of Accounts otomatis",
    description:
      "18 akun standar (Kas, Bank, Pendapatan, Beban, dll) langsung dibuat begitu perusahaan pertamamu jadi.",
  },
  {
    icon: ScrollText,
    title: "Jurnal Umum tanpa istilah akuntansi",
    description:
      "Pilih jenis transaksi harian, sistem yang hitung debit/kredit-nya secara otomatis.",
  },
  {
    icon: FileBarChart,
    title: "Laporan Laba Rugi instan",
    description:
      "Laba Kotor sampai Laba Bersih terhitung otomatis dari transaksi yang sudah dicatat — tanpa sewa akuntan.",
  },
  {
    icon: Users,
    title: "Undang tim",
    description:
      "Tambah akuntan atau staff dengan akses berbeda — Owner, Akuntan, Staff, sesuai tanggung jawabnya.",
  },
];

export default function RegisterBusinessPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Gagal mendaftar");
      setPending(false);
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setPending(false);

    if (result?.error) {
      setError("Akun berhasil dibuat, tapi gagal login otomatis. Coba login manual.");
      return;
    }

    // Beda dari /register (personal) yang redirect ke /onboarding — di sini
    // langsung ke pembuatan company, bukan setup budget personal.
    router.push("/business/onboarding");
    router.refresh();
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left panel — branding & benefits (desktop only), slate theme
          biar kebedaannya dari signup personal (emerald) langsung kerasa */}
      <div className="relative hidden lg:flex flex-col justify-center gap-10 overflow-hidden bg-linear-to-br from-slate-800 via-slate-900 to-black px-14 py-16 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute -top-24 -left-20 size-72 rounded-full bg-slate-600/20 blur-3xl" />
          <div className="absolute top-1/3 -right-24 size-80 rounded-full bg-slate-500/15 blur-3xl" />
        </div>
        <div className="relative space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-white/10">
              <Briefcase className="size-5" />
            </div>
            <span className="text-lg font-semibold">Pundi Business</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight max-w-md">
            Laporan keuangan usaha, tanpa sewa akuntan
          </h1>
          <p className="text-sm text-slate-400 max-w-sm">
            Catat transaksi harian, laporan keuangannya terhitung otomatis —
            trial 14 hari gratis, lanjut Rp99.000/bulan.
          </p>
        </div>

        <ul className="relative space-y-5 max-w-md">
          {BENEFITS.map((b) => (
            <li key={b.title} className="flex items-start gap-3.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <b.icon className="size-4.5" />
              </div>
              <div>
                <p className="text-sm font-semibold">{b.title}</p>
                <p className="text-sm text-slate-400 mt-0.5">
                  {b.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Right panel — form */}
      <div className="relative flex items-center justify-center px-4 py-12 overflow-hidden">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center gap-3 text-center lg:hidden">
            <div className="flex size-14 items-center justify-center rounded-3xl bg-linear-to-br from-slate-700 to-slate-900 shadow-lg shadow-slate-900/30">
              <Briefcase className="size-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Pundi Business</h1>
          </div>

          <div className="space-y-1.5 text-center lg:text-left">
            <h2 className="text-2xl font-bold tracking-tight">Daftar Akun Bisnis</h2>
            <p className="text-sm text-muted-foreground">
              Setelah daftar, kamu langsung diarahkan buat bikin perusahaan
              pertamamu — trial 14 hari, tanpa kartu kredit.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              type="submit"
              disabled={pending}
              size="lg"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white"
            >
              {pending ? "Memproses..." : "Daftar & Buat Perusahaan"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Sudah punya akun?{" "}
            <Link href="/login" className="font-medium text-foreground underline">
              Masuk di sini
            </Link>
          </p>
          <p className="text-center text-sm text-muted-foreground">
            Bukan buat bisnis?{" "}
            <Link href="/register" className="font-medium text-foreground underline">
              Daftar akun personal
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

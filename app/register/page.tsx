"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PiggyBank,
  Wallet,
  Receipt,
  BarChart3,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GradientBlobs } from "@/components/gradient-blobs";

const BENEFITS = [
  {
    icon: Wallet,
    title: "Atur alokasi tiap bulan",
    description:
      "Bagi penghasilan ke pos-pos tetap (transfer, sewa, investasi) dan jatah makan harian secara otomatis.",
  },
  {
    icon: Receipt,
    title: "Catat pengeluaran harian",
    description:
      "Input cepat tiap transaksi, langsung dibandingkan dengan target harian, mingguan, dan bulanan.",
  },
  {
    icon: BarChart3,
    title: "Laporan & grafik otomatis",
    description:
      "Lihat tren pengeluaran, alokasi penghasilan, dan pola makan sepanjang tahun tanpa hitung manual.",
  },
  {
    icon: Users,
    title: "Tambah anggota lain",
    description:
      "Undang pasangan atau anggota lain untuk kelola datanya masing-masing — cuma kamu yang bisa lihat semuanya.",
  },
];

export default function RegisterPage() {
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

    router.push("/onboarding");
    router.refresh();
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left panel — branding & benefits (desktop only) */}
      <div className="relative hidden lg:flex flex-col justify-center gap-10 overflow-hidden bg-linear-to-br from-emerald-500 via-emerald-600 to-teal-700 px-14 py-16 text-white">
        <GradientBlobs className="opacity-40" />
        <div className="relative space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-white/15">
              <PiggyBank className="size-5" />
            </div>
            <span className="text-lg font-semibold">Pundi</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight max-w-md">
            Kelola keuangan lebih rapi, mulai hari ini
          </h1>
          <p className="text-sm text-emerald-50/85 max-w-sm">
            Satu akun untuk memantau pemasukan, alokasi, dan pengeluaran —
            biar tidak perlu lagi rekap manual tiap bulan.
          </p>
        </div>

        <ul className="relative space-y-5 max-w-md">
          {BENEFITS.map((b) => (
            <li key={b.title} className="flex items-start gap-3.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <b.icon className="size-4.5" />
              </div>
              <div>
                <p className="text-sm font-semibold">{b.title}</p>
                <p className="text-sm text-emerald-50/80 mt-0.5">
                  {b.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Right panel — form */}
      <div className="relative flex items-center justify-center px-4 py-12 overflow-hidden">
        <div className="lg:hidden absolute inset-0 -z-10">
          <GradientBlobs />
        </div>
        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center gap-3 text-center lg:hidden">
            <div className="flex size-14 items-center justify-center rounded-3xl bg-linear-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30">
              <PiggyBank className="size-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Pundi</h1>
          </div>

          <div className="space-y-1.5 text-center lg:text-left">
            <h2 className="text-2xl font-bold tracking-tight">Daftar Akun</h2>
            <p className="text-sm text-muted-foreground">
              Kamu jadi admin dari akunmu sendiri — bisa tambah anggota lain
              nanti, dan cuma kamu yang bisa lihat semua datanya.
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
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={pending} size="lg" className="w-full">
              {pending ? "Memproses..." : "Daftar"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Sudah punya akun?{" "}
            <Link href="/login" className="font-medium text-foreground underline">
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PiggyBank, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { GradientBlobs } from "@/components/gradient-blobs";
import { RadialProgress } from "@/components/radial-progress";
import { getPundiMode } from "@/lib/pundiMode";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamCallbackUrl = searchParams.get("callbackUrl");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setPending(false);

    if (result?.error) {
      setError("Email atau password salah");
      return;
    }

    // Kalau bukan gara-gara diusir dari halaman protected (callbackUrl
    // dari query string), arahkan ke mode terakhir yang dipakai user
    // (personal/business) — bukan selalu dashboard personal, biar user
    // yang cuma pakai Business tidak perlu klik "Pundi Business" lagi
    // tiap abis login.
    const callbackUrl =
      searchParamCallbackUrl ||
      (getPundiMode() === "business" ? "/business" : "/dashboard");
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left panel — branding + decorative product preview (desktop only) */}
      <div className="relative hidden lg:flex flex-col justify-center overflow-hidden bg-linear-to-br from-emerald-500 via-emerald-600 to-teal-700 px-14 py-16 text-white">
        <GradientBlobs className="opacity-40" />

        <div className="relative space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-white/15">
              <PiggyBank className="size-5" />
            </div>
            <span className="text-lg font-semibold">Pundi</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight max-w-md">
            Kelola keuangan, bukan drama bulanan
          </h1>
          <p className="text-sm text-emerald-50/85 max-w-sm">
            Masuk untuk lanjut pantau pemasukan, alokasi, dan pengeluaran
            harianmu — semua sudah tercatat rapi, tinggal dilihat.
          </p>
        </div>

        {/* Decorative mock stat card — purely illustrative, not real data */}
        <div className="relative mt-12 rounded-2xl bg-white/10 backdrop-blur-sm ring-1 ring-white/15 p-6 max-w-sm shadow-xl">
          <div className="flex items-center gap-6">
            <div className="flex-1 space-y-4">
              <div>
                <p className="text-xs text-emerald-50/75">Total Bersih Juli</p>
                <p className="mt-1 text-2xl font-bold tracking-tight">
                  Rp 8.420.000
                </p>
              </div>
              <div className="flex gap-5 border-t border-white/15 pt-3">
                <div className="flex items-center gap-1.5">
                  <ArrowDownToLine className="size-3.5 text-emerald-50/75" />
                  <span className="text-xs text-emerald-50/85">
                    Income Rp18jt
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ArrowUpFromLine className="size-3.5 text-emerald-50/75" />
                  <span className="text-xs text-emerald-50/85">
                    Alokasi Rp9,6jt
                  </span>
                </div>
              </div>
            </div>
            <RadialProgress
              value={62}
              size={72}
              strokeWidth={7}
              trackClassName="text-white/20"
              progressClassName="text-white"
            >
              <span className="text-sm font-bold">62%</span>
            </RadialProgress>
          </div>
        </div>
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
            <h2 className="text-2xl font-bold tracking-tight">Masuk</h2>
            <p className="text-sm text-muted-foreground">
              Masukkan email dan password akunmu
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <Button type="submit" disabled={pending} size="lg" className="w-full">
              {pending ? "Memproses..." : "Masuk"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Belum punya akun?{" "}
            <Link href="/register" className="font-medium text-foreground underline">
              Daftar Akun
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

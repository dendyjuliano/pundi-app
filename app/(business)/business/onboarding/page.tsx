"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Briefcase } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconChip } from "@/components/icon-chip";

export default function BusinessOnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [industry, setIndustry] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/business/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        legalName: legalName.trim() || undefined,
        industry: industry.trim() || undefined,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error("Gagal membuat perusahaan");
      return;
    }
    const company = await res.json();
    toast.success(`Perusahaan "${company.name}" dibuat`);
    localStorage.setItem("pundi-business-last-company", company._id);
    router.push(`/business/${company._id}/dashboard`);
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Selamat Datang di Pundi Business</h1>
        <p className="text-sm text-muted-foreground">
          Buat perusahaan pertamamu untuk mulai mencatat transaksi dan
          menghasilkan Laporan Laba Rugi
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <IconChip icon={Briefcase} color="blue" />
          <div>
            <CardTitle>Perusahaan Baru</CardTitle>
            <CardDescription>
              18 akun standar (Kas, Bank, Pendapatan, Beban, dll) akan
              dibuat otomatis — bisa disesuaikan nanti
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              placeholder="Nama perusahaan (mis. Toko Sejahtera)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <Input
              placeholder="Nama badan usaha resmi (opsional)"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
            />
            <Input
              placeholder="Bidang usaha (opsional, mis. Kuliner)"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            />
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Membuat..." : "Buat Perusahaan"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

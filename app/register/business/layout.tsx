import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daftar Akun Bisnis",
  description:
    "Daftar Pundi Business — Chart of Accounts, Jurnal Umum, dan Laporan Laba Rugi otomatis buat UMKM, tanpa sewa akuntan.",
  alternates: { canonical: "/register/business" },
};

export default function RegisterBusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

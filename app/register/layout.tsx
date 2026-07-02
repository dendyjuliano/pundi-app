import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daftar Akun",
  description:
    "Daftar gratis di Pundi — kelola pemasukan, alokasi, dan pengeluaran harian keluargamu dalam satu tempat.",
  alternates: { canonical: "/register" },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

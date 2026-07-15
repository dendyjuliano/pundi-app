"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { IconChip } from "@/components/icon-chip";
import {
  PlusCircle,
  BookOpen,
  ScrollText,
  FileBarChart,
  ArrowRight,
  Undo2,
  Users,
  Ban,
  MessageCircle,
} from "lucide-react";
import { WHATSAPP_URL } from "@/lib/contact";

export default function BusinessPanduanPage() {
  const { companyId } = useParams<{ companyId: string }>();

  const STEPS = [
    {
      icon: PlusCircle,
      color: "emerald" as const,
      title: "1. Setor Modal Awal",
      description:
        'Perusahaan baru saldonya Rp0 di semua akun — ini normal, bukan bug. Buka "Transaksi Baru", pilih jenis "Setor Modal", isi nominal modal awal (mis. uang kas yang kamu masukkan ke usaha). Setelah dicatat, saldo Kas di halaman Akun langsung berubah.',
      href: `/business/${companyId}/transactions/new`,
      linkLabel: "Buka Transaksi Baru",
    },
    {
      icon: PlusCircle,
      color: "blue" as const,
      title: "2. Catat Transaksi Sehari-hari",
      description:
        'Tiap ada penjualan, pembelian, atau bayar beban, catat lewat "Transaksi Baru" — pilih jenisnya (Penjualan Tunai, Bayar Beban Operasional, dst), sistem otomatis tentukan sisi debit/kredit-nya. Kamu tidak perlu paham istilah akuntansi, cukup pilih jenis transaksi yang paling cocok.',
      href: `/business/${companyId}/transactions/new`,
      linkLabel: "Buka Transaksi Baru",
    },
    {
      icon: BookOpen,
      color: "violet" as const,
      title: "3. Cek Saldo di Akun",
      description:
        "Halaman Akun cuma buat MELIHAT saldo (dihitung otomatis dari transaksi), bukan tempat mengisi angka manual. Kamu bisa ubah nama akun, nonaktifkan akun yang tidak dipakai, atau tambah akun baru kalau ada kategori yang belum ada di 18 akun bawaan.",
      href: `/business/${companyId}/accounts`,
      linkLabel: "Buka Akun",
    },
    {
      icon: ScrollText,
      color: "amber" as const,
      title: "4. Lihat Riwayat di Jurnal",
      description:
        "Semua transaksi yang sudah dicatat muncul di sini, urut dari yang terbaru. Klik salah satu buat lihat detail debit/kredit-nya, atau buat koreksi kalau ada yang salah catat.",
      href: `/business/${companyId}/journal-entries`,
      linkLabel: "Buka Jurnal",
    },
    {
      icon: FileBarChart,
      color: "rose" as const,
      title: "5. Lihat Laporan Laba Rugi",
      description:
        "Setelah beberapa transaksi tercatat, buka halaman ini buat lihat Laba Kotor, Laba Usaha, sampai Laba Bersih — bisa difilter per rentang tanggal dan dicetak.",
      href: `/business/${companyId}/reports/income-statement`,
      linkLabel: "Buka Laporan Laba Rugi",
    },
  ];

  const EXTRA_FEATURES = [
    {
      icon: Undo2,
      color: "blue" as const,
      title: "Koreksi Transaksi yang Salah Catat",
      description:
        'Jurnal yang sudah tersimpan TIDAK BISA diedit langsung (sengaja, biar riwayat tetap utuh). Buka halaman Jurnal, klik transaksi yang salah, lalu klik "Buat Koreksi" — sistem otomatis bikin transaksi pembalik, jadi efeknya terhitung tanpa mengubah data lama.',
      href: `/business/${companyId}/journal-entries`,
      linkLabel: "Buka Jurnal",
    },
    {
      icon: Users,
      color: "violet" as const,
      title: "Undang Anggota Tim",
      description:
        "Kalau kamu kerja sama dengan akuntan atau staff, undang mereka lewat Pengaturan (harus sudah punya akun Pundi). Ada 3 peran: Owner (akses penuh), Akuntan (bisa kelola akun & koreksi jurnal), Staff (cuma bisa catat transaksi harian).",
      href: `/business/${companyId}/settings`,
      linkLabel: "Buka Pengaturan",
    },
    {
      icon: Ban,
      color: "amber" as const,
      title: "Nonaktifkan Akun yang Tidak Dipakai",
      description:
        "Akun yang sudah pernah dipakai di jurnal tidak bisa dihapus (biar riwayat tetap akurat) — tapi bisa dinonaktifkan lewat toggle di halaman Akun, jadi tidak muncul lagi sebagai pilihan waktu catat transaksi baru.",
      href: `/business/${companyId}/accounts`,
      linkLabel: "Buka Akun",
    },
  ];

  const FAQS = [
    {
      question: "Kenapa saldo Kas/Bank saya Rp0 padahal sudah bikin perusahaan?",
      answer:
        'Perusahaan baru memang mulai dari Rp0 di semua akun — saldo dihitung otomatis dari transaksi yang dicatat, bukan diisi manual. Mulai dari "Setor Modal Awal" lewat halaman Transaksi Baru.',
    },
    {
      question: "Kenapa saya tidak bisa mengedit transaksi yang sudah dicatat?",
      answer:
        'Sengaja immutable (tidak bisa diedit/dihapus sembarangan) buat menjaga jejak audit — sama seperti prinsip akuntansi asli. Kalau salah catat, buka halaman Jurnal dan pakai tombol "Buat Koreksi" — bukan hapus dan catat ulang.',
    },
    {
      question: 'Apa bedanya "Beban Operasional" dan "Beban Pokok Penjualan (COGS)"?',
      answer:
        'Beban Pokok Penjualan (COGS) adalah biaya langsung buat menghasilkan barang/jasa yang dijual (mis. bahan baku, BBM buat jasa pengiriman) — dikurangi dari Pendapatan buat dapat "Laba Kotor". Beban Operasional adalah biaya menjalankan usaha sehari-hari yang tidak langsung terkait produksi (mis. gaji, sewa, listrik) — dikurangi setelah itu buat dapat "Laba Usaha".',
    },
    {
      question: 'Kenapa saya (role Staff) tidak bisa pakai opsi "Lainnya (Manual)" di Transaksi Baru?',
      answer:
        "Opsi input debit/kredit manual (bebas pilih akun apa saja) cuma tersedia buat role Akuntan dan Owner, karena butuh pemahaman akuntansi lebih dalam. Role Staff cuma bisa pakai jenis transaksi yang sudah dipetakan otomatis, biar tidak salah catat.",
    },
    {
      question: 'Apa itu badge "tetap"/"variabel" di beberapa akun beban?',
      answer:
        "Itu penanda internal (fixed/variable cost) buat analisis manajemen di fitur lanjutan nanti — TIDAK mempengaruhi angka di Laporan Laba Rugi sama sekali. Boleh diabaikan kalau belum butuh.",
    },
    {
      question: "Apa bedanya Neraca sama Laporan Laba Rugi?",
      answer:
        'Laporan Laba Rugi nunjukkin performa selama SATU PERIODE (mis. untung/rugi selama bulan Mei). Neraca nunjukkin kondisi keuangan di SATU TANGGAL (mis. per 31 Mei: perusahaan ini sekarang punya apa aja — Aset — dan berutang berapa — Utang — sehingga sisa buat pemilik berapa — Modal). Keduanya saling terhubung: laba/rugi yang dihasilkan tiap periode ikut menambah/mengurangi Modal di Neraca (baris "Laba Ditahan").',
    },
    {
      question: "Terus Arus Kas bedanya apa lagi dari dua laporan itu?",
      answer:
        'Laba Rugi bisa "untung" di atas kertas walau Kas-nya belum tentu bertambah (mis. jual barang tapi belum dibayar customer — itu Piutang, bukan Kas). Arus Kas fokus KHUSUS ke pergerakan Kas & Bank beneran selama satu periode, dipecah 3 bagian: Aktivitas Operasi (dari jualan/beban sehari-hari), Aktivitas Investasi (beli/jual aset — belum ada modul-nya di Pundi Business, jadi selalu Rp0 dulu), dan Aktivitas Pendanaan (modal masuk dari pemilik, atau prive). Kalau Laba Rugi bagus tapi Arus Kas negatif, itu tanda uang kamu "tertahan" di Piutang/Persediaan — sinyal penting yang tidak kelihatan dari Laba Rugi doang.',
    },
    {
      question: "Apa itu Rasio Keuangan dan kenapa ada label Sehat/Perlu Perhatian/Kritis?",
      answer:
        'Rasio Keuangan itu angka-angka dari Laba Rugi, Neraca, dan Arus Kas yang digabung jadi 5 indikator gampang dibaca — mis. "dari tiap Rp100.000 penjualan, berapa yang jadi untung bersih" atau "kalau tidak ada pemasukan lagi, bisnis ini tahan berapa lama". Labelnya (Sehat/Perlu Perhatian/Kritis) itu panduan umum berdasarkan aturan sederhana, BUKAN audit resmi — tetap perlu dicek ke akuntan/konsultan keuangan buat keputusan besar (pinjaman bank, investasi, dll). Tujuannya cuma kasih gambaran cepat, bukan gantiin penilaian profesional sepenuhnya.',
    },
    {
      question: "Siapa saja yang bisa lihat data perusahaan ini?",
      answer:
        "Cuma anggota yang sudah diundang lewat halaman Pengaturan (owner/akuntan/staff). Ini domain data yang benar-benar terpisah dari akun personal Pundi — perusahaan lain atau keluarga Pundi-mu tidak bisa mengaksesnya sama sekali.",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Panduan Pundi Business</h1>
        <p className="text-sm text-muted-foreground">
          Masih bingung mulai dari mana? Ikuti urutan di bawah ini.
        </p>
      </div>

      <div className="space-y-4">
        {STEPS.map((step) => (
          <Card key={step.title}>
            <CardHeader className="flex flex-row items-start gap-3 space-y-0">
              <IconChip icon={step.icon} color={step.color} />
              <div className="flex-1">
                <CardTitle className="text-base">{step.title}</CardTitle>
                <CardDescription className="mt-1">{step.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" size="sm">
                <Link href={step.href}>
                  {step.linkLabel}
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-bold tracking-tight">Fitur Tambahan</h2>
        <p className="text-sm text-muted-foreground">
          Berguna begitu perusahaanmu mulai jalan lebih dari sekadar catat transaksi
        </p>
      </div>

      <div className="space-y-4">
        {EXTRA_FEATURES.map((feature) => (
          <Card key={feature.title}>
            <CardHeader className="flex flex-row items-start gap-3 space-y-0">
              <IconChip icon={feature.icon} color={feature.color} />
              <div className="flex-1">
                <CardTitle className="text-base">{feature.title}</CardTitle>
                <CardDescription className="mt-1">{feature.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" size="sm">
                <Link href={feature.href}>
                  {feature.linkLabel}
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pertanyaan Umum</CardTitle>
          <CardDescription>Hal-hal yang sering bikin bingung pengguna baru</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="space-y-2">
            {FAQS.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="rounded-xl border bg-muted/30 px-4 last:border-b"
              >
                <AccordionTrigger className="text-sm font-medium hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <Card className="border-0 bg-linear-to-br from-slate-700 to-slate-900 text-white">
        <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="font-semibold">Masih butuh bantuan?</p>
            <p className="text-sm text-white/80">
              Chat langsung kalau ada yang masih membingungkan.
            </p>
          </div>
          <Button
            asChild
            size="sm"
            className="bg-white text-slate-900 hover:bg-white/90 shrink-0"
          >
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="size-4" />
              Hubungi via WhatsApp
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

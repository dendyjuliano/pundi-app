import Link from "next/link";
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
  Settings,
  Wallet,
  Receipt,
  LayoutDashboard,
  BarChart3,
  MessageCircle,
  ArrowRight,
} from "lucide-react";
import { WHATSAPP_URL } from "@/lib/contact";

const STEPS = [
  {
    icon: Settings,
    color: "violet" as const,
    title: "1. Atur Settings",
    description:
      "Mulai dari sini. Tambahkan kategori sumber pemasukan (mis. Gaji Kantor), kategori pos alokasi (mis. Transfer Ibu, Sewa Kos, Investasi), dan isi jatah makan per hari. Ini cuma perlu diisi sekali di awal — nanti tinggal disesuaikan kalau ada perubahan.",
    href: "/settings",
    linkLabel: "Buka Settings",
  },
  {
    icon: Wallet,
    color: "blue" as const,
    title: "2. Isi Budget Bulanan",
    description:
      "Masukkan nominal pemasukan dan alokasi untuk bulan berjalan. Pos \"Makan\" otomatis terhitung dari jatah harian × jumlah hari — tidak perlu diisi manual. Sisa dari Income dikurangi semua alokasi jadi Total Bersih, yaitu budget harianmu di luar Makan.",
    href: "/budget",
    linkLabel: "Buka Budget",
  },
  {
    icon: Receipt,
    color: "amber" as const,
    title: "3. Catat Pengeluaran Harian",
    description:
      "Tiap kali ada pengeluaran, catat di sini — pilih kategori Makan atau Lain-lain (Lain-lain wajib diisi keterangan). Kalau makan 3x sehari, catat 3x terpisah, bukan digabung jadi 1 angka — biar datanya lebih detail dan gampang ditelusuri nanti.",
    href: "/expenses",
    linkLabel: "Buka Pengeluaran",
  },
  {
    icon: LayoutDashboard,
    color: "emerald" as const,
    title: "4. Pantau di Dashboard",
    description:
      "Lihat ringkasan Hari Ini, Minggu Ini, dan Bulan Ini — dibandingkan dengan target yang sudah dihitung dari Budget. Ada mode Bulanan dan Tahunan, dan admin bisa pilih lihat dashboard anggota lain lewat dropdown di pojok kanan atas.",
    href: "/dashboard",
    linkLabel: "Buka Dashboard",
  },
  {
    icon: BarChart3,
    color: "rose" as const,
    title: "5. Analisis di Reports",
    description:
      "Kalau sudah ada beberapa bulan data, buka Reports untuk lihat tren pengeluaran, alokasi penghasilan, dan pola makan sepanjang tahun dalam bentuk grafik — bisa filter per tahun.",
    href: "/reports",
    linkLabel: "Buka Reports",
  },
];

const FAQS = [
  {
    question: 'Kenapa pos alokasi "Makan" tidak bisa saya edit manual?',
    answer:
      'Nominalnya sengaja otomatis dihitung dari jatah makan per hari (diatur di Settings) dikali jumlah hari di bulan itu. Kalau mau mengubahnya, ubah nilai "Jatah Makan per Hari" di Settings, nanti otomatis kehitung ulang.',
  },
  {
    question:
      'Apa bedanya "Rencana" dan "Realisasi" di kategori Investasi?',
    answer:
      '"Rencana" adalah target investasi bulan itu (diisi di Budget seperti pos alokasi lain). "Realisasi" adalah investasi yang benar-benar sudah dijalankan — diisi terpisah supaya kamu bisa bandingkan apakah sesuai target atau masih kurang.',
  },
  {
    question:
      "Kalau saya isi Budget bulan ini, apakah bulan lain ikut berubah?",
    answer:
      "Bulan-bulan SETELAHNYA yang masih kosong (belum pernah diisi sama sekali) akan otomatis ikut terisi dengan nilai yang sama, supaya tidak perlu diisi satu-satu — tapi begitu satu bulan sudah tersimpan, dia berdiri sendiri dan tidak berubah lagi walau bulan sebelumnya diedit lagi. Bulan-bulan SEBELUMNYA tidak pernah ikut berubah.",
  },
  {
    question:
      "Kenapa kategori yang saya hapus masih muncul di laporan bulan lama?",
    answer:
      "Ini disengaja — menghapus kategori tidak menghapus/mengubah data bulan-bulan yang sudah tersimpan, supaya riwayat & total di masa lalu tetap akurat. Kategori yang dihapus cuma tidak muncul lagi sebagai pilihan untuk input baru.",
  },
  {
    question: "Siapa yang bisa lihat data pengeluaran saya?",
    answer:
      "Cuma kamu sendiri dan admin dari akun yang membuatkan akunmu (kepala keluarga/pengelola grup). Admin dari grup lain tidak bisa melihat data grupmu sama sekali — datanya benar-benar terpisah per grup.",
  },
  {
    question: "Bagaimana admin bisa lihat dashboard anggota lain?",
    answer:
      'Buka halaman Admin, tiap anggota punya tombol "Lihat Dashboard Lengkap". Atau langsung dari Dashboard, admin akan melihat dropdown pemilih anggota di pojok kanan atas untuk berpindah-pindah.',
  },
];

export default function PanduanPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Panduan Penggunaan
        </h1>
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
                <CardDescription className="mt-1">
                  {step.description}
                </CardDescription>
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

      <Card>
        <CardHeader>
          <CardTitle>Pertanyaan Umum</CardTitle>
          <CardDescription>
            Hal-hal yang sering bikin bingung pengguna baru
          </CardDescription>
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

      <Card className="border-0 bg-linear-to-br from-emerald-500 to-teal-600 text-white">
        <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="font-semibold">Masih butuh bantuan?</p>
            <p className="text-sm text-emerald-50/85">
              Chat langsung kalau ada yang masih membingungkan.
            </p>
          </div>
          <Button
            asChild
            size="sm"
            className="bg-white text-emerald-700 hover:bg-white/90 shrink-0"
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

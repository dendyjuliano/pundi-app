import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import {
  PiggyBank,
  Wallet,
  Receipt,
  BarChart3,
  Users,
  ShieldCheck,
  ArrowRight,
  Settings,
  LayoutDashboard,
  Layers,
  Sparkles,
  Bell,
  Repeat,
  Target,
  TrendingUp,
  Moon,
  Briefcase,
  BookOpen,
  ScrollText,
  FileBarChart,
  Undo2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GradientBlobs } from "@/components/gradient-blobs";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const CORE_FEATURES = [
  {
    icon: Wallet,
    title: "Pemasukan Multi-Sumber",
    description:
      "Catat semua sumber penghasilan sekaligus — gaji kantor, freelance, bisnis sampingan — otomatis dijumlahkan jadi Total Income tiap bulan.",
  },
  {
    icon: Layers,
    title: "Alokasi Otomatis",
    description:
      "Bagi penghasilan ke pos-pos tetap. Pos Makan otomatis dihitung dari jatah harian × jumlah hari, tidak perlu isi manual tiap bulan.",
  },
  {
    icon: Receipt,
    title: "Pengeluaran Harian",
    description:
      "Input cepat tiap transaksi, langsung dibandingkan dengan target harian, mingguan, dan bulanan.",
  },
  {
    icon: BarChart3,
    title: "Laporan & Grafik",
    description:
      "Tren pengeluaran, alokasi penghasilan, dan pola makan sepanjang tahun tervisualisasi otomatis.",
  },
  {
    icon: Users,
    title: "Multi-Anggota",
    description:
      "Tambah anggota keluarga atau tim lain, masing-masing kelola datanya sendiri — kamu tetap bisa pantau semuanya.",
  },
  {
    icon: ShieldCheck,
    title: "Privasi per Grup",
    description:
      "Data grupmu benar-benar terpisah dari grup lain yang memakai Pundi — tidak ada yang bisa melihat data finansialmu.",
  },
];

// Fitur pelengkap — ditampilkan lebih ringkas (bukan kartu besar kayak
// CORE_FEATURES) biar fitur inti di atas tetap yang paling menonjol.
const BONUS_FEATURES = [
  { icon: Bell, title: "Pengingat Otomatis" },
  { icon: Repeat, title: "Pengeluaran Berulang" },
  { icon: Target, title: "Target Tabungan" },
  { icon: TrendingUp, title: "Insight Otomatis" },
  { icon: Moon, title: "Tema Gelap" },
];

const STEPS = [
  { icon: Settings, label: "Atur kategori & jatah makan" },
  { icon: Wallet, label: "Isi budget bulanan" },
  { icon: Receipt, label: "Catat pengeluaran harian" },
  { icon: LayoutDashboard, label: "Pantau di Dashboard" },
];

const SCREENSHOTS = [
  { label: "Dashboard", src: "/dashboard.jpeg" },
  { label: "Budget Bulanan", src: "/budget.jpeg" },
  { label: "Reports & Grafik", src: "/report.jpeg" },
  { label: "Target Tabungan", src: "/target.jpeg" },
];

const BUSINESS_FEATURES = [
  {
    icon: BookOpen,
    title: "Chart of Accounts Fleksibel",
    description:
      "Akun disesuaikan per industri usahamu — bukan template kaku, bisa tambah atau nonaktifkan akun kapan saja.",
  },
  {
    icon: ScrollText,
    title: "Jurnal Umum Otomatis",
    description:
      "Pilih jenis transaksi (Penjualan, Bayar Beban, dst), sistem yang hitung debit/kredit-nya — tidak perlu paham istilah akuntansi.",
  },
  {
    icon: FileBarChart,
    title: "Laporan Laba Rugi Instan",
    description:
      "Laba Kotor, Laba Usaha, sampai Laba Bersih terhitung otomatis dari transaksi yang sudah dicatat, kapan saja dibutuhkan.",
  },
  {
    icon: BarChart3,
    title: "Chart & Insight",
    description:
      "Tren pendapatan vs beban bulanan dan komposisi beban tervisualisasi, bukan cuma angka mentah di tabel.",
  },
  {
    icon: Users,
    title: "Multi-Role Tim",
    description:
      "Undang akuntan atau staff dengan akses berbeda — Owner, Akuntan, Staff, sesuai tanggung jawab masing-masing.",
  },
  {
    icon: Undo2,
    title: "Audit Trail Aman",
    description:
      "Histori transaksi tidak bisa diedit sembarangan — koreksi lewat entry pembalik, jejak lama tetap utuh.",
  },
];

const PRICING_PLANS = [
  {
    name: "Personal",
    tagline: "Buat kelola keuangan pribadi atau keluarga",
    price: "Gratis",
    period: "selamanya",
    accent: "emerald" as const,
    highlighted: false,
    features: [
      "Pemasukan multi-sumber & alokasi otomatis",
      "Pengeluaran harian & budget bulanan",
      "Laporan & grafik tahunan",
      "Target tabungan & piutang",
      "Split bill & multi-anggota keluarga",
      "Tanpa kartu kredit, tanpa batas waktu",
    ],
    cta: { label: "Daftar Gratis", href: "/register" },
  },
  {
    name: "Business",
    tagline: "Buat UMKM yang mau laporan keuangan rapi tanpa sewa akuntan",
    price: "Rp99.000",
    period: "/bulan per perusahaan",
    badge: "Trial 14 hari gratis",
    accent: "slate" as const,
    highlighted: true,
    features: [
      "Chart of Accounts + Jurnal Umum",
      "Laporan Laba Rugi otomatis",
      "Chart tren & komposisi beban",
      "Multi-role tim (Owner/Akuntan/Staff)",
      "Panduan lengkap di dalam aplikasi",
      "Trial 14 hari, bayar via transfer manual",
    ],
    cta: { label: "Coba Gratis 14 Hari", href: "/register/business" },
  },
];

function BusinessMockup() {
  const barRows = [
    { label: "Pendapatan Operasional", width: 78, strong: false },
    { label: "Beban Pokok Penjualan", width: 42, strong: false },
    { label: "Laba Kotor", width: 60, strong: true },
    { label: "Beban Operasional", width: 48, strong: false },
    { label: "Laba Bersih", width: 66, strong: true },
  ];
  const chartBars = [42, 65, 50, 80, 60, 92, 74];

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-2xl shadow-slate-950/10">
      <div className="flex items-center gap-1.5 border-b bg-muted/40 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-red-400" />
        <span className="size-2.5 rounded-full bg-amber-400" />
        <span className="size-2.5 rounded-full bg-emerald-400" />
        <span className="ml-3 text-xs font-medium text-muted-foreground">
          Laporan Laba Rugi — pratinjau
        </span>
      </div>
      <div className="grid grid-cols-1 gap-8 bg-muted/10 p-6 sm:grid-cols-5 sm:p-8">
        <div className="col-span-2 space-y-4">
          {barRows.map((row) => (
            <div key={row.label} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-xs ${row.strong ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                >
                  {row.label}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className={`h-2 rounded-full ${row.strong ? "bg-linear-to-r from-slate-700 to-slate-500" : "bg-slate-400 dark:bg-slate-600"}`}
                  style={{ width: `${row.width}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="col-span-3 flex items-end gap-2.5 sm:pl-4">
          {chartBars.map((h, i) => (
            <div key={i} className="flex-1">
              <div
                className="rounded-t-md bg-linear-to-t from-slate-700 to-slate-400"
                style={{ height: `${h}px` }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScreenshotFrame({
  label,
  src,
  className,
  priority,
}: {
  label: string;
  src: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-card shadow-2xl shadow-emerald-950/10 ${className ?? ""}`}
    >
      <div className="flex items-center gap-1.5 border-b bg-muted/40 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-red-400" />
        <span className="size-2.5 rounded-full bg-amber-400" />
        <span className="size-2.5 rounded-full bg-emerald-400" />
      </div>
      <div className="relative aspect-16/10 bg-muted/30">
        <Image
          src={src}
          alt={`Tampilan halaman ${label} di Pundi`}
          fill
          priority={priority}
          className="object-cover object-top"
          sizes="(min-width: 1024px) 960px, 100vw"
        />
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-linear-to-b from-emerald-50 dark:from-emerald-950/30 via-background to-background">
      {/* Header + Hero share one clipping wrapper so the decorative blob
          glow is continuous behind the floating nav instead of cutting
          off right at the hero section's top edge. */}
      <div className="relative overflow-hidden">
        <GradientBlobs />

        {/* Nav — floating pill, sits above the hero gradient */}
        <header className="sticky top-4 z-30 px-4 sm:px-8">
          <div className="relative mx-auto flex max-w-4xl items-center justify-between rounded-full border bg-background/80 py-2.5 pl-4 pr-2.5 shadow-lg shadow-black/5 backdrop-blur-lg sm:pl-5">
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 shadow-sm shadow-emerald-500/30">
                <PiggyBank className="size-3.5 text-white" />
              </div>
              <span className="font-semibold">Pundi</span>
            </div>
            <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 text-sm font-medium text-muted-foreground sm:flex">
              <a
                href="#fitur"
                className="transition-colors hover:text-foreground"
              >
                Fitur
              </a>
              <a
                href="#cara-kerja"
                className="transition-colors hover:text-foreground"
              >
                Cara Kerja
              </a>
              <a
                href="#tampilan"
                className="transition-colors hover:text-foreground"
              >
                Tampilan
              </a>
              <a
                href="#bisnis"
                className="transition-colors hover:text-foreground"
              >
                Bisnis
              </a>
              <a
                href="#harga"
                className="transition-colors hover:text-foreground"
              >
                Harga
              </a>
            </nav>
            <div className="flex items-center gap-1.5">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="rounded-full"
              >
                <Link href="/login">Masuk</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="rounded-full bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
              >
                <Link href="/register">Daftar Akun</Link>
              </Button>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="relative px-4 pt-14 pb-16 sm:px-8 sm:pt-20">
          <div className="relative mx-auto max-w-4xl text-center space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-4 py-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400 shadow-sm backdrop-blur">
              <Sparkles className="size-3.5" />
              Buat pribadi, keluarga, sampai bisnis
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
              Kelola keuangan{" "}
              <span className="bg-linear-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
                kamu
              </span>
              ,
              <br className="hidden sm:block" />
              bukan drama bulanan
            </h1>
            <p className="mx-auto max-w-xl text-lg sm:text-xl text-muted-foreground">
              Pundi bantu kamu memantau pemasukan, alokasi, dan pengeluaran
              harian dalam satu tempat — buat individu, keluarga, sampai
              laporan keuangan usaha kecil — tanpa rekap manual di
              spreadsheet lagi.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                asChild
                size="lg"
                className="rounded-full bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/30 px-8"
              >
                <Link href="/register">
                  Daftar Akun
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full px-8"
              >
                <Link href="/login">Sudah punya akun? Masuk</Link>
              </Button>
            </div>
          </div>

          {/* Hero visual */}
          <div className="relative mx-auto mt-16 max-w-5xl">
            <ScreenshotFrame label="Dashboard" src="/dashboard.jpeg" priority />
          </div>
        </section>
      </div>

      {/* Features — dark section for contrast */}
      <section id="fitur" className="bg-zinc-950 px-4 py-24 sm:px-8 text-white">
        <div className="mx-auto max-w-6xl space-y-16">
          <div className="mx-auto max-w-2xl text-center space-y-3">
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
              Fitur
            </p>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Semua yang kamu butuhkan,
              <br className="hidden sm:block" /> di satu tempat
            </h2>
            <p className="text-lg text-zinc-400">
              Dari input pemasukan sampai laporan tahunan, tidak perlu rangkai
              sendiri di spreadsheet.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {CORE_FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 space-y-4 transition-colors hover:bg-white/[0.06]"
              >
                <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
                  <f.icon className="size-5" />
                </div>
                <h3 className="font-semibold text-lg">{f.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-6">
            <div className="text-center space-y-1.5">
              <h3 className="text-xl font-semibold">Makin Lengkap</h3>
              <p className="text-sm text-zinc-400">
                Fitur tambahan yang bikin kamu makin rajin mencatat, tanpa harus
                selalu ingat sendiri.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {BONUS_FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 transition-colors hover:bg-white/[0.06]"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                    <f.icon className="size-4" />
                  </div>
                  <p className="text-sm font-medium">{f.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="cara-kerja" className="px-4 py-24 sm:px-8 dark:bg-muted/60">
        <div className="mx-auto max-w-5xl space-y-16">
          <div className="mx-auto max-w-xl text-center space-y-3">
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">
              Cara Kerja
            </p>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
              4 langkah singkat
            </h2>
          </div>
          <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-8">
            <div className="pointer-events-none absolute top-6 left-0 right-0 hidden h-px bg-linear-to-r from-transparent via-border to-transparent sm:block" />
            {STEPS.map((s, i) => (
              <div
                key={s.label}
                className="relative flex flex-col items-center text-center gap-3"
              >
                <div className="relative flex size-12 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25">
                  <s.icon className="size-5" />
                  <span className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full border-2 border-background bg-foreground text-[10px] font-bold text-background">
                    {i + 1}
                  </span>
                </div>
                <p className="text-sm font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Screenshots */}
      <section id="tampilan" className="px-4 py-24 sm:px-8">
        <div className="mx-auto max-w-6xl space-y-16">
          <div className="mx-auto max-w-xl text-center space-y-3">
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">
              Tampilan
            </p>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Modern, gampang dipakai
            </h2>
            <p className="text-lg text-muted-foreground">
              Di HP maupun laptop, semuanya tetap enak dilihat.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SCREENSHOTS.map((s) => (
              <ScreenshotFrame key={s.label} label={s.label} src={s.src} />
            ))}
          </div>
        </div>
      </section>

      {/* Pundi Business — dark slate section, deliberately distinct from
          the emerald personal-finance theme so it reads as a separate
          product tier, not just another feature of the free plan. */}
      <section
        id="bisnis"
        className="relative overflow-hidden bg-linear-to-br from-slate-900 via-slate-950 to-black px-4 py-24 sm:px-8 text-white"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute -top-24 right-0 size-96 rounded-full bg-slate-600/20 blur-3xl" />
          <div className="absolute bottom-0 -left-24 size-72 rounded-full bg-slate-500/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-6xl space-y-16">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-sm font-medium text-slate-300">
                <Briefcase className="size-3.5" />
                Baru: Pundi Business
              </div>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
                Laporan keuangan usaha,
                <br className="hidden sm:block" /> tanpa sewa akuntan
              </h2>
              <p className="text-lg text-slate-400">
                Chart of Accounts, Jurnal Umum, sampai Laporan Laba Rugi —
                dicatat sekali lewat transaksi harian, laporannya terhitung
                otomatis kapan saja kamu butuh.
              </p>
              <div className="pt-2">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full bg-white text-slate-900 hover:bg-white/90 px-8 shadow-lg"
                >
                  <Link href="/register/business">
                    Coba Pundi Business
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>
            <BusinessMockup />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {BUSINESS_FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 space-y-4 transition-colors hover:bg-white/[0.06]"
              >
                <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-500/20 text-slate-300">
                  <f.icon className="size-5" />
                </div>
                <h3 className="font-semibold text-lg">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="harga" className="px-4 py-24 sm:px-8 dark:bg-muted/60">
        <div className="mx-auto max-w-5xl space-y-16">
          <div className="mx-auto max-w-xl text-center space-y-3">
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">
              Harga
            </p>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Mulai gratis, upgrade kalau perlu
            </h2>
            <p className="text-lg text-muted-foreground">
              Personal selamanya gratis. Business murah dulu, sengaja — biar
              usaha kecil ikut ngerasain manfaatnya.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PRICING_PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-3xl border p-8 space-y-6 ${
                  plan.highlighted
                    ? "border-slate-800 bg-linear-to-br from-slate-900 to-slate-950 text-white shadow-2xl shadow-slate-950/20 md:-my-4 md:py-12"
                    : "bg-card"
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-8 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow-md">
                    {plan.badge}
                  </span>
                )}
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex size-9 items-center justify-center rounded-xl ${
                      plan.accent === "emerald"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : plan.highlighted
                          ? "bg-white/10 text-slate-200"
                          : "bg-slate-500/15 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {plan.accent === "emerald" ? (
                      <PiggyBank className="size-4" />
                    ) : (
                      <Briefcase className="size-4" />
                    )}
                  </div>
                  <span className="font-semibold text-lg">{plan.name}</span>
                </div>
                <p
                  className={`text-sm ${plan.highlighted ? "text-slate-400" : "text-muted-foreground"}`}
                >
                  {plan.tagline}
                </p>
                <div className="flex items-end gap-1.5">
                  <span className="text-4xl font-bold tracking-tight">
                    {plan.price}
                  </span>
                  <span
                    className={`pb-1 text-sm ${plan.highlighted ? "text-slate-400" : "text-muted-foreground"}`}
                  >
                    {plan.period}
                  </span>
                </div>
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                      <Check
                        className={`size-4 shrink-0 mt-0.5 ${
                          plan.accent === "emerald"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : plan.highlighted
                              ? "text-slate-300"
                              : "text-slate-600 dark:text-slate-300"
                        }`}
                      />
                      <span className={plan.highlighted ? "text-slate-200" : ""}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  size="lg"
                  className={`w-full rounded-full ${
                    plan.highlighted
                      ? "bg-white text-slate-900 hover:bg-white/90"
                      : "bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                  }`}
                >
                  <Link href={plan.cta.href}>{plan.cta.label}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-linear-to-br from-emerald-500 via-emerald-600 to-teal-700 px-4 py-24 sm:px-8 text-white">
        <GradientBlobs className="opacity-40" />
        <div className="relative mx-auto max-w-2xl text-center space-y-6">
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Siap mulai kelola keuangan lebih rapi?
          </h2>
          <p className="text-lg text-emerald-50/85">
            Daftar gratis, langsung bisa dipakai — tidak perlu kartu kredit atau
            setup rumit.
          </p>
          <div className="flex justify-center pt-2">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-white text-emerald-700 hover:bg-white/90 px-8 shadow-lg"
            >
              <Link href="/register">
                Daftar Akun
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-950 px-4 py-16 text-zinc-400 sm:px-8">
        <div className="mx-auto max-w-6xl space-y-12">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <div className="col-span-2 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 shadow-sm shadow-emerald-500/30">
                  <PiggyBank className="size-4 text-white" />
                </div>
                <span className="text-lg font-semibold text-white">Pundi</span>
              </div>
              <p className="max-w-xs text-sm">
                Kelola pemasukan, alokasi, dan pengeluaran harian — pribadi,
                keluarga, sampai bisnis — dalam satu tempat.
              </p>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold text-white">Produk</p>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="#fitur"
                    className="transition-colors hover:text-white"
                  >
                    Fitur
                  </a>
                </li>
                <li>
                  <a
                    href="#cara-kerja"
                    className="transition-colors hover:text-white"
                  >
                    Cara Kerja
                  </a>
                </li>
                <li>
                  <a
                    href="#tampilan"
                    className="transition-colors hover:text-white"
                  >
                    Tampilan
                  </a>
                </li>
                <li>
                  <a
                    href="#bisnis"
                    className="transition-colors hover:text-white"
                  >
                    Pundi Business
                  </a>
                </li>
                <li>
                  <a
                    href="#harga"
                    className="transition-colors hover:text-white"
                  >
                    Harga
                  </a>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold text-white">Akun</p>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="/login"
                    className="transition-colors hover:text-white"
                  >
                    Masuk
                  </Link>
                </li>
                <li>
                  <Link
                    href="/register"
                    className="transition-colors hover:text-white"
                  >
                    Daftar Akun
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col gap-2 border-t border-white/10 pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Pundi. Semua hak dilindungi.</p>
            <p>
              Dibuat oleh{" "}
              <a
                href="https://dendyjuliano.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-zinc-300 underline underline-offset-2 transition-colors hover:text-white"
              >
                Dendy Juliano Juanda
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

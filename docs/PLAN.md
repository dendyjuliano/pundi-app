# Pundi — Task Plan

Referensi desain sistem lengkap: [SYSTEM.md](./SYSTEM.md)

Status: `[ ]` belum dikerjakan · `[x]` selesai · `[~]` in progress

---

## Fase 0 — Persiapan

- [x] Baca `node_modules/next/dist/docs/` bagian relevan (routing, data
      fetching, route handlers) untuk memastikan tidak pakai konvensi lama
      yang sudah berubah di versi Next.js ini — catatan: `middleware.ts` kini
      bernama `proxy.ts`, dynamic route `params` adalah Promise
- [x] Setup MongoDB Atlas cluster (free tier) + connection string
- [x] Install dependencies: `mongoose`, `next-auth`, `bcryptjs`, `recharts`
- [ ] Install & init shadcn/ui (ditunda ke Fase 2/3 saat mulai bikin UI form)
- [x] Setup `.env.local` (Mongo URI, NextAuth secret) — pastikan masuk
      `.gitignore`

## Fase 1 — Fondasi Backend

- [x] Koneksi Mongoose (singleton connection helper untuk Next.js dev mode)
      → `lib/mongodb.ts`
- [x] Model: `User` (name, email, passwordHash, role) → `models/User.ts`
- [x] Model: `IncomeCategory` → `models/IncomeCategory.ts`
- [x] Model: `AllocationCategory` → `models/AllocationCategory.ts`
- [x] Model: `DailyBudgetSetting` → `models/DailyBudgetSetting.ts`
- [x] Model: `MonthlyBudget` (incomes[], allocations[]) → `models/MonthlyBudget.ts`
- [x] Model: `Expense` → `models/Expense.ts`
- [x] Seed script pembuatan user → `scripts/create-user.mts`
      (`npx tsx scripts/create-user.mts <name> <email> <password> [admin|member]`)

## Fase 2 — Auth

- [x] Setup Auth.js dengan credentials provider (JWT session strategy —
      tanpa MongoDB adapter, karena credentials-only auth tidak butuh
      adapter; verifikasi user langsung ke Mongoose di `authorize()`)
      → `lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts`
- [x] Halaman `/login` → `app/login/page.tsx`
- [x] Proxy (`proxy.ts`, bukan `middleware.ts` — lihat catatan Fase 0)
      proteksi route: redirect ke `/login` kalau belum auth, redirect ke
      `/dashboard` kalau sudah auth tapi buka `/login`
- [x] Role-based guard untuk halaman `/admin` di `proxy.ts` (redirect
      non-admin ke `/dashboard`)
- [x] Tidak ada self-register — user dibuat lewat
      `scripts/create-user.mts` untuk sekarang; halaman admin untuk
      membuat member baru disatukan ke Fase 8 (Admin Dashboard)
- [x] Verifikasi end-to-end: login → session cookie ter-set → `/dashboard`
      menampilkan data user & role yang benar → akses tanpa session
      di-redirect ke `/login`

## Fase 3 — Kelola Kategori & Setting

- [x] API: CRUD `IncomeCategory` → `app/api/income-categories/route.ts` +
      `[id]/route.ts` (GET, POST, PATCH, DELETE — scoped ke userId)
- [x] API: CRUD `AllocationCategory` → `app/api/allocation-categories/route.ts` +
      `[id]/route.ts` (termasuk validasi `type`)
- [x] API: GET/POST `DailyBudgetSetting` → `app/api/daily-budget-setting/route.ts`
      (POST selalu membuat entry baru untuk menjaga histori `effectiveFrom`,
      GET mengembalikan entry terbaru)
- [x] Halaman `/settings` — form kelola kategori income, kategori alokasi,
      dan jatah makan per hari → `app/settings/page.tsx`
- [x] Verifikasi end-to-end lewat curl: create/list/update/delete kategori,
      create/get daily budget setting, akses tanpa sesi ditolak 401/redirect

## Fase 4 — Monthly Budget

- [x] API: GET `MonthlyBudget` by month (draft auto-prefill dari bulan
      sebelumnya kalau belum ada data bulan ini — draft tidak dipersist
      ke DB sampai user klik simpan) → `app/api/monthly-budget/route.ts`
- [x] API: PUT `MonthlyBudget` (upsert income & allocation per kategori)
- [x] Logika auto-hitung pos allocation bertipe `food` =
      `amountPerDay × jumlah_hari_di_bulan` (memakai `DailyBudgetSetting`
      yang efektif pada bulan tsb) → `lib/monthlyBudget.ts`
- [x] Halaman `/budget` — form income & alokasi per bulan (input allocation
      tipe "food" di-disable karena auto-calculated), tampilkan Total
      Gross, Total Alokasi, Total Bersih real-time → `app/budget/page.tsx`
- [x] Verifikasi end-to-end lewat curl: draft baru terhitung benar
      (100.000 × 31 hari = 3.100.000 utk Juli), simpan → persist, bulan
      berikutnya carry-forward nilai fixed cost & income, re-kalkulasi
      pos makan sesuai jumlah hari bulan baru

## Fase 5 — Expense Harian

- [x] API: CRUD `Expense` (+ filter `from`/`to` by date) →
      `app/api/expenses/route.ts` + `[id]/route.ts`
- [x] Halaman `/expenses` — form input cepat (tanggal, kategori, jumlah,
      catatan) + list kronologis dikelompokkan per tanggal →
      `app/expenses/page.tsx`
- [x] Validasi: `note` wajib diisi kalau kategori `lain-lain` (dicek di
      POST & PATCH, termasuk saat PATCH mengubah category ke lain-lain
      atau mengosongkan note pada expense lain-lain yang sudah ada)
- [x] Verifikasi end-to-end lewat curl: create/list/update/delete, validasi
      note wajib untuk lain-lain (400 saat kosong, 200 saat diisi)

## Fase 6 — Dashboard & Kalkulasi

- [x] Util kalkulasi ringkasan harian (makan hari ini vs `amountPerDay`)
      → `lib/dashboardSummary.ts`
- [x] Util kalkulasi ringkasan mingguan (minggu ke-N dalam bulan = hari
      1-7, 8-14, dst; total makan, total lain-lain, sisa masing-masing;
      budget lain-lain mingguan = proporsional `totalBersih × hari/hari_bulan`)
- [x] Util kalkulasi ringkasan bulanan (makan aktual vs alokasi food,
      lain-lain aktual vs totalBersih, total aktual vs total target,
      status melenceng/tidak)
- [x] Halaman `/dashboard` — ringkasan bulan berjalan (income, alokasi,
      sisa bersih, progress harian/mingguan/bulanan) → `app/dashboard/page.tsx`
      (refactor `getMonthlyBudgetOrDraft` jadi shared function di
      `lib/monthlyBudget.ts`, dipakai API monthly-budget & dashboard)
- [x] Verifikasi end-to-end: input expense hari ini, cek dashboard
      menghitung dengan benar (harian, mingguan, bulanan, total vs target)

## Fase 7 — Reports & Chart

- [x] Endpoint agregasi data pengeluaran per bulan (untuk chart tahunan) →
      `app/api/reports/yearly/route.ts` + `lib/reports.ts`
- [x] Endpoint alokasi penghasilan per bulan → `app/api/reports/allocation/route.ts`
- [x] Util trendline (regresi linier sederhana) → `lib/trendline.ts`
- [x] Chart 1: Bar pengeluaran bulanan + garis target + trendline (Recharts
      `ComposedChart`)
- [x] Chart 2: **Diganti dari pie chart ke 100%-stacked horizontal bar**
      per rekomendasi skill dataviz (part-to-whole lebih terbaca sebagai
      stacked bar daripada pie; pie chart adalah salah satu anti-pattern
      yang dihindari) — tetap menampilkan % per kategori via legend +
      direct label
- [x] Chart 3: Bar pengeluaran makan bulanan (tertinggi vs rata-rata) +
      2 trendline
- [x] Halaman `/reports` — gabungkan ketiga chart, palet warna kategorikal
      tervalidasi lewat `scripts/validate_palette.js` (skill dataviz) →
      `app/reports/page.tsx`, `lib/chartColors.ts`
- [x] Verifikasi visual: screenshot via Playwright (instalasi sementara,
      sudah di-uninstall setelah verifikasi) — semua 3 chart render benar,
      tidak ada console error, label bulan lengkap 12 bulan

## Fase 8 — Admin Dashboard

- [x] API: endpoint khusus admin untuk query lintas user (role guard 403
      untuk non-admin) → `app/api/admin/users/route.ts` (GET list +
      ringkasan tiap user pakai `getDashboardSummary`, POST buat user baru)
- [x] Halaman `/admin` — daftar user + ringkasan budget/pengeluaran
      masing-masing, expand/collapse untuk detail per user →
      `app/admin/page.tsx`
- [x] Form admin untuk membuat akun member baru (menggantikan
      `scripts/create-user.mts` sebagai cara utama)
- [x] Verifikasi end-to-end: admin bisa list semua user + buat member baru
      (201); member biasa ditolak 403 di API dan redirect 307 di halaman
      `/admin`; data antar user terisolasi (kategori member baru kosong)

## Fase 9 — Polish

- [x] Format currency Rupiah konsisten — diekstrak ke `lib/format.ts`
      (`formatRupiah`, `formatCompactRupiah`), semua halaman yang tadinya
      punya definisi lokal duplikat (`admin`, `settings`, `expenses`,
      `dashboard`, `budget`, `reports`) sekarang import dari situ
- [x] Perbaikan lint `react-hooks/set-state-in-effect` (aturan baru di
      eslint-config-next 16) di 5 halaman — pola fetch-on-mount dibungkus
      IIFE async di dalam effect, dan efek kalkulasi total di `/budget`
      yang murni derived state dihapus total (dihitung langsung saat
      render, bukan disimpan sebagai state terpisah)
- [x] Responsive check (mobile-first) — padding halaman diubah dari `p-8`
      tetap ke `p-4 sm:p-8` di semua halaman utama supaya tidak terlalu
      lebar di layar HP kecil
- [x] Empty states — sudah ada di `/settings` (kategori kosong), `/expenses`
      (belum ada pengeluaran), `/budget` (belum ada kategori), `/reports`
      (belum ada data alokasi)
- [x] Loading & error states — semua halaman client punya state `loading`
      + pesan "Memuat...", form-form kritikal (`/login`, `/expenses`,
      `/admin` buat user) punya pesan error dari response API
- [x] Testing manual end-to-end lewat curl: buat budget bulan berjalan →
      input pengeluaran beberapa hari dalam satu minggu (multi-entry per
      kategori) → cek ringkasan mingguan & bulanan di `/api/admin/users`
      cocok dengan hitungan manual (makan 135.000, lain-lain 60.000,
      status "sesuai target")
- [x] Production build (`pnpm build`) sukses tanpa error/warning — sempat
      ada warning workspace-root ambiguous (lockfile lain di direktori
      induk), diperbaiki dengan `turbopack.root` di `next.config.ts`

## Fase 10 — UI Redesign (modern, mobile + desktop)

Dipicu permintaan: tampilan awal (Tailwind polos) dinilai kurang menarik dan
kurang modern. Keputusan desain (dikonfirmasi user):
navigasi **sidebar (desktop) + bottom tab bar (mobile)**, komponen
**shadcn/ui**, tema **netral + aksen emerald**, tanpa dark mode.

- [x] Install & init shadcn/ui — `-b radix` (Radix UI primitives, support
      `asChild`) setelah percobaan pertama dengan base default (`base-nova`
      / `@base-ui/react`) ternyata API-nya beda dan tidak kompatibel dengan
      pola `asChild` yang dipakai luas di kode
- [x] Set tema emerald di `app/globals.css` (`--primary`, `--accent`,
      `--ring`, `--sidebar-*` di-override ke oklch emerald-600); fix bug
      `--font-sans: var(--font-sans)` (self-referential) dari hasil init
      shadcn, diarahkan ke `--font-geist-sans`
- [x] `components/app-shell.tsx` — sidebar collapsible desktop + bottom tab
      bar mobile + dropdown user menu (avatar, sign out) → dipakai di
      `app/(app)/layout.tsx` (route group baru, tidak mengubah URL)
- [x] Pindahkan `dashboard`, `expenses`, `budget`, `reports`, `settings`,
      `admin` ke `app/(app)/` supaya berbagi satu shell layout
- [x] Redesign semua halaman pakai komponen shadcn (Card, Button, Input,
      Select, Dialog, Accordion, Badge, Progress, Skeleton, Avatar,
      DropdownMenu) — form tambah expense dipindah ke Dialog, daftar user
      admin dipindah ke Accordion, dashboard pakai stat cards + progress bar
- [x] Fix `next.config.ts`/`package.json`/dependencies yang sempat
      ke-revert tidak sengaja saat re-init shadcn (`git checkout` terlalu
      luas) — mongoose/next-auth/bcryptjs/recharts di-install ulang, nama
      package dikembalikan ke `pundi`
- [x] Regenerasi `.next/types` (`next typegen`) setelah pindah halaman ke
      route group — `RouteContext` sempat error karena cache lama
- [x] Verifikasi visual: screenshot Playwright (instalasi sementara, sudah
      di-uninstall) di viewport desktop (1280px) & mobile (390px) untuk
      dashboard, expenses, budget, settings, admin, reports — semua render
      benar, tidak ada console error, sidebar/bottom-nav berfungsi
- [x] Production build & lint bersih setelah semua perubahan

## Fase 10b — UI Polish Round 2 (bold fintech style)

Feedback user: hasil Fase 10 dinilai "masih terlalu simple". Preferensi
gaya dikonfirmasi: **fintech modern & bold** (referensi Jago/Livin/Wise) —
warna lebih hidup, gradient, shadow lembut, elemen visual pendukung.

- [x] `components/gradient-blobs.tsx` — dekorasi blob blur gradient emerald,
      dipakai di login & dashboard hero
- [x] `components/icon-chip.tsx` — badge ikon berwarna reusable (emerald/
      amber/blue/violet/rose/orange) dipakai di card headers seluruh app
      untuk variasi visual
- [x] Soft shadow global di komponen `Card` (`components/ui/card.tsx`) —
      radius diperbesar (`rounded-2xl`), shadow custom lembut menggantikan
      ring polos
- [x] Dashboard: hero card gradient emerald→teal menampilkan Total Bersih
      besar + breakdown income/alokasi + CTA button, greeting dinamis
      (pagi/siang/sore/malam), icon chip berwarna di tiap card ringkasan
- [x] Login: background gradient + blob dekoratif, logo mark gradient
      dengan shadow berwarna
- [x] AppShell: logo & avatar pakai gradient emerald→teal, nav item aktif
      (sidebar & bottom tab) pakai background gradient/pill berwarna,
      bukan cuma teks berwarna
- [x] Budget: card ringkasan total diubah jadi hero gradient (konsisten
      dengan dashboard)
- [x] Bug fix: `CardHeader` base komponen shadcn pakai `display:grid`,
      override `flex-row` saja tidak cukup mengubah `display` (icon chip
      sempat ke-stack vertikal alih-alih sejajar horizontal) — perbaikan:
      eksplisit `flex flex-row` di semua header yang dikustomisasi
- [x] Verifikasi visual ulang (Playwright, instalasi sementara) — icon
      chip sejajar dengan benar, gradient render sesuai, tidak ada
      console error, build & lint bersih

## Fase 10c — UI Polish Round 3 (samakan level Expenses/Budget/Settings/Admin)

Feedback user: Dashboard & Reports sudah bagus, tapi Expenses/Budget/
Settings/Admin masih terasa polos dibanding dua halaman itu. Disamakan
level treatment-nya (gradient hero, icon chip, progress bar mini).

- [x] Expenses — 2 stat card gradient di atas (Hari Ini oranye, Bulan Ini
      biru/indigo), card per-tanggal dengan header band abu-abu + badge
      angka tanggal gradient emerald + total harian, item list pakai
      `IconChip`, tombol "Tambah" & submit dialog gradient emerald→teal
- [x] Budget — badge status "Draft"/"Tersimpan" di judul, month-picker
      dibungkus kotak dengan ikon, tiap baris income/alokasi jadi card
      (bg-muted/30, border, rounded-xl) dengan dot warna per tipe alokasi
      + mini progress bar proporsi terhadap total income, tombol simpan
      gradient
- [x] Settings — card "Jatah Makan per Hari" diubah jadi hero gradient
      oranye (angka besar, konsisten gaya hero dashboard), list kategori
      income/alokasi diubah dari `<ul>` polos jadi row card individual
      (bg-muted/30, hover state)
- [x] Admin — tiap user jadi `Card` terpisah (bukan satu card berisi
      accordion polos), avatar gradient + mini progress bar horizontal
      langsung terlihat di trigger (tanpa harus expand), form tambah
      anggota dapat icon chip + tombol gradient
- [x] Verifikasi visual ulang (Playwright, instalasi sementara) — semua
      4 halaman + versi mobile Expenses, tidak ada console error, build
      & lint bersih

## Fase 10d — Sizing & Currency Input

Feedback user: tombol "Simpan" di Budget kekecilan, form "Tambah Anggota
Baru" input & button-nya juga kekecilan — perlu di-adjust global. Selain
itu, input nominal di Budget perlu format uang biar gampang dibaca/diisi.

- [x] Perbesar ukuran default `Button`/`Input`/`Select` di
      `components/ui/*` (bukan cuma di halaman tertentu) — default button
      `h-8→h-10`, input `h-8→h-10`, varian `sm`/`lg`/`icon-*` ikut naik
      proporsional. Efeknya otomatis ke semua halaman tanpa perlu
      sentuh satu-satu
- [x] `components/currency-input.tsx` — input nominal dengan prefix "Rp"
      dan pemisah ribuan otomatis (`Intl.NumberFormat("id-ID")`), murni
      derived dari prop (tanpa `useState`/`useEffect`, hindari lint
      `set-state-in-effect` yang sama seperti sebelumnya) — dipasang di
      semua input nominal: Budget (income & alokasi), Settings (jatah
      makan/hari), Expenses (jumlah pengeluaran)
- [x] Tombol CTA utama (`Simpan Budget`, `Buat Anggota`, `Update` jatah
      makan, `Simpan Pengeluaran`, `Masuk` login) eksplisit `size="lg"`
      untuk penekanan ekstra di atas kenaikan ukuran default
- [x] Verifikasi: ngetik langsung di browser (Playwright) — format
      "Rp 12.345.678" muncul real-time saat mengetik dan total ikut
      ter-update live; build & lint bersih
- [x] Bug fix: tombol "Update" di card Jatah Makan sempat pakai
      `size="lg"` (h-12) berdampingan dengan `CurrencyInput` yang masih
      `h-10` default → tidak simetris karena flex container tanpa
      `items-center` (default `align-items: stretch`). Perbaikan: `size="lg"`
      dilepas dari tombol-tombol inline (dipertahankan hanya untuk CTA
      full-width berdiri sendiri), dan `items-center` ditambahkan ke semua
      form inline input+button di Settings

## Fase 10e — Dashboard Enrichment

Feedback user: dashboard dinilai masih terlalu simple. Ditambahkan elemen
visual & data baru supaya lebih informatif dan hidup.

- [x] `lib/dashboardSummary.ts` — tambah `recentExpenses` (5 transaksi
      terakhir bulan berjalan, di-sort by tanggal & waktu input)
- [x] `components/radial-progress.tsx` — ring progress SVG murni (tanpa
      dependency chart), dipakai di hero card menampilkan persentase
      alokasi bulanan yang sudah terpakai
- [x] Hero card: wallet icon diganti radial ring (% terpakai) sebagai
      centerpiece visual
- [x] Card "Hari Ini"/"Minggu"/"Bulan Ini" diberi tint background warna
      (amber-50/blue-50/violet-50) sesuai warna icon chip masing-masing,
      bukan putih polos semua
- [x] Card baru "Pengeluaran Terakhir" — daftar 5 transaksi terbaru
      dengan icon kategori, tanggal relatif ("Hari ini"/"Kemarin"), dan
      link "Lihat Semua" ke `/expenses`
- [x] Bug fix (recurring): header "Pengeluaran Terakhir" pakai
      `flex-row` tanpa `flex` lagi (bug yang sama seperti sebelumnya,
      base `CardHeader` adalah `display:grid`) — di-grep seluruh
      codebase untuk pastikan tidak ada instance lain yang sama
- [x] Verifikasi visual desktop & mobile (Playwright, instalasi
      sementara) — tidak ada console error, build & lint bersih

## Fase 10f — Dashboard Polish (simetri & warna card)

Feedback user dari screenshot: (1) hero card kurang simetris — ring cuma
di baris atas, menyisakan ruang kosong besar di kanan-bawah; (2) card
Hari Ini/Minggu/Bulan Ini masih simple dan background pastel-nya
tidak cocok.

- [x] Hero card — restrukturisasi jadi flex row (`sm:flex-row
      sm:items-center`): kolom kiri (balance, income/alokasi, tombol)
      dan ring di kanan sekarang center secara vertikal terhadap
      seluruh tinggi konten, bukan cuma nempel di baris atas
- [x] Card Hari Ini/Minggu/Bulan Ini — background pastel (amber-50/
      blue-50/violet-50) dilepas, diganti card putih polos dengan
      **aksen border-top 4px berwarna** (amber/blue/violet) + **badge
      persentase** (mis. "30%") di pojok kanan atas header sebagai
      indikator cepat seberapa besar budget periode itu sudah terpakai
- [x] Verifikasi visual desktop & mobile (Playwright, instalasi
      sementara) — simetris terkonfirmasi, tidak ada console error,
      build & lint bersih

## v2 — Belum Masuk Scope Sekarang

- [ ] Tracking realisasi "Invested" vs rencana alokasi Invest
- [ ] Import mutasi bank / CSV
- [ ] Multi-currency

## Fase 10g — Konsistensi Konten Card Periode Dashboard

Permintaan user: sesuaikan lagi konten card Hari Ini/Minggu/Bulan Ini.
Sebelumnya tidak konsisten — "Hari Ini" tidak punya target untuk
Lain-lain (cuma angka mentah) dan tidak ada baris Total, beda dari
"Bulan Ini" yang sudah lengkap.

- [x] `lib/dashboardSummary.ts` — tambah `lainLainTarget` (jatah harian
      proporsional dari `totalBersih / jumlah_hari_bulan`) dan
      `totalActual`/`totalTarget`/`melenceng` yang konsisten di ketiga
      periode (`today`, `week`, `monthSummary`) — sebelumnya cuma
      `monthSummary` yang punya field ini
- [x] `app/(app)/dashboard/page.tsx` — extract komponen `PeriodCard`
      reusable (title, icon, accent color, badge %, Makan, Lain-lain,
      Total + status) supaya ketiga card struktural identik, tidak lagi
      3 blok JSX terduplikasi dengan bentuk berbeda-beda
- [x] Sekarang ketiga card (Hari Ini/Minggu/Bulan) punya bentuk konten
      yang sama persis: Makan (aktual/target + sisa), Lain-lain
      (aktual/target + sisa), Total (aktual/target) + badge status
- [x] Verifikasi angka & visual (Playwright, instalasi sementara) —
      total per periode konsisten dengan penjumlahan makan+lain-lain,
      tidak ada console error, build & lint bersih

## Fase 11 — Import Data Riil 2025 (akun admin@pundi.test)

Permintaan user: bersihkan data test yang ada, isi dengan data keuangan
riil 2025 (tabel tahunan income/alokasi + rincian mingguan pengeluaran
makan/lain-lain per bulan) supaya bisa lihat tampilan app dengan data
sungguhan.

- [x] `scripts/import-2025-data.mts` — script sekali-pakai: wipe seluruh
      data lama user admin (kategori, monthly budget, expense, daily
      budget setting), lalu insert data 2025 baru
- [x] Kategori income: RDS Group/Phincon, Freelance, Lainya
- [x] Kategori alokasi: Makan (70k/Hari, type food), TF Ibu, TF Bapak,
      Kosan (semua type fixed), Invest (type invest)
- [x] `DailyBudgetSetting` = Rp70.000/hari, efektif 1 Jan 2025
- [x] 12 `MonthlyBudget` (Jan-Des 2025) dengan income & alokasi sesuai
      tabel tahunan yang diberikan user
- [x] ~111 `Expense` — data mingguan (bukan harian) dari tabel rincian
      per bulan diagregasi per minggu (Makan + Lain-lain terpisah),
      ditanggali pada representative day di dalam range minggu yang
      sama persis dengan definisi minggu aplikasi sendiri
      (`lib/monthlyBudget.ts` `daysInMonth`/week bucket: hari 1-7, 8-14,
      15-21, 22-28, 29-31) — supaya rollup mingguan & bulanan otomatis
      benar tanpa perlu tanggal harian presisi
- [x] Data setiap minggu divalidasi dengan menjumlahkan manual sel-sel
      Makan/Lain-lain lalu dicocokkan ke kolom "Total Pengeluaran" per
      baris di tabel sumber — proses ini menemukan bahwa baris "minggu
      ke-5" di September dan Oktober **tidak termasuk** dalam Total
      Pengeluaran resmi bulan tsb (validasi ketahuan tidak cocok kalau
      diikutkan) → sengaja dikecualikan dari import
      Kasus khusus Februari: minggu ke-5 pada sumber (492.000) digabung
      ke rentang minggu-4 aplikasi (hari 22-28) karena Februari cuma
      28 hari sehingga tidak ada slot "minggu ke-5" di definisi aplikasi
- [x] Verifikasi otomatis di script: agregasi MongoDB per bulan
      dibandingkan ke 12 angka "Total Pengeluaran" resmi dari sumber —
      **semua 12 bulan cocok persis (OK)**
- [x] Verifikasi manual tambahan: Total Pemasukan tahunan (269.325.800),
      Total Kotor alokasi (191.380.581), dan Total Bersih tahunan
      (77.945.219) dihitung ulang dari array yang di-import — cocok
      persis dengan tabel sumber
- [x] Verifikasi visual (Playwright, instalasi sementara): halaman
      Budget bulan Juli 2025 menampilkan Total Bersih Rp10.087.000
      (cocok dengan kolom Juli di tabel "Total Bersih" sumber), chart
      Reports tahun 2025 menunjukkan pola yang mirip dengan grafik
      referensi Excel awal user (lonjakan April dll), halaman Expenses
      render 111 entri tanpa error

## Fase 12 — Filter Tahun di Reports (Select Dropdown)

Permintaan user: chart "Pengeluaran Bulanan" di Reports pakai input
angka bebas untuk tahun — diganti jadi dropdown select dengan opsi
tahun tetap agar lebih mudah dipakai.

- [x] `app/(app)/reports/page.tsx` — input number tahun diganti
      `Select` dengan opsi dinamis `[currentYear-4 .. currentYear]`
      (saat ini 2022-2026, otomatis bergeser tiap tahun karena
      dihitung dari `new Date().getFullYear()`, bukan di-hardcode)
- [x] Verifikasi visual (Playwright, instalasi sementara) — dropdown
      menampilkan 2022-2026, memilih 2025 langsung meng-update chart
      "Pengeluaran Bulanan 2025" dan "Pengeluaran Makan Bulanan 2025"
      dengan benar, tidak ada console error, build & lint bersih

## Fase 13 — Dashboard: Navigasi Bulan/Tahun & Rincian Semua Minggu

Masalah yang diperbaiki:
1. Dashboard terkunci ke bulan berjalan — tidak bisa lihat data bulan
   atau tahun sebelumnya (mis. data 2025 hasil impor Fase 11 tidak bisa
   dilihat dari Dashboard, cuma dari Budget/Reports)
2. Cuma menampilkan 1 card "Minggu ke-N" (minggu tempat tanggal hari
   ini berada) — minggu-minggu lain dalam bulan yang sama tidak terlihat

- [x] Convert `app/(app)/dashboard/page.tsx` dari Server Component jadi
      Client Component (`useSession` dari `next-auth/react` untuk nama
      user, `useState`/`useEffect` untuk fetch data) — pola sama seperti
      `/budget` dan `/reports`
- [x] `app/api/dashboard-summary/route.ts` — API baru yang membungkus
      `getDashboardSummary`, terima `?month=YYYY-MM`; kalau bulan yang
      diminta = bulan berjalan pakai `new Date()` asli sebagai
      `referenceDate` (supaya "hari ini" tetap akurat), kalau bulan lain
      pakai tanggal 1 bulan tsb
- [x] Month picker (`<input type="month">`) di header Dashboard, default
      ke bulan berjalan, bebas pilih tahun mana pun lewat native picker
- [x] `lib/dashboardSummary.ts`:
  - [x] `today` sekarang `null` kalau bulan yang dipilih bukan bulan
        berjalan (`isCurrentMonth` dihitung & dikembalikan di response)
      — dulu selalu dihitung meski tidak relevan untuk bulan lampau
  - [x] `week` (tunggal) diganti `weeks` (array) — loop semua minggu
        1..N dalam bulan (N dari `Math.ceil(daysInMonth/7)`, 4 atau 5),
        tiap minggu juga bawa `startDay`/`endDay` untuk label rentang
        tanggal di UI (mis. "Minggu ke-1 (1-7)")
  - [x] Hero card & radial ring sudah tidak terikat tanggal hari ini
        secara struktural — hanya terima `referenceDate` dari parameter
- [x] UI: card "Hari Ini" cuma dirender kalau `summary.today` tidak null;
      1 card "Minggu ke-N" diganti section "Rincian Mingguan" — grid
      berisi `PeriodCard` untuk tiap minggu dalam bulan yang dipilih
- [x] Judul card bulanan & hero card jadi dinamis (`formatMonthLabel`,
      mis. "Juli 2025") mengikuti bulan yang dipilih, bukan hardcode
      "Bulan Ini"/"Total Bersih Bulan Ini"
- [x] "Pengeluaran Terakhir" otomatis ikut bulan yang dipilih karena
      `recentExpenses` di `dashboardSummary` sudah di-scope ke `month`
      yang diterima endpoint
- [x] Loading state pakai `Skeleton` saat fetch (termasuk saat ganti
      bulan)
- [x] Verifikasi visual (Playwright, instalasi sementara) di 3 kondisi:
      - Bulan berjalan (Juli 2026, belum ada data) — card "Hari Ini"
        tampil, 5 minggu ter-render dengan rentang tanggal benar
      - Juli 2025 (data hasil impor) — card "Hari Ini" otomatis hilang,
        teks berubah jadi "Menampilkan data bulan lampau", Total
        Rp10.919.950/Rp12.257.000 cocok persis dengan tabel sumber,
        recent expenses menampilkan transaksi Juli 2025 yang benar
      - Januari 2025 — 5 minggu dengan rentang tanggal 1-7...29-31,
        badge "Melenceng" muncul dengan benar (Total Rp7.338.500 >
        Target Rp6.850.000, sesuai data sumber)
      - Tidak ada console error di ketiga kondisi, build & lint bersih

## Fase 14 — Dashboard: Versi Tahunan

Permintaan user: versi bulanan Dashboard (Fase 13) sudah bagus, tapi
perlu versi tahunan juga untuk lihat pola setahun sekaligus. Desain
disepakati lewat diskusi singkat sebelum implementasi: toggle
"Bulanan/Tahunan" + list 12 bulan ringkas (bukan 12 card besar, supaya
tidak kepanjangan dan lebih scannable).

- [x] `lib/dashboardSummary.ts` — `getYearlyDashboardSummary(userId, year)`:
      loop 12 bulan, reuse `getMonthlyBudgetOrDraft` (untuk income/alokasi)
      dan `getMonthlyReportData` dari `lib/reports.ts` (untuk totalActual/
      totalTarget per bulan, sudah ada dari Fase 7) — tidak duplikasi
      logika kalkulasi, murni agregasi dari fungsi yang sudah ada
- [x] `app/api/dashboard-summary-yearly/route.ts` — endpoint baru
      `GET ?year=YYYY`
- [x] `app/(app)/dashboard/page.tsx`:
      - [x] Tambah `Tabs` (shadcn) "Bulanan"/"Tahunan" di header, di
            sebelah picker
      - [x] Mode Tahunan: picker berubah jadi `Select` tahun (reuse pola
            `YEAR_OPTIONS` dari Reports, 2022-2026 dinamis)
      - [x] Extract `HeroCard` jadi komponen terpisah (dipakai bareng
            oleh tampilan bulanan & tahunan) — hero tahunan menampilkan
            Total Bersih/Income/Alokasi setahun + radial ring rata-rata
            terpakai setahun
      - [x] Section baru "Rincian per Bulan" — list 12 baris (bukan
            card), tiap baris: nama bulan, `total aktual / target`,
            badge status, progress bar tipis — konsisten dengan gaya
            list "Pengeluaran Terakhir" yang sudah ada, bukan card besar
            berulang
      - [x] State `mode`/`month`/`year` dipisah supaya pindah tab tidak
            kehilangan pilihan bulan/tahun sebelumnya
- [x] Verifikasi visual (Playwright, instalasi sementara): toggle ke
      Tahunan 2025 menampilkan Total Bersih Rp77.945.219 (cocok persis
      dengan validasi Fase 11), Income Rp269.325.800, Alokasi
      Rp191.380.581; ke-12 baris bulan menunjukkan status
      "Melenceng"/"Sesuai" yang seluruhnya cocok dengan kolom "Sisa" di
      tabel sumber; toggle balik ke Bulanan mempertahankan bulan yang
      sebelumnya dipilih; tidak ada console error, build & lint bersih

## Fase 15 — Breakdown Makan/Lain-lain di Rincian per Bulan (Tahunan)

Feedback user: baris bulan di "Rincian per Bulan" cuma nampilin Total,
tidak kelihatan berapa habis buat Makan vs Lain-lain.

- [x] `lib/dashboardSummary.ts` — refactor: logika breakdown per-bulan
      (income/alokasi dari budget, makan/lain-lain aktual & target)
      diekstrak jadi fungsi private `getMonthBreakdown()`, dipakai
      bareng oleh `getDashboardSummary()` (versi bulanan) dan
      `getYearlyDashboardSummary()` (versi tahunan) — sebelumnya versi
      tahunan pakai `getMonthlyReportData` dari `lib/reports.ts` yang
      cuma punya total gabungan, tidak split kategori
- [x] `getYearlyDashboardSummary()` sekarang mengembalikan
      `makanActual`/`lainLainActual`/`makanBudget`/`lainLainBudget` per
      bulan, bukan cuma `totalActual`/`totalTarget`
- [x] UI baris bulan di `YearlyDashboard`: tambah baris kedua kecil
      menampilkan "Makan: Rp X / Rp Y" dan "Lain-lain: Rp X / Rp Y"
      dengan icon, di atas progress bar Total
- [x] Verifikasi (Playwright, instalasi sementara): Makan Januari 2025
      Rp2.171.400 cocok dengan hasil parsing data sumber di Fase 11
      (penjumlahan makan mingguan), Lain-lain Rp5.167.100 = Total
      7.338.500 − Makan 2.171.400, tidak ada console error, build & lint
      bersih

## Fase 16 — Progress Bar Terpisah Makan vs Lain-lain (Tahunan)

Tujuan user: mau tahu kategori mana yang sering melenceng — Makan atau
Lain-lain — jadi 1 progress bar gabungan per bulan diganti 2 bar
terpisah, masing-masing dengan status over/under sendiri.

- [x] Baris bulan di `YearlyDashboard` — 1 `Progress` (Total) diganti 2
      `Progress` terpisah: Makan (aktual vs `makanBudget`) dan Lain-lain
      (aktual vs `lainLainBudget`), masing-masing merah kalau kategori
      itu sendiri melebihi targetnya, hijau kalau tidak — independen
      dari status Total (badge "Melenceng"/"Sesuai" di header baris
      tetap berdasarkan Total gabungan)
- [x] Verifikasi visual (Playwright, instalasi sementara) tahun 2025:
      pola langsung terlihat — Lain-lain melenceng di 8 dari 12 bulan,
      Makan cuma di 4 bulan (Jan, Jul, Nov, Des) — sesuai tujuan user
      untuk identifikasi kategori mana yang lebih sering over budget;
      tidak ada console error, build & lint bersih

## Fase 17 — Jarak Antar Baris Bulan (Tahunan)

Feedback user: baris tiap bulan di "Rincian per Bulan" kelihatan
berdempetan setelah ditambah 2 progress bar.

- [x] Padding baris `<li>` diperbesar (`py-3` → `py-5`), jarak header ke
      bar pertama (`mb-2` → `mb-3`), jarak antar 2 bar Makan/Lain-lain
      (`space-y-2` → `space-y-3`), jarak label ke bar masing-masing
      (`mb-1` → `mb-1.5`)
- [x] Verifikasi visual (Playwright, instalasi sementara) — tiap bulan
      sekarang jelas terpisah, tidak ada console error, build & lint
      bersih

## Fase 18 — Admin Lihat Dashboard per Anggota

Feedback user: dashboard (bulanan + tahunan lengkap dengan rincian
mingguan/bulanan) sebelumnya hanya bisa dilihat untuk akun sendiri;
admin ingin bisa melihat dashboard lengkap milik anggota tertentu
(mis. adiknya), bukan cuma ringkasan singkat di `/admin`.

- [x] `GET /api/dashboard-summary` & `GET /api/dashboard-summary-yearly`
      menerima parameter opsional `userId`; kalau diisi dan berbeda dari
      user yang login, wajib `role === "admin"` (403 kalau bukan), lalu
      dipakai sebagai target `getDashboardSummary`/
      `getYearlyDashboardSummary`
- [x] Endpoint baru `GET /api/admin/members` (admin only) — hanya
      `id/name/role`, tanpa menghitung summary tiap anggota (ringan,
      dipakai buat isi dropdown, beda dari `/api/admin/users` yang
      menghitung summary lengkap tiap user)
- [x] `/dashboard` (`app/(app)/dashboard/page.tsx`): tambah dropdown
      pemilihan anggota di header (ikon Users), hanya tampil untuk
      admin; state `selectedUserId` di-seed dari query string
      `?userId=` lewat `useSearchParams` (komponen dibungkus
      `<Suspense>` — wajib untuk production build sesuai dok
      `use-search-params.md`); judul & greeting menyesuaikan
      ("Ringkasan Juli 2026 — Member Test" / "Menampilkan dashboard
      Member Test")
- [x] `/admin`: tiap card anggota dapat tombol "Lihat Dashboard
      Lengkap" yang mengarah ke `/dashboard?userId=<id>`
- [x] Verifikasi: tsc & eslint bersih; Playwright (instalasi sementara)
      — login admin → buka `/admin` → klik tombol pada salah satu
      anggota → dashboard lengkap anggota tsb terbuka dengan judul,
      data, dan mode Bulanan/Tahunan yang benar; dropdown anggota di
      `/dashboard` bisa dipakai langsung untuk berpindah kembali ke
      "Saya"; `pnpm build` sukses, route `/dashboard` &
      `/api/admin/members` muncul di output

## Fase 19 — Index Database, Pagination Bulanan di Expenses, Fix Header Day-Card

Permintaan user: tambah index database (persiapan skala data multi-tahun),
pagination di halaman Pengeluaran (list makin panjang seiring waktu), dan
perbaikan visual — ada celah/beda warna di bagian atas card tanggal pada
list Pengeluaran.

- [x] Index MongoDB ditambahkan sesuai pola query yang benar-benar dipakai:
      - `expenses`: `{ userId: 1, date: -1 }` — dipakai `/api/expenses`
        (filter `month`/`from`/`to`) & agregasi dashboard/report
      - `dailybudgetsettings`: `{ userId: 1, effectiveFrom: -1 }` — cocok
        `find({ userId, effectiveFrom: { $lte } }).sort({ effectiveFrom: -1 })`
      - `incomecategories`, `allocationcategories`: `{ userId: 1 }`
      - `monthlyBudgets` sudah punya index unik `{ userId, month }` dari
        Fase 4, tidak perlu diubah
      - Index dideklarasikan di level schema (`schema.index(...)` di tiap
        `models/*.ts`) supaya otomatis ter-sync tiap kali aplikasi jalan;
        untuk data yang sudah ada di Atlas, index dibuat manual sekali via
        script sementara (langsung `createIndex` ke collection) karena
        koneksi mongoose yang sudah lama hidup di proses `next dev`
        sebelumnya tidak me-refresh index dari perubahan schema —
        dev server di-restart supaya koneksi baru ikut sinkron
- [x] `/api/expenses` — tambah parameter `?month=YYYY-MM` (filter
      `$gte`/`$lte` awal-akhir bulan), `from`/`to` tetap didukung sebagai
      fallback
- [x] `/expenses` diubah dari "load semua riwayat sekaligus" jadi
      navigasi per bulan (`<input type="month">` di header, default bulan
      berjalan) — pola yang sama dengan Dashboard/Budget/Reports, supaya
      query selalu terbatas per bulan (memanfaatkan index baru) alih-alih
      unbounded list yang makin berat tiap tahun berjalan
      - [x] Kartu statistik menyesuaikan: bulan berjalan → "Hari Ini" +
            "Total <Bulan>"; bulan lain → "Jumlah Transaksi" + "Total
            <Bulan>" (kartu "Hari Ini" tidak relevan untuk bulan lampau)
      - [x] Submit pengeluaran baru: kalau tanggal yang diisi beda bulan
            dari bulan yang sedang dilihat, otomatis pindah tampilan ke
            bulan tsb supaya entri baru langsung kelihatan
      - [x] Empty state & pesan kosong menyebutkan nama bulan yang dipilih
- [x] Bug fix: card tanggal di list Pengeluaran punya celah putih polos
      di atas header abu-abu (`bg-muted/40`) — root cause: komponen `Card`
      punya padding `py-4` bawaan sementara header custom-nya ditempel
      sebagai children langsung (bukan lewat `CardHeader`), sama seperti
      bug yang pernah diperbaiki di Admin (Fase 10c). Fix: `py-0` pada
      `Card` pembungkus tiap grup tanggal
- [x] Verifikasi: tsc & eslint bersih; Playwright (instalasi sementara) —
      bulan berjalan (kosong) menampilkan "Hari Ini"/"Total Juli 2026"
      Rp0 dan empty state yang benar; pindah ke Desember 2025 (data impor)
      menampilkan 10 transaksi/Rp10.036.800, tiap card tanggal rapat tanpa
      celah warna; index terverifikasi langsung ke MongoDB Atlas (`db.
      collection(...).indexes()`); tidak ada console error; `pnpm build`
      sukses

## Fase 20 — Realisasi Investasi vs Rencana

Permintaan user: lanjutkan item v2 "Tracking realisasi investasi". Scope
dipersempit lewat AskUserQuestion — dipilih opsi paling sederhana:
1 angka realisasi per kategori alokasi bertipe `invest`, dibandingkan ke
rencana yang sudah ada di Budget (bukan transaksi individual atau
portfolio/return tracking — di luar tujuan app ini).

- [x] `models/MonthlyBudget.ts` — `budgetLineSchema` (dipakai bareng oleh
      `incomes[]` & `allocations[]`) dapat field baru `realized` (default
      0). Cuma bermakna untuk baris alokasi bertipe `invest`; diabaikan di
      baris income & tipe alokasi lain
- [x] `lib/monthlyBudget.ts` — draft bulan baru selalu set `realized: 0`
      (tidak di-carry-forward dari bulan sebelumnya seperti `amount`/
      rencana, karena ini angka aktual bulan berjalan, bukan rencana)
- [x] `/budget` — baris alokasi bertipe Investasi dapat sub-baris
      "Realisasi" (CurrencyInput terpisah dari input rencana) + badge
      "Sesuai rencana"/"Kurang Rp X" (hijau/amber tergantung realisasi ≥
      rencana atau tidak)
- [x] Card baru "Realisasi Investasi" (muncul cuma kalau user punya ≥1
      kategori bertipe invest) — total realisasi vs total rencana across
      semua kategori invest, dengan mini progress bar
- [x] Bug ditemukan & diperbaiki saat verifikasi: field `realized` baru
      tidak ter-persist ke MongoDB setelah simpan (reload halaman balik
      ke 0) — root cause: proses `next dev` yang sudah lama hidup masih
      pegang compiled Mongoose model versi lama (sebelum field `realized`
      ditambahkan) lewat cache global `mongoose.models`, jadi Mongoose
      strict-mode diam-diam membuang field yang tidak dikenal saat
      `findOneAndUpdate`. Fix: restart dev server (pola yang sama seperti
      isu index di Fase 19) — dicatat sebagai hal yang perlu diingat
      setiap kali mengubah schema Mongoose di tengah sesi dev yang panjang
- [x] Verifikasi (Playwright, instalasi sementara): isi Realisasi
      Rp1.500.000 di kategori Invest → simpan → reload halaman → nilai
      tetap Rp1.500.000 (persist terkonfirmasi setelah restart dev
      server); pindah ke bulan baru (draft, belum pernah disimpan) →
      Realisasi balik ke Rp0 sementara rencana tetap carry-forward seperti
      biasa; tidak ada console error; `pnpm build` sukses
- [x] `docs/SYSTEM.md` v2 backlog — item "Tracking realisasi investasi"
      dipindah dari daftar belum-dikerjakan (item lain di backlog v2
      belum disentuh: import mutasi bank/CSV, multi-currency)

## Fase 21 — Toast Notifikasi Simpan/Hapus/Tambah

Feedback user: tombol "Simpan" (dan aksi lain) tidak kasih notifikasi apa
pun kalau berhasil — tidak jelas apakah aksinya kena atau tidak. Didiskusikan
pilihan toast vs alternatif lain; dipilih **toast (sonner)** karena non-
blocking, tidak menggeser layout, dan `sonner` sudah ter-install sebagai
dependency shadcn (`components/ui/sonner.tsx`) tapi belum pernah dipasang.
Scope disetujui: semua halaman dengan aksi simpan/tambah/hapus, bukan cuma
Budget.

- [x] `app/layout.tsx` — pasang `<Toaster position="top-center" />` di root
      layout (sekali untuk seluruh app, termasuk `/login` kalau nanti perlu)
- [x] Budget — `handleSave`: toast sukses `"Budget <Bulan> tersimpan"` /
      toast error kalau `!res.ok` (sebelumnya tidak ada pengecekan `res.ok`
      sama sekali — sekaligus jadi perbaikan robustness, respons gagal
      sebelumnya diam-diam diperlakukan seperti sukses)
- [x] Settings — toast sukses/error di 5 aksi: tambah/hapus kategori
      income, tambah/hapus kategori alokasi, update jatah makan per hari
      (semuanya sebelumnya juga tidak cek `res.ok`, sekarang dicek)
- [x] Expenses — toast sukses/error saat tambah & hapus pengeluaran (pesan
      error dari API tetap ditampilkan inline di dialog seperti sebelumnya,
      toast jadi konfirmasi tambahan yang terlihat walau dialog sudah tertutup)
- [x] Admin — toast sukses saat berhasil membuat anggota baru (pesan error
      tetap inline di form seperti sebelumnya, tidak didobel dengan toast
      error supaya tidak ada 2 sumber pesan gagal yang sama)
- [x] Verifikasi: tsc & eslint bersih; Playwright (instalasi sementara,
      dev server di-restart dulu sebelum test — pelajaran dari Fase 19/20
      soal koneksi lama yang stale) — toast "Budget Juli 2026 tersimpan"
      muncul setelah klik Simpan Budget, toast tambah & hapus kategori
      income muncul dengan teks yang sesuai; tidak ada console error;
      `pnpm build` sukses

## Fase 22 — Favicon dari Logo Sidebar

Permintaan user: jadikan icon di sidebar (lingkaran gradient emerald→teal
dengan piggy bank putih) sebagai favicon.

- [x] `app/icon.svg` — file convention Next.js (`app/icon.(svg|png|...)`
      auto terdeteksi jadi `<link rel="icon">`), berisi SVG statis:
      lingkaran gradient emerald-500→teal-600 (sama seperti
      `bg-linear-to-br from-emerald-500 to-teal-600` yang dipakai di logo
      sidebar & login) + path ikon `piggy-bank` dari `lucide-react`
      disalin persis (stroke putih) supaya identik dengan logo di app,
      bukan diambil ulang dari gambar/API eksternal
- [x] Bug ditemukan & diperbaiki: `proxy.ts` (auth guard) meredirect
      SEMUA route non-API ke `/login` kecuali yang eksplisit di-exclude di
      `matcher` — sebelumnya cuma `favicon.ico` yang di-exclude, jadi
      route baru `/icon.svg` ikut ke-block dan browser gagal load favicon
      saat belum login (termasuk pas buka halaman `/login` itu sendiri).
      Fix: tambah `icon.svg` ke pengecualian regex matcher
- [x] Verifikasi: `curl /icon.svg` dari server tanpa cookie session →
      200 `image/svg+xml` (sebelumnya redirect 307 ke `/login`);
      `curl /login` menunjukkan 2 tag `<link rel="icon">` (favicon.ico +
      icon.svg, browser modern pakai svg); screenshot langsung ke
      `/icon.svg` (Playwright, instalasi sementara) menunjukkan hasil
      identik dengan logo sidebar; tsc, eslint, `pnpm build` bersih —
      route `/icon.svg` muncul sebagai static route di output build

## Fase 23 — Jarak Konten di Card Rincian (Dashboard Bulanan)

Feedback user (screenshot): card "Hari Ini"/"Bulan Ini"/"Rincian Mingguan"
terasa terlalu dempet — jarak antar baris Makan/Lain-lain/Total di dalam
tiap card kurang lega.

- [x] `SummaryRow` (dipakai di semua `PeriodCard`) — jarak internal
      label+nilai → progress bar → teks "sisa": `space-y-1.5` → `space-y-2`
- [x] `PeriodCard` `CardContent` — jarak antar 2 `SummaryRow` (Makan,
      Lain-lain) dan blok Total: `space-y-4` → `space-y-5`; blok Total
      sendiri: `pt-2 space-y-2` → `pt-3 space-y-2.5`
- [x] Grid "Rincian Mingguan" — jarak antar card: `gap-4` → `gap-5`
      (perubahan ini otomatis berlaku juga ke grid "Hari Ini"/bulan
      berjalan karena keduanya pakai komponen `PeriodCard` yang sama)
- [x] Verifikasi visual (Playwright, instalasi sementara) — jarak antar
      baris & antar card terlihat jelas lebih lega dibanding sebelumnya,
      tidak ada console error, tsc/eslint/`pnpm build` bersih

## Fase 24 — Judul Minggu di Card "Rincian Mingguan"

Feedback user (screenshot): judul card minggu ("Minggu ke-4 (22-28)")
membungkus jadi 2 baris karena rentang tanggalnya ikut nempel di judul —
diminta rentang tanggal dipindah ke bawah judul, ukuran lebih kecil.

- [x] `PeriodCard` — tambah prop opsional `subtitle`, dirender sebagai
      teks kecil (`text-xs text-muted-foreground`) di bawah `CardTitle`,
      bukan digabung dalam satu baris judul
- [x] Pemanggilan `PeriodCard` untuk tiap minggu: `title` sekarang cuma
      `"Minggu ke-N"`, rentang tanggal (`startDay-endDay`) dipindah ke
      prop `subtitle` baru
- [x] Verifikasi visual (Playwright, instalasi sementara) — judul
      "Minggu ke-4" & "22-28" sekarang di baris terpisah, tidak ada lagi
      wrapping 2 baris yang janggal, konsisten di ke-5 card minggu;
      tidak ada console error; tsc/eslint/`pnpm build` bersih

## Fase 25 — Tooltip Chart "Alokasi Penghasilan" Terpotong

Feedback user (screenshot): tooltip hover di chart stacked-bar "Alokasi
Penghasilan" (Reports) kepotong di bagian bawah, baris "Total Bersih"
tidak kelihatan penuh.

- [x] Root cause: base komponen `Card` (`components/ui/card.tsx`) punya
      `overflow-hidden` (buat jaga rounded corner). Tooltip default
      Recharts untuk chart ini (tinggi cuma 90px, tapi list isinya 6
      baris — 5 kategori alokasi + Total Bersih) jauh lebih tinggi dari
      area chart, jadi separuh bawahnya kepotong batas Card
- [x] Fix: `Card` pembungkus chart "Alokasi Penghasilan" di
      `app/(app)/reports/page.tsx` dapat tambahan class `overflow-visible`
      (override `overflow-hidden` lewat `tailwind-merge`, scoped ke card
      ini saja — card lain yang butuh clipping normal tidak terpengaruh)
- [x] Verifikasi visual (Playwright, instalasi sementara, hover di tengah
      bar via `mouse.move`) — tooltip sekarang tampil penuh 6 baris
      termasuk "Total Bersih : -Rp 12.170.000" tanpa terpotong; tidak ada
      console error; tsc/eslint/`pnpm build` bersih

## Fase 26 — Kelompokkan Sidebar Desktop per Fungsi

Feedback user: sidebar (desktop) masih bikin bingung — tidak jelas mana
menu buat input data, mana laporan, mana konfigurasi/setup.

- [x] `components/app-shell.tsx` — restrukturisasi `NAV_ITEMS` (flat)
      jadi `NAV_GROUPS` (array of `{label, items[]}`): Dashboard
      (tanpa label, item tunggal di atas), **Input** (Pengeluaran,
      Budget), **Laporan** (Reports), **Pengaturan** (Settings, Admin
      — admin only). `NAV_ITEMS` flat tetap ada (`= NAV_GROUPS.flatMap(...)`)
      supaya `MOBILE_NAV_ITEMS` dan bottom tab bar mobile tidak perlu
      diubah — perubahan ini scoped ke sidebar desktop saja sesuai
      permintaan user ("ketika desktop")
- [x] Render sidebar desktop: tiap grup dapat label section kecil
      (`text-[11px] uppercase tracking-wider text-muted-foreground/70`)
      di atas item-itemnya, group tanpa label (Dashboard) tidak dapat
      header. Filter admin-only tetap jalan per-grup (grup yang jadi
      kosong usai filter otomatis tidak dirender)
- [x] Mobile (bottom tab bar & dropdown menu di top bar) tidak diubah —
      tetap flat, sesuai lingkup keterbatasan ruang di layar kecil
- [x] Verifikasi: tsc, eslint, `pnpm build` bersih (verifikasi visual
      via screenshot dilewati mulai fase ini atas permintaan user —
      dicek manual langsung olehnya di browser)

## Fase 27 — Edit Kategori Income & Alokasi

Permintaan user: di Settings, kategori alokasi cuma bisa tambah/hapus,
tidak bisa ubah nama (label) yang sudah ada. Scope diperluas sekalian ke
Kategori Income lewat AskUserQuestion (konsisten, API PATCH untuk
keduanya sudah ada dari Fase 3, cuma belum dipakai di UI).

- [x] Pola inline-edit (bukan dialog terpisah) — klik ikon pensil di
      baris kategori → baris berubah jadi mode edit (Input nama +
      Select tipe khusus utk alokasi + tombol centang simpan/silang
      batal), Enter untuk simpan & Escape untuk batal
- [x] Kategori Income: `startEditIncomeCategory`/`handleSaveIncomeCategory`/
      `cancelEditIncomeCategory` — PATCH `/api/income-categories/[id]`
      (cuma field `name`)
- [x] Kategori Alokasi: `startEditAllocationCategory`/
      `handleSaveAllocationCategory`/`cancelEditAllocationCategory` — PATCH
      `/api/allocation-categories/[id]` (field `name` & `type`, termasuk
      bisa ganti tipe kategori langsung dari row edit)
- [x] Toast sukses/error dipasang di kedua alur edit, konsisten dengan
      pola Fase 21
- [x] Verifikasi: tsc, eslint, `pnpm build` bersih

## Fase 28 — Multi-Keluarga: Pendaftaran Admin Baru (Kepala Keluarga)

Permintaan user: halaman `/register` publik supaya orang bisa daftar
sendiri jadi admin ("kepala keluarga") tanpa perlu admin lain. Klarifikasi
penting lewat diskusi: "admin" di sini bukan super-admin global — tiap
admin yang daftar cuma boleh lihat/kelola anggota di keluarganya sendiri,
bukan seluruh user di database (beda dari model sebelumnya yang cuma ada
1 pool user datar tanpa pemisah).

Ini perubahan arsitektur — dari single-tenant (1 admin = lihat semua user)
jadi multi-tenant per keluarga. Rencana dikonfirmasi ke user sebelum
implementasi.

- [x] Model baru `models/Family.ts` (`name`, `timestamps`)
- [x] `models/User.ts` — tambah field wajib `familyId` (ref `Family`) +
      index `{ familyId: 1 }`
- [x] `lib/auth.ts` + `types/next-auth.d.ts` — `familyId` ikut dialirkan
      lewat `authorize()` → JWT callback → session callback, supaya
      tersedia di `session.user.familyId` di semua tempat yang butuh
- [x] `POST /api/register` (public, tidak butuh session) — bikin `Family`
      baru + `User` role `admin` dengan `familyId` ke family barusan
      dibuat; nama family di-derive otomatis `"Keluarga {nama admin}"`
      (tidak diminta dari user, biar form tetap ringkas)
- [x] `app/register/page.tsx` — halaman publik gaya sama dengan `/login`
      (gradient blob, logo Pundi), form Nama/Email/Password → submit ke
      `/api/register` lalu auto sign-in via `signIn("credentials")` dan
      redirect ke `/dashboard`
- [x] `app/login/page.tsx` — tambah link "Daftar sebagai kepala keluarga"
      ke `/register`
- [x] `proxy.ts` — `/register` ditambah ke `publicRoutes` (bisa diakses
      tanpa login, redirect ke `/dashboard` kalau sudah login)
- [x] **Penegakan batas keluarga di server** (bagian paling penting,
      bukan cuma soal UI):
      - `lib/session.ts` — helper baru `resolveAdminTargetUserId()`:
        dipakai bersama oleh `dashboard-summary` & `dashboard-summary-yearly`;
        kalau `?userId=` diisi beda dari user yang login, WAJIB query DB
        `UserModel.findOne({ _id, familyId: requestingUser.familyId })` —
        404 kalau target tidak ditemukan di keluarga yang sama (sebelumnya
        cuma cek `role === "admin"`, tidak pernah cek keluarga — celah ini
        sekarang tertutup)
      - `GET /api/admin/users` & `GET /api/admin/members` — query di-scope
        `find({ familyId: user.familyId })`, bukan `find()` (semua user)
      - `POST /api/admin/users` (buat member baru) — `familyId` SELALU
        diambil dari `user.familyId` yang login, tidak pernah dari body
        request, supaya admin tidak bisa menaruh user ke keluarga lain
- [x] `scripts/migrate-add-family.mts` — migrasi data lama: semua user
      yang belum punya `familyId` (data existing: `admin@pundi.test`,
      `member@pundi.test`) dikumpulkan jadi 1 `Family` baru ("Keluarga
      (migrasi awal)"), supaya relasi admin↔member yang sudah ada tetap
      utuh setelah upgrade skema
- [x] Verifikasi fungsional lewat curl (bukan screenshot, sesuai
      permintaan user untuk stop Playwright):
      - Migrasi: 2 user lama berhasil dapat `familyId` yang sama
      - Register admin baru ("Keluarga Kedua") → `/api/admin/members`
        cuma menampilkan 1 (dirinya sendiri), TIDAK melihat 2 user lama
      - Admin lama tetap cuma lihat 2 anggota keluarganya sendiri
        (tidak terganggu migrasi)
      - Admin lama coba akses dashboard admin baru lewat
        `?userId=<id admin baru>` → **404 "User tidak ditemukan"**
        (blokir lintas-keluarga terbukti jalan di server, bukan cuma UI)
      - Admin lama buat member baru → otomatis dapat `familyId` yang
        sama dengan pembuatnya, langsung muncul di daftar member-nya
      - Data uji coba dibersihkan lagi setelah verifikasi
      - tsc, eslint, `pnpm build` bersih — route `/register` &
        `/api/register` muncul di output build

## Fase 29 — Ganti Istilah "Kepala Keluarga" jadi Generik "Grup"

Feedback user: istilah "kepala keluarga" di alur pendaftaran (Fase 28)
terlalu spesifik keluarga — Pundi bisa saja dipakai untuk organisasi/tim,
bukan cuma keluarga.

- [x] `app/register/page.tsx` & `app/login/page.tsx` — copy diganti dari
      "kepala keluarga"/"Keluarga Baru" jadi "grup"/"Grup Baru" (netral,
      cocok keluarga maupun organisasi)
- [x] `app/api/register/route.ts` & `scripts/migrate-add-family.mts` —
      nama default `Family` yang di-generate otomatis diganti dari
      `"Keluarga {nama}"` jadi `"Grup {nama}"`
- [x] Record `Family` yang sudah kadung dibuat migrasi (Fase 28) di-rename
      langsung di database dari "Keluarga (migrasi awal)" jadi "Grup
      (migrasi awal)" supaya konsisten dengan penamaan baru
- [x] `docs/SYSTEM.md` §2 — penjelasan role & multi-tenant diperbarui
      pakai istilah "grup" konsisten (nama koleksi/model tetap `Family`
      di kode — cuma istilah yang user-facing yang diubah, tidak perlu
      rename model karena bukan sesuatu yang terlihat user)
- [x] Verifikasi: tsc, eslint, `pnpm build` bersih

## Fase 30 — Redesign Halaman /register: Copy & Value Proposition

Feedback user lanjutan: "grup" juga masih membingungkan — ganti jadi
"Daftar Akun" polos saja. Selain itu UI halaman register dinilai terlalu
simple, tidak menjelaskan keuntungan/manfaat daftar.

- [x] Copy: semua sebutan "grup"/"Grup Baru" di `/register` & `/login`
      dihapus, diganti "Daftar Akun" (judul) dan penjelasan perilaku
      tanpa perlu istilah khusus ("Kamu jadi admin dari akunmu sendiri
      — bisa tambah anggota lain nanti, dan cuma kamu yang bisa lihat
      semua datanya")
- [x] `app/api/register/route.ts` — nama `Family` yang di-generate tidak
      lagi diawali "Grup"/"Keluarga", cuma nama admin apa adanya (field
      ini murni label internal, tidak pernah ditampilkan di UI manapun)
- [x] Redesign `app/register/page.tsx` — split-screen di desktop
      (`lg:grid-cols-2`): panel kiri gradient emerald→teal berisi
      value proposition (headline + 4 poin manfaat dengan icon: atur
      alokasi bulanan, catat pengeluaran harian, laporan & grafik
      otomatis, tambah anggota lain), panel kanan form pendaftaran.
      Mobile: panel kiri disembunyikan, cuma logo + form (konsisten
      dengan gaya `/login` yang sudah ada)
- [x] `app/login/page.tsx` — link ke register diperbarui jadi "Daftar
      Akun", teks pengantar "Belum punya akun?"
- [x] Verifikasi: tsc, eslint, `pnpm build` bersih

## Fase 31 — Redesign Halaman /login (Konsistensi Visual dengan /register)

Feedback user: setelah `/register` di-redesign jadi split-screen, `/login`
jadi kerasa beda gaya (masih card polos di tengah) — diminta dibikin lebih
modern & estetik. Beda dari register, login tidak butuh copy "manfaat"
(user yang login sudah tahu kenapa dia di situ) — jadi cuma kerangka
visualnya yang disamakan, bukan konten marketing baru.

- [x] `app/login/page.tsx` — struktur split-screen `lg:grid-cols-2` sama
      seperti `/register`: panel kiri gradient emerald→teal, panel kanan
      form
- [x] Panel kiri: headline pendek ("Kelola keuangan, bukan drama
      bulanan") + **kartu mock statistik dekoratif** (glassmorphism,
      `bg-white/10 backdrop-blur`) berisi angka Total Bersih palsu +
      radial ring 62% (pakai ulang komponen `RadialProgress` yang sudah
      ada dari dashboard) — murni ilustratif untuk kasih gambaran produk
      tanpa perlu data asli/API call di halaman publik
- [x] Panel kanan: form login tetap sama fungsinya, cuma restyle
      (heading "Masuk" lebih besar, tanpa `Card` wrapper terpisah — form
      langsung di panel supaya lebih modern, bukan card-in-card)
- [x] Mobile: panel kiri disembunyikan (sama seperti `/register`), cuma
      logo + form
- [x] Verifikasi: tsc, eslint, `pnpm build` bersih

## Fase 32 — Onboarding Setelah Pendaftaran (Skippable, Multi-Step)

Masalah yang diperbaiki: admin yang baru daftar (Fase 28) langsung dilempar
ke `/dashboard` yang kosong total (belum ada kategori income/alokasi/jatah
makan) — tidak ada penjelasan harus mulai dari mana. Didiskusikan opsi
(redirect ke Settings / banner checklist di dashboard / wizard onboarding
terpisah) — user pilih wizard multi-step, dengan syarat **tidak wajib,
bisa dilewati kapan saja**.

- [x] `app/onboarding/page.tsx` — halaman baru (di luar route group
      `(app)/`, jadi tanpa sidebar/AppShell — mirip `/login`/`/register`),
      dilindungi proxy default (butuh login, tidak masuk `publicRoutes`)
- [x] 5 step (progress dots di atas, bisa Kembali/Lanjut):
      1. **Mulai** — intro singkat, jelaskan alurnya opsional
      2. **Sumber Pemasukan** — tambah kategori income + penjelasan
         kegunaannya (dijumlahkan jadi Total Income)
      3. **Jatah Makan per Hari** — isi nominal + penjelasan (dipakai
         hitung otomatis pos alokasi "Makan")
      4. **Pos Alokasi** — tambah kategori alokasi (nama+tipe) +
         penjelasan (dikurangi dari Income jadi Total Bersih)
      5. **Selesai** — tombol "Isi Budget Sekarang" (`/budget`) atau
         "Nanti Saja, ke Dashboard"
      Tiap step reuse endpoint yang sama persis dengan Settings
      (`/api/income-categories`, `/api/allocation-categories`,
      `/api/daily-budget-setting`) — data langsung tersimpan begitu
      user klik "Tambah"/"Simpan" per step, bukan ditunda sampai akhir,
      supaya tidak hilang kalau user skip di tengah jalan
- [x] Tombol **"Lewati onboarding"** selalu terlihat di header (kecuali
      di step terakhir) — klik langsung ke `/dashboard` kapan saja
- [x] `app/register/page.tsx` — redirect setelah daftar diubah dari
      `/dashboard` jadi `/onboarding`
- [x] Verifikasi fungsional lewat curl (bukan screenshot): register user
      baru → `/onboarding` bisa diakses (200) sesudah login, tidak bisa
      diakses tanpa login (307 ke `/login`); 3 endpoint yang dipakai tiap
      step (income-categories, daily-budget-setting, allocation-categories)
      dites langsung dengan session user baru — semua 201 Created; data
      uji coba dibersihkan lagi; tsc, eslint, `pnpm build` bersih — route
      `/onboarding` muncul di output build

## Fase 33 — Pesan Error Validasi Register Membingungkan

Bug dilaporkan user (screenshot): submit form `/register` dengan Nama &
Email terisi benar tapi tetap muncul error "Nama, email wajib diisi dan
password minimal 8 karakter" — kelihatan seperti Nama/Email ikut
bermasalah padahal sudah diisi.

- [x] Root cause: `POST /api/register` (dan pola yang sama persis di
      `POST /api/admin/users`) pakai 1 kondisi gabungan
      `if (!name || !email || password.length < 8)` dengan 1 pesan error
      statis yang menyebut ketiga syarat sekaligus — jadi selalu tampil
      utuh biarpun cuma 1 syarat yang gagal (di kasus user, password-nya
      cuma 7 karakter, Nama & Email sebenarnya valid)
- [x] Fix: pecah jadi 3 pengecekan terpisah dengan pesan spesifik per
      field ("Nama wajib diisi" / "Email wajib diisi" / "Password
      minimal 8 karakter") — diterapkan di `app/api/register/route.ts`
      dan `app/api/admin/users/route.ts` (bug yang sama, form "Tambah
      Anggota Baru" di halaman Admin)
- [x] Verifikasi lewat curl: password 7 karakter → `"Password minimal 8
      karakter"`; nama kosong → `"Nama wajib diisi"` (sebelumnya
      keduanya menghasilkan pesan gabungan yang sama); tsc, eslint,
      `pnpm build` bersih

## Fase 34 — Hapus Syarat Panjang Minimum Password

Permintaan user: hapus validasi "password minimal 8 karakter" di
`/register` dan form "Tambah Anggota Baru" (Admin).

- [x] `app/api/register/route.ts` & `app/api/admin/users/route.ts` —
      pengecekan `password.length < 8` dihapus, diganti `!password`
      (password tetap wajib diisi, tidak boleh string kosong — cuma
      syarat panjang minimumnya yang dihapus, bukan validasi password
      sama sekali, supaya akun tidak bisa dibuat tanpa password sama
      sekali lewat request API langsung)
- [x] Placeholder "Min 8 karakter" di input password `/register` dan
      form Admin dihapus (sudah tidak relevan)
- [x] Verifikasi lewat curl: password 7 karakter sekarang **berhasil**
      (201 Created, sebelumnya 400); password string kosong tetap
      ditolak (`"Password wajib diisi"`); data uji coba dibersihkan;
      tsc, eslint, `pnpm build` bersih

## Fase 35 — Redesign Visual Halaman /onboarding

Feedback user (screenshot): tampilan `/onboarding` kurang menarik — teks
mengambang rata-kiri di layar kosong tanpa ada card/kontainer pembatas,
beda jauh dengan `/login` & `/register` yang sudah di-redesign (Fase
30-31) dan punya struktur card + dekorasi.

- [x] Konten dibungkus `Card` (shadow, rounded-2xl — konsisten dengan
      komponen yang sama dipakai di seluruh app), bukan lagi teks polos
      langsung di atas background
- [x] Halaman di-center vertikal (`min-h-screen flex items-center
      justify-center`, sama seperti `/login`/`/register`) — sebelumnya
      cuma `py-10` dari atas, menyisakan banyak ruang kosong di bawah
- [x] Tambah `GradientBlobs` dekoratif di background (konsisten dengan
      `/login`/`/register`)
- [x] Header progress diperjelas: teks "Langkah X dari 4" + nama step
      di atas progress bar (sebelumnya cuma dots polos tanpa keterangan
      angka)
- [x] Step "Mulai" & "Selesai" dapat ikon besar bulat gradient (size-16,
      `Sparkles`/`PartyPopper`) sebagai focal point visual, konten
      di-center — sebelumnya rata kiri datar seperti step form lainnya
- [x] Verifikasi: tsc, eslint, `pnpm build` bersih

## Fase 36 — Bug: Kategori Income Hilang di Onboarding

Bug dilaporkan user: sudah menambahkan Kategori Income lewat onboarding,
tapi tidak muncul di Settings sesudahnya. Dicek langsung ke database
(akun dendijuliano2016@gmail.com): `allocationcategories` (5 item) dan
`dailybudgetsettings` tersimpan benar, tapi `incomecategories` benar-benar
kosong (0 dokumen) — padahal API `/api/income-categories` sendiri sudah
diverifikasi jalan normal di Fase 32.

- [x] Root cause: bukan bug di API, tapi jebakan UX — step "Sumber
      Pemasukan" punya input nama + tombol "Tambah" terpisah dari tombol
      "Lanjut". Kalau user ketik nama lalu langsung klik "Lanjut" (tanpa
      klik "Tambah" atau Enter dulu), teks yang diketik hilang begitu
      saja tanpa peringatan apa pun — persis pola yang paling mungkin
      terjadi di kasus user (step alokasi & jatah makan berhasil, cuma
      step income yang kosong)
- [x] Fix: `next()` generik dipecah jadi 3 fungsi khusus per step
      (`nextFromIncome`, `nextFromDailyBudget`, `nextFromAllocation`) —
      tiap fungsi ini otomatis submit dulu apa pun yang masih tertulis
      di input (kalau belum di-"Tambah"/"Simpan") sebelum pindah step,
      supaya tidak ada input yang diam-diam hilang lagi. Step "Mulai"
      tetap pakai `next()` polos (tidak ada input untuk di-flush)
- [x] Refactor pendukung: logika POST tiap kategori diekstrak jadi
      fungsi `addIncomeCategory`/`addAllocationCategory`/
      `saveDailyBudget` yang reusable, dipakai baik oleh submit form
      biasa maupun oleh fungsi `nextFrom*` yang baru
- [x] Data user yang sudah terlanjur hilang tidak di-backfill otomatis
      (user pilih input manual ulang sendiri lewat Settings)
- [x] Verifikasi: tsc, eslint, `pnpm build` bersih

## Fase 37 — Bug: Tidak Bisa Input Income di Budget (Kategori Baru Setelah Bulan Tersimpan)

Bug dilaporkan user: input Income di halaman Budget tidak bisa diisi
sama sekali. Diminta juga cek apakah ada bug serupa di tempat lain.

- [x] Root cause ditemukan langsung dari database akun yang kena bug:
      `MonthlyBudget` Juli 2026 sudah tersimpan (`incomes: []`) SEBELUM
      dua kategori income ("Friendsure", "Prodigy") dibuat menyusul
      lewat Settings. Baris kategori tetap tampil di UI (di-render dari
      daftar kategori yang live, bukan dari `incomes[]`), tapi
      `updateIncome()` cuma `.map()` entry yang SUDAH ADA di array
      `incomes` — kalau kategorinya belum punya entry di situ (karena
      dibuat setelah bulan itu disimpan), input yang diketik tidak
      pernah nyantol ke state manapun, jadi kelihatan seperti input
      "tidak bisa diisi"
- [x] Dicek ke seluruh codebase sesuai permintaan user — pola yang sama
      persis (`.map()` tanpa fallback insert) ditemukan di **2 tempat
      lain** di file yang sama: `updateAllocation` dan
      `updateAllocationRealized` (`app/(app)/budget/page.tsx`) — bug
      identik, cuma belum sempat dilaporkan karena kasusnya sama:
      kategori alokasi baru di bulan yang sudah tersimpan. Tidak
      ditemukan pola serupa di halaman lain (Settings/Expenses/
      Admin/Dashboard tidak punya bentuk "array tersimpan vs daftar
      kategori live" yang sama)
- [x] Fix: ketiga fungsi (`updateIncome`, `updateAllocation`,
      `updateAllocationRealized`) diubah jadi **upsert** — update kalau
      entry-nya sudah ada, tambahkan baris baru kalau belum, bukan diam
      no-op. Tidak perlu perubahan di server (`PUT /api/monthly-budget`
      sudah menyimpan apa pun array yang dikirim client apa adanya —
      akar masalahnya murni di state client yang tidak pernah terkirim)
- [x] Verifikasi lewat curl dengan akun uji terisolasi (bukan akun user
      yang kena bug — tidak ada kredensialnya): simulasi persis skenario
      bug (simpan budget kosong → baru buat kategori income → PUT
      dengan entry baru yang di-upsert seperti yang akan dilakukan UI
      yang sudah diperbaiki) → `totalIncome` di response GET berikutnya
      benar Rp5.000.000, terkonfirmasi persisten; data uji dibersihkan;
      tsc, eslint, `pnpm build` bersih

## Fase 38 — Bug: Kursor CurrencyInput Lompat ke Akhir Saat Edit di Tengah

Bug dilaporkan user: di `CurrencyInput` (dipakai di Budget/Settings/
Expenses/Onboarding), ketik ulang salah satu digit di tengah angka (mis.
"10.000.000" → mau jadi "10.600.000" dengan ganti salah satu 0 jadi 6) —
kursor selalu lompat ke posisi paling akhir setiap kali ada perubahan,
bukan tetap di posisi yang sedang diedit.

- [x] Root cause: `CurrencyInput` sengaja dibuat stateless murni sejak
      Fase 10d (`value` selalu dihitung ulang dari prop tiap render,
      tanpa `useState`/`useEffect`, supaya tidak kena lint
      `set-state-in-effect`) — tapi ini berarti tiap keystroke,
      `Intl.NumberFormat` memformat ulang seluruh string (termasuk
      posisi titik ribuan yang bisa geser), dan browser/React
      me-reset posisi kursor ke akhir string tiap kali `.value` di-set
      ulang, tanpa ada logika yang mempertahankan posisi kursor relatif
- [x] Fix: tambah `useRef` ke elemen `<input>` (didukung tanpa
      `forwardRef` karena React 19 sudah menerima `ref` sebagai prop
      biasa) + `useLayoutEffect` yang memanggil `setSelectionRange()`
      (API imperatif DOM, BUKAN state setter — tidak melanggar lint
      `set-state-in-effect` yang sama, terverifikasi lewat `eslint`)
      setelah tiap render. Mekanismenya: saat `onChange`, hitung berapa
      digit yang ada di sebelah kiri kursor pada string mentah sebelum
      diformat ulang; setelah value baru diformat, cari posisi di
      string baru yang punya jumlah digit yang sama di sebelah
      kirinya, lalu pindahkan kursor ke situ — supaya kursor "mengikuti
      digit", bukan menempel ke index karakter yang bisa berubah kalau
      posisi titik ribuan ikut geser
- [x] Verifikasi: disimulasikan murni di Node (tanpa browser/Playwright,
      fungsi-fungsi inti disalin & dijalankan langsung) persis skenario
      user — hapus salah satu "0" di tengah "10.000.000" lalu ketik
      "6" → hasil akhir value `10600000`, terformat `"10.600.000"`,
      kursor berhenti di posisi 4 (persis setelah "10.6", bukan di
      akhir string) — sesuai perilaku yang diharapkan; tsc, eslint,
      `pnpm build` bersih

## Fase 39 — Propagasi Budget ke Bulan-Bulan Kosong Setelahnya

Dipicu pertanyaan user soal grafik "Pengeluaran Bulanan" yang targetnya
cuma naik di 2 bulan lalu balik ke 0 — ternyata bukan bug (data tidak
hilang), tapi keterbatasan mekanisme auto-prefill lama: draft cuma
di-hitung on-the-fly, tidak pernah benar-benar tersimpan, jadi rantai
carry-forward putus setelah 1 bulan begitu ketemu bulan yang belum
pernah dibuka. User klarifikasi ekspektasinya: begitu satu bulan
disimpan, bulan-bulan **kosong** setelahnya (belum pernah disimpan sama
sekali) harus **langsung tertulis ke database**, bukan cuma dihitung
kalau dibuka — dan berlanjut ke tahun berikutnya, bukan cuma sisa tahun
berjalan. Bulan sebelum bulan yang disimpan (masa lalu) sengaja TIDAK
disentuh.

- [x] `lib/monthlyBudget.ts` — ekstrak logika pembangunan draft
      (`buildDraftLines`) jadi fungsi murni terpisah, dipakai bareng
      oleh `getMonthlyBudgetOrDraft` (baca, tidak pernah menyimpan) dan
      fungsi baru `propagateBudgetForward` (tulis permanen) — supaya
      kedua jalur selalu identik cara hitungnya (termasuk pos `food`
      yang tetap dihitung ulang per jumlah hari bulan tujuan, bukan
      di-copy mentah)
- [x] `propagateBudgetForward(userId, fromMonth)` — jalan maju bulan
      demi bulan dari `fromMonth`, berhenti otomatis begitu ketemu bulan
      yang **sudah** punya `MonthlyBudget` tersimpan (tidak pernah
      menimpa data yang sudah ada), dibatasi maksimum 24 iterasi sebagai
      pengaman (~2 tahun) — cukup untuk "sisa tahun ini + tahun depan"
      sesuai jawaban user, tanpa risiko loop tidak berujung
- [x] `PUT /api/monthly-budget` — setelah bulan yang diminta berhasil
      disimpan, langsung panggil `propagateBudgetForward`; response
      dapat field baru `propagatedMonths: string[]` (daftar bulan yang
      baru ditulis)
- [x] `app/(app)/budget/page.tsx` — toast sukses setelah simpan
      menyebutkan jumlah bulan yang ikut terisi otomatis (mis. "Budget
      Juli 2026 tersimpan, 5 bulan setelahnya ikut terisi otomatis"),
      supaya user sadar ada efek samping di bulan lain, bukan cuma
      diam-diam terjadi di background
- [x] Verifikasi lewat curl dengan akun uji terisolasi: simpan Juli
      dengan income 10jt → `propagatedMonths` berisi 24 bulan
      (Agu 2026 s/d Jul 2028, berhenti tepat di batas aman); GET
      Desember 2026 mengonfirmasi `totalIncome` ikut 10jt (bukan 0);
      re-simpan Juli dengan angka baru → `propagatedMonths` kosong
      (Agustus sudah py data sendiri, chain berhenti dari awal, TIDAK
      ditimpa) dan Agustus dicek ulang tetap 10jt (nilai lama, bukan
      angka baru dari re-save) — konfirmasi tidak ada data yang
      tertimpa tanpa sengaja; data uji dibersihkan; tsc, eslint,
      `pnpm build` bersih

## Fase 40 — Tombol "Input Pengeluaran" di Dashboard Buka Modal

Permintaan user: tombol "Input Pengeluaran" di hero card Dashboard
sebelumnya cuma navigasi ke `/expenses` — diminta langsung buka modal di
tempat, tidak usah pindah halaman.

- [x] `components/add-expense-dialog.tsx` — form "Tambah Pengeluaran"
      yang sebelumnya inline di `app/(app)/expenses/page.tsx` diekstrak
      jadi komponen reusable `AddExpenseDialog` (`trigger` sebagai prop
      supaya tombolnya bisa beda gaya di tiap halaman, `onSaved(dateISO)`
      callback dipanggil sesudah berhasil simpan)
- [x] `app/(app)/expenses/page.tsx` — diganti pakai `AddExpenseDialog`
      yang baru (perilaku sama persis: kalau tanggal yang diinput beda
      bulan dari yang sedang dilihat, otomatis pindah tampilan ke bulan
      itu; kalau sama, reload list)
- [x] `app/(app)/dashboard/page.tsx` — tombol "Input Pengeluaran" di
      `HeroCard` (dipakai bareng oleh mode Bulanan & Tahunan) diganti
      dari `<Link href="/expenses">` jadi trigger `AddExpenseDialog`;
      `onSaved` dihubungkan ke fungsi `refresh()` (dibungkus
      `useCallback`) yang sama dipakai `useEffect` awal, supaya ringkasan
      dashboard (Total Bersih, progress ring, dst) langsung update tanpa
      reload halaman setelah pengeluaran baru disimpan
- [x] Verifikasi: tsc, eslint, `pnpm build` bersih — tidak ada lagi
      warning `react-hooks/exhaustive-deps` dari refactor `refresh` jadi
      `useCallback`

## Fase 41 — Halaman Panduan + Tombol Panduan/Hubungi di Sidebar

Permintaan user: halaman panduan pengisian untuk user yang masih bingung,
plus tombol "Panduan" dan "Hubungi" di bagian bawah sidebar.

- [x] `app/(app)/panduan/page.tsx` — halaman baru, isinya:
      - 5 langkah alur dasar berurutan (Settings → Budget → Expenses →
        Dashboard → Reports), tiap langkah ada penjelasan singkat +
        tombol langsung ke halaman terkait
      - Accordion "Pertanyaan Umum" (6 FAQ) menjawab hal-hal yang
        berulang kali jadi sumber kebingungan sepanjang sesi ini: kenapa
        pos Makan tidak bisa diedit manual, beda Rencana vs Realisasi
        investasi, kenapa budget bulan lain ikut terisi otomatis, kenapa
        kategori yang dihapus masih muncul di laporan lama, siapa yang
        bisa lihat data, cara admin lihat dashboard anggota lain
      - Card CTA "Hubungi via WhatsApp" di bagian bawah
- [x] `lib/contact.ts` — konstanta `WHATSAPP_NUMBER`/`WHATSAPP_URL`
      (`wa.me/6287797824107`) supaya tidak duplikasi nomor di beberapa
      file
- [x] `components/app-shell.tsx` — tambah 2 link "Panduan" (internal,
      ikon `HelpCircle`) dan "Hubungi" (external ke WhatsApp, ikon
      `MessageCircle`, `target="_blank"`) di bagian bawah sidebar
      desktop (di atas dropdown profil user, di bawah nav utama), dan
      di dropdown menu mobile (top bar) untuk paritas fitur — mobile
      tidak dapat entri baru di bottom tab bar (sudah penuh 5 slot),
      cukup lewat dropdown
- [x] Verifikasi: tsc, eslint, `pnpm build` bersih — route `/panduan`
      muncul di output build

## Fase 42 — Template Pesan WhatsApp

Permintaan user: link "Hubungi" WhatsApp perlu ada template pesan
otomatis, bukan chat kosong.

- [x] `lib/contact.ts` — `WHATSAPP_URL` sekarang menyertakan parameter
      `?text=` (di-`encodeURIComponent`) berisi pesan pembuka default
      "Halo, saya mau tanya soal penggunaan aplikasi Pundi." — karena
      dipusatkan di satu konstanta yang sudah dipakai bareng oleh
      `app/(app)/panduan/page.tsx` dan `components/app-shell.tsx`
      (Fase 41), perubahan ini otomatis berlaku di kedua tempat tanpa
      perlu edit lain
- [x] Verifikasi: encoding URL dicek manual (`%2C`/`%20` dsb sesuai
      spesifikasi `encodeURIComponent`); tsc, eslint, `pnpm build`
      bersih

## Fase 43 — Baris "Kategori Terhapus" Terlihat di Budget

Bug dilaporkan user (screenshot): Total Bersih minus padahal seharusnya
tidak. Dicek ke database — bukan salah hitung, tapi konsekuensi dari
kebijakan "hapus kategori tidak mengubah data bulan tersimpan" (lihat
Fase 27 catatan): user menghapus kategori "Investasi" lalu buat baru
dengan nama sama.
Entry lama (Rp10.000.000) tetap ikut ke Total Alokasi tapi sepenuhnya
tidak terlihat di UI (row cuma di-render dari kategori yang masih hidup)
— jadi user tidak sadar ada 2 angka Investasi yang ke-double-count.
Karena sudah pernah dipropagasi (Fase 39), ini nyangkut di 25 bulan
sekaligus.

- [x] `app/(app)/budget/page.tsx` — baris `incomes[]`/`allocations[]`
      yang `categoryId`-nya sudah tidak ada di daftar kategori yang
      masih hidup sekarang dirender sebagai baris terpisah bergaya
      amber/dashed, badge "Kategori terhapus", nominal ditampilkan +
      tombol hapus (`Trash2`) — supaya user sadar nilainya masih ikut
      kehitung dan bisa memilih untuk membuangnya secara eksplisit.
      Penghapusan cuma menghapus baris itu dari state lokal bulan yang
      sedang dibuka; baru permanen setelah klik "Simpan Budget" —
      TIDAK ada penghapusan otomatis/cascade, tetap konsisten dengan
      kebijakan yang sudah ditetapkan user sebelumnya
- [x] Data user yang sudah kena masalah ini dibersihkan langsung
      (dengan izin user) lewat script sekali-pakai: `$pull` entry
      `allocations` dengan `categoryId` yang sudah dihapus dari 25
      dokumen `MonthlyBudget` (Jul 2026 - Jul 2028) sekaligus —
      terverifikasi 25/25 termodifikasi, 0 dokumen tersisa yang masih
      mengandung entry itu, Total Alokasi Juli balik ke Rp13.200.000
      (dari Rp23.200.000 sebelumnya)
- [x] Verifikasi: tsc, eslint, `pnpm build` bersih

## Fase 44 — Landing Page Marketing di "/"

Permintaan user: `/` masih boilerplate default create-next-app (belum
pernah disentuh), diminta jadi landing page marketing yang jelaskan
keuntungan produk, fitur-fiturnya, dan section screenshot (placeholder
dulu, nanti diisi gambar asli manual oleh user).

- [x] Ditemukan sekalian: `/` sebelumnya **tidak bisa diakses** oleh
      pengunjung belum login (proxy redirect ke `/login` karena `/`
      tidak ada di `publicRoutes`) — jadi landing page lama memang tidak
      pernah benar-benar tampil ke pengunjung baru
- [x] `proxy.ts` — `/` ditambahkan ke `publicRoutes`, otomatis
      memanfaatkan logic redirect yang sudah ada (user yang sudah login
      buka `/` → auto redirect ke `/dashboard`; belum login → landing
      page tampil normal)
- [x] `app/page.tsx` — full rewrite dari boilerplate Next.js jadi
      landing page marketing:
      - Nav sticky (logo + tombol Masuk/Daftar Akun)
      - Hero — headline, subheadline, 2 CTA (Daftar Akun / Masuk)
      - Section Fitur — grid 6 card (Pemasukan Multi-Sumber, Alokasi
        Otomatis, Pengeluaran Harian, Laporan & Grafik, Multi-Anggota,
        Privasi per Grup)
      - Section "Cara Kerjanya" — 4 step ringkas dengan badge nomor
      - Section Screenshot — 3 placeholder bergaya browser-frame
        (header 3 dot + area abu-abu berisi ikon gambar + label + teks
        "Ganti dengan screenshot asli"), siap ditukar user manual nanti
      - CTA akhir — card gradient emerald ajakan daftar
      - Footer minimal
      Semua pakai komponen & bahasa desain yang sudah ada (`IconChip`,
      `Card`, `GradientBlobs`) — konsisten dengan `/login`/`/register`
- [x] Verifikasi lewat curl (bukan Playwright): `/` tanpa login → 200 +
      mengandung teks "Daftar Akun" (landing page benar-benar tampil);
      `/dashboard` tanpa login tetap 307 ke `/login` (proteksi lain
      tidak kebobolan); user baru register+login → akses `/` → 307 ke
      `/dashboard` (auto-redirect terkonfirmasi); data uji dibersihkan;
      tsc, eslint, `pnpm build` bersih — `/` tetap muncul sebagai
      static route (`○`) di output build

## Fase 45 — Landing Page Lebih Modern (gaya Apple-esque)

Feedback user: landing page Fase 44 dinilai terlalu simple, kurang
menarik/modern — diminta contek gaya Apple/situs modern lainnya.

- [x] Hero — badge pill kecil di atas headline ("✨ Kelola keuangan
      keluarga jadi lebih mudah"), headline diperbesar drastis
      (`text-5xl` s/d `text-7xl`, `tracking-tight`, `leading-[1.05]`),
      1 kata kunci ("keluarga") diberi gradient text via `bg-clip-text`
      — dan hero screenshot placeholder besar diletakkan langsung di
      bawah CTA sebagai focal point visual (pola umum hero produk
      modern: headline besar → visual besar)
- [x] Section Fitur diubah jadi **dark section** (`bg-zinc-950`, teks
      putih) untuk kontras kuat dari section terang di sekitarnya —
      pola "light → dark → light" yang umum dipakai situs modern
      (Apple, dsb) supaya halaman tidak terasa monoton satu warna dari
      atas ke bawah. Icon chip dibikin custom versi gelap
      (`bg-emerald-500/15 text-emerald-400`, bukan `IconChip` biasa
      yang didesain buat background terang)
- [x] Section "Cara Kerja" & "Tampilan" (screenshot) dapat eyebrow text
      kecil huruf kapital ("FITUR", "CARA KERJA", "TAMPILAN") di atas
      tiap heading section — pola umum landing page modern untuk
      hierarki visual yang lebih jelas
- [x] Step "Cara Kerja" dapat garis penghubung horizontal tipis di
      belakang tiap ikon (gaya timeline) dan badge nomor bulat kecil di
      pojok tiap ikon
- [x] Tombol CTA (nav, hero, CTA akhir) diubah jadi `rounded-full`
      (pill shape) dengan padding horizontal lebih lebar + shadow lebih
      tebal — kesan lebih "modern SaaS" dibanding rounded-lg standar
- [x] Spacing tiap section diperbesar (`py-16/20` → `py-24`) supaya
      lebih lega, konsisten dengan situs modern yang tidak takut pakai
      whitespace
- [x] Tidak menambah dependency baru (tanpa framer-motion/animasi
      scroll-trigger) — efek modern dicapai murni lewat tipografi,
      spacing, kontras warna, dan shadow, bukan JS animasi, supaya
      tetap ringan dan konsisten dengan stack yang sudah ada
- [x] Verifikasi: tsc, eslint, `pnpm build` bersih; curl ke `/`
      mengonfirmasi semua section baru ter-render (teks "bukan drama
      bulanan", "Semua yang kamu butuhkan", "4 langkah singkat",
      "Modern, gampang dipakai", "Siap mulai kelola" semuanya muncul)

## Fase 46 — Navbar & Footer Landing Page Disesuaikan

Feedback user: navbar & footer landing page (Fase 44/45) dirasa kurang
nyambung dengan gaya konten yang sudah lebih modern.

- [x] Navbar diubah dari bar penuh lebar (`border-b`, sudut lurus) jadi
      **floating pill navbar** — `sticky top-4`, `max-w-4xl`,
      `rounded-full`, shadow + backdrop-blur, terpisah dari tepi layar
      (pola umum situs modern seperti Linear/Vercel/Framer, kesan lebih
      "sengaja didesain" dibanding bar penuh polos)
  - Tambah link navigasi ke section (`Fitur`/`Cara Kerja`/`Tampilan`,
    disembunyikan di mobile) — sebelumnya nav cuma berisi tombol
    Masuk/Daftar tanpa link internal apa pun
  - Section terkait dapat `id` (`#fitur`, `#cara-kerja`, `#tampilan`)
    supaya link-nya benar-benar mengarah ke bagian yang sesuai
- [x] Footer diubah dari 1 baris tipis (logo + copyright) jadi **footer
      gelap multi-kolom** (`bg-zinc-950`, senada dengan section Fitur
      yang sudah dark) — kolom brand blurb, kolom "Produk" (link ke
      section yang sama), kolom "Akun" (Masuk/Daftar Akun), lalu baris
      copyright terpisah dengan border-top tipis. Footer gelap ini
      membuat halaman "dibingkai" dark-hero-dark (Fitur dark di tengah,
      Footer dark di akhir) alih-alih berakhir tiba-tiba di baris tipis
- [x] Verifikasi: tsc, eslint, `pnpm build` bersih; curl ke `/`
      mengonfirmasi `id="fitur"`/`id="cara-kerja"`/`id="tampilan"` dan
      `href="#fitur"` cocok, serta teks "Produk"/"Akun" (kolom footer
      baru) muncul di HTML

## Fase 47 — Bug: Strip Putih di Atas Navbar Landing Page

Bug dilaporkan user (screenshot): ada strip putih penuh lebar di paling
atas halaman, di belakang floating navbar — mengganggu karena beda
warna dari gradient hero di bawahnya.

- [x] Root cause: gradient (`bg-linear-to-b from-emerald-50 via-
      background to-background`) sebelumnya cuma dipasang di `<section>`
      Hero, bukan di wrapper terluar. Karena `<header>` (navbar
      mengambang) ada di DOM SEBELUM section Hero, area di belakang
      navbar tidak ikut ter-cover gradient — cuma background halaman
      default (putih polos) yang kelihatan di situ
- [x] Fix: pindahkan class gradient ke `<div className="min-h-screen">`
      (wrapper terluar) supaya gradient mulai dari y=0 (termasuk di
      belakang navbar), dan hapus duplikasi class gradient dari
      `<section>` Hero (cukup `relative overflow-hidden` buat clipping
      `GradientBlobs`, warnanya sekarang tembus dari parent)
- [x] Verifikasi: tsc, eslint, `pnpm build` bersih; curl ke `/`
      mengonfirmasi class gradient sudah pindah ke wrapper
      `min-h-screen` terluar

## Fase 48 — Navbar: Link Section Tidak Center

Feedback user (screenshot): ada yang janggal di sebelah kiri tombol
"Masuk" di navbar.

- [x] Root cause: 3 grup flex (logo, link section, tombol) dipasang
      `justify-between` — karena grup logo & grup tombol beda lebar,
      grup link (Fitur/Cara Kerja/Tampilan) ikut ke-geser condong ke
      kiri alih-alih benar-benar di tengah pill, menyisakan jarak
      kosong yang janggal persis sebelum "Masuk"
- [x] Fix: grup `<nav>` link section diubah jadi `absolute left-1/2
      -translate-x-1/2` (di-center secara independen terhadap lebar
      grup logo/tombol), `justify-between` sekarang cuma berlaku ke 2
      elemen (logo kiri, tombol kanan) — pola navbar standar: logo kiri,
      link section BENAR-benar di tengah, aksi kanan
- [x] Verifikasi: tsc, eslint, `pnpm build` bersih

## Fase 49 — Pasang Screenshot Asli & Fix Bug Middleware Blokir Asset Publik

User menaruh 3 file screenshot asli (`public/dashboard.jpeg`,
`budget.jpeg`, `report.jpeg`, semua 2880×1800) menggantikan placeholder
di landing page.

- [x] `app/page.tsx` — komponen `ScreenshotPlaceholder` diganti
      `ScreenshotFrame` yang render `next/image` (`fill`,
      `object-cover object-top`, `aspect-16/10` — pas sama rasio asli
      2880:1800) di dalam frame browser-chrome yang sama. Dipakai untuk
      hero visual (`dashboard.jpeg`, `priority`) dan grid 3 screenshot
      section Tampilan (`dashboard.jpeg`/`budget.jpeg`/`report.jpeg`)
- [x] Bug ditemukan & diperbaiki: gambar tidak muncul sama sekali di
      halaman (alt text kelihatan, gambar broken). Root cause: matcher
      `proxy.ts` cuma explicitly exclude `favicon.ico`/`icon.svg`, TIDAK
      exclude file publik lain — jadi `dashboard.jpeg`/`budget.jpeg`/
      `report.jpeg` (dan endpoint `/_next/image` yang memprosesnya) ikut
      "dilindungi" middleware auth, di-redirect ke `/login` untuk
      pengunjung yang belum login (persis situasi landing page — publik,
      belum login) → gambar gagal dimuat, browser cuma render alt text.
      Terverifikasi lewat curl: `dashboard.jpeg` sebelumnya 307, setelah
      fix jadi 200
- [x] Fix generik (bukan cuma whitelist 3 file ini satu-satu): matcher
      diubah dari daftar nama file eksplisit jadi exclude berdasarkan
      **ekstensi** (`.ico|.svg|.png|.jpg|.jpeg|.gif|.webp`) — supaya
      semua asset statis di masa depan otomatis publik tanpa perlu edit
      `proxy.ts` lagi tiap kali nambah gambar baru
- [x] Footer landing page — tambah baris kredit developer ("Dibuat oleh
      Dendy Juliano Juanda", link ke dendyjuliano.com, `target="_blank"`)
      di sebelah baris copyright
- [x] Verifikasi: curl ke 3 file screenshot & endpoint `/_next/image`
      tanpa cookie auth → semua 200; `/dashboard` (halaman terproteksi)
      tetap 307 tanpa auth (proteksi lain tidak kebobolan); `icon.svg`
      tetap 200; tsc, eslint, `pnpm build` bersih

## Fase 50 — Toggle Lihat/Sembunyikan Password

Permintaan user: tambah icon show/hide di input password supaya bisa
lihat password yang diketik.

- [x] `components/password-input.tsx` — komponen baru `PasswordInput`,
      bungkus `Input` biasa + tombol ikon (`Eye`/`EyeOff`) di kanan
      dalam input yang toggle `type="password"` ↔ `type="text"` lewat
      state lokal (`useState`). Tombolnya `type="button"` (supaya tidak
      ikut submit form) dan `tabIndex={-1}` (supaya tab order tetap
      lompat ke field berikutnya, bukan berhenti di tombol mata)
- [x] Dipasang di 3 tempat yang punya input password: `/login`,
      `/register`, dan form "Tambah Anggota Baru" di `/admin` —
      menggantikan `<Input type="password">` biasa
- [x] Verifikasi: tsc, eslint, `pnpm build` bersih

## Fase 51 — Optimasi SEO

Permintaan user: optimasi SEO untuk website (khususnya landing page
publik di `/`).

- [x] `lib/site.ts` — konstanta `SITE_URL`/`SITE_NAME`/`SITE_DESCRIPTION`
      terpusat, dipakai bareng oleh metadata, robots, sitemap, OG image
      (`SITE_URL` baca dari env `NEXT_PUBLIC_SITE_URL`, fallback ke
      `https://pundi-pundi.vercel.app`)
- [x] `app/layout.tsx` — `lang="en"` diperbaiki jadi `lang="id"` (konten
      100% Bahasa Indonesia — sebelumnya salah sejak awal project).
      Metadata root diperlengkapi: `metadataBase`, title template
      (`%s | Pundi`), `keywords`, `authors`, `robots: {index,follow}`,
      `openGraph` & `twitter` lengkap (title/description/locale
      `id_ID`/site name)
- [x] `app/opengraph-image.tsx` — OG image branded di-generate lewat
      `next/og` `ImageResponse` (1200×630, gradient emerald, logo piggy
      bank + "Pundi" + tagline) — otomatis kepakai Next.js buat
      `og:image`/`twitter:image` di semua halaman yang tidak override
      sendiri, tidak perlu file gambar statis manual
- [x] `app/robots.ts` — generate `robots.txt` dinamis: allow `/`,
      disallow semua route yang butuh login (`/dashboard`, `/budget`,
      `/expenses`, `/reports`, `/settings`, `/admin`, `/onboarding`,
      `/panduan`) + link ke sitemap
- [x] `app/sitemap.ts` — generate `sitemap.xml`: `/` (priority 1),
      `/register` (0.6), `/login` (0.3) — cuma halaman yang benar-benar
      publik & bisa diakses crawler tanpa login
- [x] Metadata per-halaman:
      - `app/page.tsx` (landing, Server Component) — `alternates.
        canonical: "/"` langsung di file
      - `app/login/layout.tsx` & `app/register/layout.tsx` — layout
        baru (Server Component) khusus buat nampung `export const
        metadata` (title/description/canonical per halaman), karena
        `app/login/page.tsx` & `app/register/page.tsx` sendiri client
        component ("use client") jadi tidak bisa export metadata
        langsung — pola standar Next.js buat kasus ini
- [x] Regenerasi `next typegen` (route types basi setelah nambah
      `layout.tsx` baru di 2 segment, sama seperti kasus route group di
      Fase 10)
- [x] Bug ditemukan & diperbaiki (kelas sama dengan Fase 49 — middleware
      auth ikut nge-block asset publik): `robots.txt`, `sitemap.xml`,
      dan `opengraph-image` semuanya sempat ke-redirect 307 ke `/login`
      karena tidak match pengecualian ekstensi Fase 49 (tidak berekstensi
      gambar, atau `opengraph-image` sama sekali tidak punya ekstensi di
      URL). Matcher `proxy.ts` diperluas: exclude eksplisit nama
      `robots.txt`/`sitemap.xml`/`opengraph-image`/`twitter-image`/
      `manifest.webmanifest` + tambahan ekstensi `.txt`/`.xml`/
      `.webmanifest`
- [x] Verifikasi: curl `/robots.txt` tampilkan isi yang benar; curl
      `/sitemap.xml` & `/opengraph-image` → 200 (sebelumnya 307);
      `/opengraph-image` dicek visual (Read tool ke file yang di-save) —
      render bersih, logo & teks kebaca jelas; meta tag di `<head>`
      halaman `/` dicek lewat curl — `<title>`, `canonical`, `og:*`,
      `twitter:*` semua muncul dan terisi benar; `/dashboard` (halaman
      terproteksi) & `/dashboard.jpeg` (asset publik dari Fase 49) tetap
      berperilaku sama seperti sebelumnya (regresi nihil); tsc, eslint,
      `pnpm build` bersih

## Fase 52 — Investasi Ditampilkan di Reports & Dashboard

Diskusi user: bagian investasi cuma ada di Budget (transaksional,
per-bulan), tidak kelihatan lagi begitu keluar dari situ. Disepakati 2
tambahan: chart tren di Reports + indikator ringkas di Dashboard —
keduanya cuma muncul kalau user punya kategori alokasi bertipe `invest`
(konsisten dengan card "Realisasi Investasi" yang sudah ada di Budget
sejak Fase 20).

- [x] `lib/reports.ts` — fungsi baru `getYearlyInvestmentData(userId,
      year)`: loop 12 bulan lewat `getMonthlyBudgetOrDraft` (reuse,
      termasuk otomatis ikut carry-forward dari propagasi Fase 39),
      hitung `planned`/`realized` per bulan dari baris alokasi bertipe
      invest, plus flag `hasInvestCategory`
- [x] `app/api/reports/investment/route.ts` — endpoint baru
      `GET ?year=YYYY`, pola sama persis dengan `/api/reports/yearly`
- [x] `app/(app)/reports/page.tsx` — **Chart 4: "Realisasi Investasi
      {year}"**, paired bar (Rencana vs Realisasi) + 2 trendline, gaya
      identik dengan Chart 3 (Pengeluaran Makan Bulanan — bar
      berpasangan + trendline), pakai `CATEGORICAL[2]`/`[3]` (belum
      dipakai chart lain di halaman ini, hindari ambiguitas warna
      lintas-chart). Card ini di-render kondisional
      (`investment?.hasInvestCategory`) — sembunyi total kalau user
      tidak punya kategori invest
- [x] `lib/dashboardSummary.ts` — `getMonthBreakdown` (shared oleh
      dashboard bulanan & tahunan) dapat tambahan hitungan
      `investPlanned`/`investRealized`/`hasInvestCategory`; diteruskan
      ke `getDashboardSummary` sebagai field baru `investment: {planned,
      realized} | null` (null kalau tidak ada kategori invest)
- [x] `app/(app)/dashboard/page.tsx` — card baru **"Investasi Bulan
      Ini"** di mode Bulanan (antara grid Hari Ini/Bulan Ini dan Rincian
      Mingguan), badge status ("Sesuai rencana"/"Kurang Rp X") + progress
      bar realisasi vs rencana, gaya konsisten dengan card sejenis di
      Budget. Render kondisional (`summary.investment`)
- [x] Verifikasi lewat curl dengan 2 akun uji terisolasi:
      - Akun **dengan** kategori invest: buat kategori "Saham" → simpan
        Juli dengan rencana 2jt/realisasi 1,5jt → `dashboard-summary`
        balas `"investment":{"planned":2000000,"realized":1500000}`;
        `reports/investment` balas 12 bulan dengan Agustus-Desember
        ikut ter-propagasi rencana 2jt (realisasi tetap 0, sesuai
        aturan "realized tidak di-carry-forward" dari Fase 20)
      - Akun **tanpa** kategori invest: `dashboard-summary` →
        `"investment":null`; `reports/investment` →
        `"hasInvestCategory":false` — konfirmasi kedua fitur baru
        bersih tersembunyi kalau tidak relevan
      - Data uji dibersihkan; tsc, eslint, `pnpm build` bersih

## Fase 53 — Bug: Target "Makan" Rp0 di Bulan Ini (Kategori Food Hilang)

Bug dilaporkan user (screenshot): card "Juli 2026" nampilin "Makan Rp
52.400 / Rp 0" — target 0 padahal jatah harian sudah diisi Rp100.000.

- [x] Root cause ditemukan lewat database akun yang kena bug: akun
      **tidak punya kategori alokasi bertipe "food" sama sekali**
      (cuma ada 4 Fixed Cost + 1 Investasi). "Hari Ini"/"Minggu" baca
      target Makan langsung dari `amountPerDay` (jatah harian), tapi
      "Bulan Ini" baca dari jumlah baris alokasi bertipe food — tanpa
      kategori itu, jumlahnya otomatis 0, dan **Total Bersih ikut
      overstated** di semua bulan (jatah harian tidak pernah
      dikurangkan ke Total Alokasi)
- [x] Penyebab sebenarnya (dikonfirmasi lewat baca kode setelah user
      bilang "saya sudah pernah isi"): `app/onboarding/page.tsx` step
      "Jatah Makan per Hari" cuma memanggil
      `POST /api/daily-budget-setting` — TIDAK pernah membuat kategori
      alokasi bertipe food. Step berikutnya ("Pos Alokasi") juga tidak
      menyinggung perlunya kategori Makan, cuma kasih contoh Fixed Cost
      (transfer, sewa, investasi) — jadi user wajar mengira jatah
      hariannya sudah "beres" padahal belum tersambung ke mana pun
      selain Hari Ini/Minggu
- [x] Fix di source: `app/api/daily-budget-setting/route.ts` (POST) —
      setelah berhasil simpan jatah harian, cek apakah user sudah punya
      kategori alokasi bertipe `food`; kalau belum, otomatis buat satu
      bernama "Makan". Berlaku baik dipanggil dari onboarding maupun
      dari Settings biasa — satu titik perbaikan untuk semua jalur.
      Idempotent (dicek via `AllocationCategory.exists`, tidak bikin
      duplikat kalau dipanggil berkali-kali)
- [x] `app/onboarding/page.tsx` — `saveDailyBudget` sekarang refetch
      `allocationCategories` sesudah simpan, supaya kategori "Makan"
      yang baru otomatis dibuat langsung kelihatan di step "Pos
      Alokasi" berikutnya (sebelumnya cuma di-fetch sekali di awal,
      tidak akan reflect perubahan dari step sebelumnya)
- [x] `app/(app)/settings/page.tsx` tidak perlu diubah — `loadAll()`
      yang sudah dipanggil sesudah tiap aksi otomatis ikut menangkap
      kategori baru ini
- [x] Data akun yang kena bug diperbaiki (dengan izin user) lewat script
      sekali-pakai: buat kategori "Makan" (food), lalu `$push` baris
      alokasi baru ke 25 bulan yang sudah tersimpan (Jul 2026 - Jul
      2028) dengan nominal `amountPerDay × jumlah_hari_bulan_itu`
      (dihitung native pakai `new Date(y,m,0).getDate()` — otomatis
      benar untuk tahun kabisat, terverifikasi Feb 2027=28 hari vs
      Feb 2028=29 hari beda nominal). Juli 2026: Total Alokasi naik
      dari Rp13.200.000 jadi Rp16.300.000 (nambah Rp3.100.000 = jatah
      Makan yang sebelumnya hilang), Total Bersih turun jadi
      Rp6.300.000 (dari Rp9.400.000 yang overstated sebelumnya)
- [x] Verifikasi: tsc, eslint, `pnpm build` bersih; fungsional lewat
      curl dengan akun uji terisolasi — sebelum save jatah harian:
      `/api/allocation-categories` kosong; sesudah save: otomatis
      berisi 1 kategori "Makan" tipe food; save jatah harian KEDUA
      kalinya (ganti nominal) → kategori tidak terduplikasi (masih 1,
      idempotent terkonfirmasi); data uji dibersihkan

## Backlog — Ide Pengembangan Selanjutnya (belum dieksekusi)

Didiskusikan setelah PWA + post promosi LinkedIn selesai. User tertarik
ke dua arah retensi/insight, dicatat dulu di sini sebelum eksekusi —
termasuk mana yang gratis dan mana yang berpotensi butuh biaya.

- [ ] **Push notification pengingat** (misal "belum ada pengeluaran
      tercatat hari ini") — alasan: user baru (teman/keluarga yang
      mulai pakai lewat promosi) paling gampang berhenti pakai kalau
      tidak ada yang narik balik mereka buka app tiap hari
      - **Gratis**: Web Push API + VAPID key + Service Worker — semua
        native browser, tidak ada biaya API pihak ketiga. Delivery
        lewat push service bawaan tiap browser (mis. FCM untuk
        Chrome/Edge, Apple Push untuk Safari iOS 16.4+), gratis dari
        sisi kita. Nyimpen subscription per user di MongoDB Atlas juga
        masih aman di tier gratis
      - **Berpotensi bayar**: cara MEMICU notifikasi terjadwal (mis.
        tiap jam 8 malam). Vercel Cron Jobs di plan Hobby (gratis) ada
        tapi dibatasi (jadwal minimal harian, jumlah cron job
        terbatas) — cukup kalau reminder-nya 1x/hari untuk semua user,
        tapi kalau nanti user bisa atur jam reminder masing-masing
        (lebih personal), kemungkinan perlu upgrade plan Vercel atau
        pakai cron eksternal
- [ ] **Auto-insight dari data yang sudah ada** (mis. "pengeluaran
      Makan naik 20% dari bulan lalu") — alasan: data historis sudah
      banyak (Reports udah ada beberapa bulan jalan), sayang kalau
      cuma jadi angka mentah tanpa insight yang gampang dicerna
      - **Gratis**: kalau berbasis perhitungan/rule sendiri (bandingin
        angka antar bulan/kategori dari data yang sudah ada) —
        sepenuhnya di kode kita, tidak butuh API luar sama sekali
      - **Berpotensi bayar**: kalau insight-nya mau dalam bentuk
        kalimat natural yang lebih "pintar"/personal (pakai AI/LLM
        buat generate teksnya) — ini butuh biaya API AI, besarnya
        tergantung jumlah user & seberapa sering di-generate (bisa
        ditekan murah kalau di-generate berkala, mis. 1x/bulan per
        user, bukan tiap kali buka app)

Belum ada keputusan final scope/prioritas — didiskusikan lagi sebelum
mulai fase implementasi.

## Fase 54 — Push Notification Reminder + Auto-Insight (versi gratis)

User pilih "yang gratis semua" dari backlog di atas. Jam reminder:
12:00 WIB (siang) untuk semua user (belum bisa per-user, itu keterbatasan
plan Vercel Cron gratis). Lokasi insight: Dashboard.

- [x] `lib/dashboardSummary.ts` — fungsi baru `getMonthToDateInsights`:
      bandingin pengeluaran bulan berjalan (s.d. `referenceDate`) vs
      bulan lalu di rentang TANGGAL YANG SAMA (bukan total sebulan
      penuh, biar adil kalau baru pertengahan bulan), per kategori
      (`makan`/`lain-lain`). Insight cuma muncul kalau |perubahan| ≥
      `INSIGHT_THRESHOLD_PERCENT` (15%) dan ada baseline bulan lalu
      (previous > 0). Dipanggil dari `getDashboardSummary` cuma kalau
      `isCurrentMonth` true, hasilnya masuk field baru `insights: []`
- [x] `app/(app)/dashboard/page.tsx` — card baru **"Insight Bulan Ini"**
      (antara card Investasi dan Rincian Mingguan), render kondisional
      (`summary.insights.length > 0`), icon TrendingUp/TrendingDown
      warna destructive/emerald sesuai arah perubahan
- [x] Verifikasi lewat akun uji: seed pengeluaran Juni (baseline) &amp;
      Juli (bulan berjalan) lewat API — Makan naik dari 100rb→300rb
      (+200%) dan Lain-lain turun dari 200rb→50rb (-75%) di rentang
      tanggal yang sama (1-3), `dashboard-summary` balas insight
      persis sesuai angka yang diharapkan; data uji dibersihkan

- [x] `pnpm add web-push` + `@types/web-push` (dev) — paket gratis,
      tidak ada biaya API pihak ketiga untuk push (delivery lewat push
      service bawaan browser)
- [x] VAPID key pair digenerate via `webpush.generateVAPIDKeys()`,
      disimpan di `.env.local` (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`,
      `VAPID_PRIVATE_KEY`) + `CRON_SECRET` baru (random 64-hex) buat
      ngamanin endpoint cron. **User perlu nambahin ketiga env var ini
      juga ke Vercel project settings sebelum push reminder jalan di
      production**
- [x] `models/PushSubscription.ts` — `{ userId, endpoint (unique),
      keys: {p256dh, auth} }`, timestamps
- [x] `app/api/push/subscribe/route.ts` — POST upsert-by-endpoint
      (bukan by userId, karena satu user bisa subscribe dari beberapa
      device/browser), DELETE by endpoint+userId
- [x] `public/sw.js` — service worker MINIMAL, cuma handle event
      `push` (nampilin notifikasi) &amp; `notificationclick` (buka
      `/dashboard`). Sengaja TIDAK ada `fetch` handler / cache apa pun
      — konsisten sama keputusan Fase PWA sebelumnya (installable only,
      no offline caching, karena data finance harus selalu fresh)
- [x] `components/push-notification-toggle.tsx` — toggle di Settings,
      handle request permission → subscribe → POST ke
      `/api/push/subscribe`; disable → DELETE + `unsubscribe()`.
      Auto-hide kalau browser tidak dukung Push API sama sekali
- [x] `app/(app)/settings/page.tsx` — card baru "Notifikasi" berisi
      `&lt;PushNotificationToggle /&gt;`, ditaruh sebelum card Kategori
      Income
- [x] `app/api/cron/daily-reminder/route.ts` — dilindungi header
      `Authorization: Bearer $CRON_SECRET` (dicek manual, bukan lewat
      proxy.ts karena semua `/api/*` memang sudah dikecualikan dari
      proxy session-auth). Logic: hitung awal hari WIB (UTC+7, tanpa
      DST) dari waktu sekarang lewat `wibStartOfDayUtc()` (bukan pakai
      timezone server, karena Vercel Cron selalu jalan di UTC) → cari
      user yang SUDAH punya Expense sejak awal hari WIB itu → skip
      mereka → sisanya dikirimin push. Subscription yang gagal kirim
      dengan status 404/410 (sudah expired/di-uninstall) otomatis
      dihapus dari DB, error lain (mis. network) dibiarkan (jangan
      hapus subscription cuma karena gangguan sementara)
- [x] `vercel.json` baru — cron schedule `"0 5 * * *"` (05:00 UTC =
      12:00 WIB tiap hari). Vercel Hobby plan (gratis) cuma dukung
      cron granularity harian, pas dengan kebutuhan sekarang
- [x] `proxy.ts` — tambah `js` ke daftar ekstensi yang dikecualikan
      dari auth-gate (buat `/sw.js`). Alasan: browser bisa refetch file
      service worker ini kapan saja secara otomatis (cek update),
      termasuk saat session cookie sudah expired — kalau ke-block jadi
      redirect ke `/login`, HTML halaman login itu malah kesimpen
      sebagai "isi" service worker dan bikin push rusak
- [x] Verifikasi lewat akun uji: register → subscribe pakai fake push
      subscription → `sw.js` bisa diakses selagi authenticated → cron
      dipanggil dengan secret salah (401) dan benar (200, cerminan
      `{totalSubscriptions:1, alreadyLogged:0, sent:0, removed:0}` —
      `sent`/`removed` 0 karena endpoint fake gagal connect, bukan
      404/410, jadi sengaja TIDAK dihapus — perilaku konservatif yang
      benar) → tambah Expense hari ini → cron ulang →
      `alreadyLogged` naik jadi 1, otomatis skip kirim; data &amp;
      subscription uji dibersihkan
- [x] tsc, eslint, `pnpm build` bersih (build nunjukkin semua route
      baru: `/api/cron/daily-reminder`, `/api/push/subscribe`,
      `/settings` ke-update)

**Belum dikerjakan / catatan buat production**: setelah di-push, user
perlu manual nambahin `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
`CRON_SECRET` ke Vercel project env vars (Production + Preview) sebelum
fitur reminder aktif beneran di sana — tanpa itu endpoint cron balas 500
(VAPID belum dikonfigurasi) dan toggle di Settings tetap tampil tapi
subscribe-nya bakal gagal diam-diam kalau publicKey kosong di client.

### Bug ditemukan saat verifikasi manual: service worker "nyangkut" di waiting

User tes manual di device sendiri (akun dendijuliano2016@gmail.com) —
aktifkan notifikasi berhasil (subscription tersimpan di DB, endpoint FCM
asli), tapi test-push nggak muncul di layar. Root cause: `chrome://
inspect`/DevTools Application → Service Workers nunjukkin ada DUA versi
terdaftar — versi lama (`#8573`, dari sesi jauh sebelumnya) masih
"activated and running" ngontrol tab, versi baru (`#9037`, `sw.js` yang
baru ditulis) "waiting to activate". Push event dari FCM jatuh ke SW versi
LAMA yang belum punya push handler → tidak ada yang nampilin notifikasi.

- [x] `public/sw.js` — tambah `self.skipWaiting()` di event `install`
      dan `self.clients.claim()` di event `activate`, supaya versi baru
      SW langsung aktif otomatis begitu ke-install (tidak nunggu semua
      tab lama ditutup dulu) — mencegah masalah yang sama kejadian lagi
      tiap kali `sw.js` di-update ke depannya
- [x] Diverifikasi: user klik "skipWaiting" manual di DevTools sekali
      buat versi yang sudah kepalang nyangkut, abis itu re-send test
      push → notifikasi "Pundi — Tes Notifikasi" muncul di layar,
      konfirmasi seluruh pipeline (VAPID → FCM → service worker →
      notifikasi tampil) jalan end-to-end

## Fase 54b — Reminder Budget Belum Diisi di Awal Bulan (masih gratis)

User minta tambahan: selain reminder harian, juga ada reminder di awal
bulan buat user yang belum atur budget bulan itu. Digabung ke cron yang
SAMA (`/api/cron/daily-reminder`, masih jadwal harian 12:00 WIB) —
bukan bikin cron baru — biar tidak perlu nambah entry di `vercel.json`
(hemat kalau plan Vercel gratis ada batas jumlah cron job) dan tetap 1x
trigger per hari yang ngurus dua jenis notifikasi.

- [x] `app/api/cron/daily-reminder/route.ts` — direfactor: helper
      `sendPush()` dipisah (dipakai bareng buat dua jenis notifikasi,
      termasuk logic hapus subscription kalau statusnya 404/410).
      Tambahan logic: `isStartOfMonth` true kalau tanggal WIB sekarang
      ≤3 (bukan cuma pas tanggal 1 — biar user yang kelewat notifikasi
      hari pertama masih ke-reminder beberapa hari lagi, otomatis
      berhenti begitu budget-nya diisi). Kalau `isStartOfMonth`, cek
      tiap subscriber lewat `getMonthlyBudgetOrDraft(userId,
      currentMonth)` — kalau `isNew` true (belum ada `MonthlyBudget`
      tersimpan buat bulan itu, masih draft/propagated preview aja),
      kirim notifikasi kedua mengarah ke `/budget`
- [x] Response cron sekarang lebih detail:
      `{totalSubscriptions, alreadyLoggedToday, isStartOfMonth,
      budgetPending, expenseReminderSent, budgetReminderSent, removed}`
      — dua angka `Sent` terpisah biar gampang dibedain jenis
      notifikasi mana yang berhasil kirim
- [x] Verifikasi lewat akun uji: register baru (otomatis belum ada
      budget bulan ini) → subscribe fake → cron run → `budgetPending:1`
      (terdeteksi benar); simpan budget Juli lewat
      `PUT /api/monthly-budget` → cron run lagi → `budgetPending:0`
      (otomatis berhenti begitu budget tersimpan, termasuk konfirmasi
      propagasi Fase 39 ikut nyimpen 24 bulan ke depan sekaligus jadi
      alasan kenapa user aktif jarang kena reminder ini — cuma relevan
      buat user baru/yang belum pernah isi Budget sama sekali)
- [x] tsc, eslint, `pnpm build` bersih; data &amp; subscription uji
      dibersihkan

**Catatan**: env var Vercel (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`,
`VAPID_PRIVATE_KEY`, `CRON_SECRET`) sudah ditambahkan user ke project
settings — tinggal nunggu commit+push &amp; deploy buat fitur aktif di
production.

## Fase 55 — Bug: Input Tanggal di "Tambah Pengeluaran" Beda Tinggi di iOS

User laporan screenshot dari iPhone (Safari): kotak "Tanggal" di modal
Tambah Pengeluaran keliatan lebih besar/tinggi dari kotak "Kategori" di
sebelahnya, walau keduanya sama-sama `h-10` di CSS.

- [x] Percobaan pertama (salah diagnosis): dikira artefak rendering dari
      kombinasi `backdrop-blur` di `DialogOverlay` + `bg-transparent`
      di `Input` native `type="date"` — sempet ditambahin
      `appearance-none bg-background`, tapi user klarifikasi masalahnya
      soal TINGGI, bukan rendering/background
- [x] Root cause sebenarnya: `&lt;input type="date"&gt;` itu kontrol
      NATIVE dari OS — di iOS Safari, tinggi kontrol native ini sering
      tidak nurut `height`/`h-10` dari CSS kita (dia punya tinggi
      intrinsik sendiri buat nampilin segmen day/month/year), beda
      sama `SelectTrigger` yang murni elemen custom kita jadi presisi
      ikut `h-10`. Ini keterbatasan platform, bukan bug CSS yang bisa
      dipatch dengan className
- [x] Fix: install `components/ui/calendar.tsx` + `popover.tsx` (shadcn,
      nambah dependency `react-day-picker` + `date-fns`), ganti input
      native jadi `&lt;Popover&gt;` + `&lt;Calendar mode="single"&gt;`
      dipicu tombol `&lt;Button variant="outline"&gt;` — karena ini
      elemen custom (bukan native), tingginya presisi ikut `h-10`
      default Button, PERSIS sama kayak `SelectTrigger` di semua
      platform (bukan cuma "biasanya sama")
- [x] `components/add-expense-dialog.tsx` — tambah helper
      `parseISODate`/`toISODate` buat convert antara string
      `"YYYY-MM-DD"` (format yang dipakai state `date` &amp; body API,
      tidak diubah) dengan `Date` object (yang dipakai
      `Calendar`/`toLocaleDateString`). Kalender pakai locale Indonesia
      (`date-fns/locale` → `id`)
- [x] tsc, eslint bersih. Belum sempat `pnpm build` ulang (dev server
      lagi dipakai user buat tes notifikasi, dihindari supaya tidak
      ganggu sesi aktifnya) — cukup diverifikasi tsc/eslint + smoke
      test curl ke dev server yang jalan (Turbopack hot-reload)

## Fase 56 — Pengeluaran Berulang (Recurring Expenses)

User pilih arah pengembangan berikutnya: kurangi friksi input manual
buat pengeluaran yang berulang tiap bulan (subscription, tagihan).
Direncanakan lewat plan mode dulu sebelum eksekusi — dua keputusan
scope yang dikonfirmasi user: **semi-otomatis** (push notification
"konfirmasi?", bukan auto-create langsung — hindari resiko nominal
salah kalau tagihan berubah kayak listrik) dan kategori **selalu
"Lain-lain"** (karena "Makan" sudah punya sistem jatah harian sendiri).

- [x] `models/RecurringExpense.ts` — `{userId, name, amount,
      dayOfMonth (1-31), active (default true)}`, timestamps, index
      `userId`. Ikutin persis konvensi `AllocationCategory.ts`
- [x] `app/api/recurring-expenses/route.ts` (GET list, POST create) +
      `[id]/route.ts` (GET single — dipakai buat prefill dialog
      konfirmasi, PATCH, DELETE) — semua di-scope `{_id, userId}`,
      ikutin pola persis `allocation-categories` routes
- [x] `app/(app)/settings/page.tsx` — card baru **"Pengeluaran
      Berulang"**, CRUD lengkap (list + edit-inline + delete + toggle
      aktif/nonaktif pakai icon Pause/Play) replikasi persis pola
      Kategori Alokasi yang sudah ada, cuma nambah `CurrencyInput`
      (nominal) dan `Select` tanggal 1-31 (BUKAN native number/date
      input — konsisten sama fix Fase 55 yang menghindari kontrol
      native karena rendering tidak konsisten lintas platform)
- [x] `app/api/cron/daily-reminder/route.ts` — diperluas LAGI (bukan
      cron/`vercel.json` entry baru, konsisten sama pola Fase 54b):
      query `RecurringExpense` yang `active:true` &amp;
      `dayOfMonth === wibNow(now).getUTCDate()`, dikelompokkan per user
      (satu user bisa punya beberapa item jatuh tempo bareng hari yang
      sama), kirim push per-item ke `/dashboard?confirmRecurring=<id>`.
      **Reminder cuma dikirim SEKALI di tanggal jatuh tempo** (tidak
      ada logic "nge-nag" berulang tiap hari kalau kelewat, beda dari
      pola `budgetPending` — sengaja simple di V1, biar tidak
      menyebabkan notifikasi spam kalau user lupa konfirmasi berhari-
      hari). Response cron nambah field `recurringDue` &amp;
      `recurringReminderSent`
- [x] `components/add-expense-dialog.tsx` — di-extend dukung mode
      **controlled** (`open`/`onOpenChange` opsional dari parent,
      `trigger` jadi opsional) + prefill (`initialAmount`/
      `initialNote`) buat alur konfirmasi dari notifikasi. Prefill
      dilakukan lewat **lazy initializer** di `useState`
      (`useState(initialAmount ?? 0)`), BUKAN `useEffect` yang sync
      prop ke state — supaya tidak kena lint rule
      `react-hooks/set-state-in-effect` (React modern merekomendasikan
      key-remount buat kasus reset-state-dari-prop kayak gini, bukan
      effect). Konsekuensinya: pemanggil WAJIB kasih `key` yang unik
      per item (mis. `key={recurringPrefill.id}`) supaya komponennya
      remount fresh tiap kali dibuka buat item yang berbeda. Mode lama
      (uncontrolled, dipakai tombol "Input Pengeluaran" Fase 40) tetap
      jalan tanpa perubahan — backward-compatible penuh
- [x] `app/(app)/dashboard/page.tsx` — baca query param
      `?confirmRecurring=<id>` (`useSearchParams`), `GET
      /api/recurring-expenses/<id>` buat ambil detail, render
      `AddExpenseDialog` versi controlled dengan `key`+prefill. Setelah
      submit (`onSaved`) refresh data Dashboard; setelah dialog ditutup
      dengan cara apa pun (`onOpenChange(false)`) query param
      dibersihkan lewat `router.replace("/dashboard")` biar refresh
      halaman tidak membuka dialog itu lagi
- [x] Verifikasi lewat akun uji lengkap (register, subscribe fake push,
      curl langsung ke tiap route):
      - Buat `RecurringExpense` dengan `dayOfMonth` = tanggal WIB hari
        ini → cron → `recurringDue:1` (terdeteksi benar)
      - `GET /api/recurring-expenses/<id>` balas data yang benar
      - Cek expenses KOSONG sebelum simulasi tap-konfirmasi → POST
        `/api/expenses` (persis payload yang bakal dikirim dialog) →
        expenses TERISI benar sesudahnya — konfirmasi semi-otomatis
        (tidak ada auto-create diam-diam dari cron)
      - Ganti `dayOfMonth` ke tanggal lain (bukan hari ini) → cron →
        `recurringDue:0` (dikecualikan benar)
      - Kembalikan `dayOfMonth` ke hari ini TAPI set `active:false` →
        cron → `recurringDue:0` (dikecualikan meski tanggal cocok,
        karena nonaktif)
      - Data uji &amp; subscription dibersihkan; dicek juga tidak ada
        sisa data uji lain nyangkut dari sesi-sesi sebelumnya (cuma
        2 subscription asli milik akun real yang tersisa)
- [x] tsc, eslint bersih di seluruh project (bukan cuma file yang
      disentuh)

### Follow-up: Konfirmasi Langsung Kalau Tanggal Jatuh Tempo = Hari Ini

Gap yang disadari user: kalau item baru ditambahkan dengan `dayOfMonth`
persis hari ini, reminder push barunya baru kekirim di siklus cron
berikutnya (besok, atau malah bulan depan kalau jam 12 siang sudah
lewat) — jadi transaksi bulan ini bisa kelewat kalau tidak dicatat
manual.

- [x] `app/(app)/settings/page.tsx` — `handleAddRecurringExpense`
      sekarang baca response `POST` yang baru dibuat; kalau
      `created.dayOfMonth === new Date().getDate()` (perbandingan
      pakai tanggal LOKAL browser, bukan WIB-aware seperti di cron —
      cukup buat kenyamanan UI, bukan perhitungan server), langsung
      munculkan `AddExpenseDialog` yang sama (controlled + prefill,
      pola persis yang dipakai alur konfirmasi dari notifikasi push)
      supaya user bisa langsung catat kejadian bulan ini tanpa nunggu
      notifikasi. Tetap semi-otomatis — user masih review/edit &amp;
      klik "Simpan" sendiri, tidak ada auto-create
- [x] tsc, eslint bersih di seluruh project

### Follow-up: Judul Modal Kontekstual + Konfirmasi Sebelum Tertutup Tidak Sengaja

User laporan: dialog "Konfirmasi Pengeluaran Berulang" ini judul/
deskripsinya masih generik ("Tambah Pengeluaran"), bikin bingung kenapa
modal itu muncul tiba-tiba. Lalu ketika modalnya kepencet ke-close tidak
sengaja (klik sembarang di luar/backdrop), tidak ada cara buat
memunculkannya lagi — beda dari alur "Input Pengeluaran" biasa yang
tombolnya masih ada kapan saja.

- [x] `components/add-expense-dialog.tsx` — tambah prop opsional
      `title`/`description` (override teks generik `DialogTitle`/
      `DialogDescription`, default tetap sama kalau tidak dikasih —
      backward-compatible)
- [x] `app/(app)/settings/page.tsx` &amp; `app/(app)/dashboard/page.tsx`
      — kedua render-site alur konfirmasi (immediate-confirm pas nambah
      &amp; confirm dari notifikasi push) sekarang kasih
      `title="Konfirmasi Pengeluaran Berulang"` + `description` yang
      nyebut nama item &amp; alasan modal itu muncul
- [x] `components/ui/alert-dialog.tsx` diinstall (shadcn, pakai package
      `radix-ui` yang sudah ada — tidak nambah dependency baru)
- [x] `add-expense-dialog.tsx` — prop baru `confirmOnClose` (dipasang
      cuma di dua render-site konfirmasi pengeluaran berulang, TIDAK di
      tombol "Input Pengeluaran" biasa). Kalau true, percobaan nutup
      lewat backdrop/X/Escape (`onOpenChange(false)` dari Radix) di-gate
      lewat `AlertDialog` "Batalkan konfirmasi ini?" dulu — user harus
      pilih "Ya, batalkan" baru beneran tertutup. Sengaja dipisah dari
      jalur sukses-simpan (`handleSubmit` tetap manggil `setOpen(false)`
      langsung, tidak lewat gate ini) biar submit normal tidak ikut
      keganggu konfirmasi tambahan
- [x] tsc, eslint bersih di seluruh project; tidak ada dependency npm
      baru (alert-dialog pakai package `radix-ui` yang sudah terinstall)

### Follow-up: Konfirmasi Sebelum Hapus di Settings

- [x] `components/confirm-delete-button.tsx` (baru) — komponen reusable
      `ConfirmDeleteButton` (icon Trash2 + `AlertDialog`), terima
      `title`/`description` custom per pemakaian supaya penjelasannya
      akurat ke konteks masing-masing (bukan cuma "tidak bisa
      dibatalkan" generik)
- [x] `app/(app)/settings/page.tsx` — 3 tombol hapus (Kategori Income,
      Kategori Alokasi, Pengeluaran Berulang) diganti pakai
      `ConfirmDeleteButton`. Deskripsi kategori Income/Alokasi sengaja
      menyebut perilaku no-cascade yang sudah ada (lihat memory
      `feedback_category_delete_no_cascade`) — jumlah yang sudah
      tersimpan di bulan-bulan sebelumnya TETAP ada, cuma kategorinya
      yang hilang dari daftar — biar user tidak kaget kayak kejadian
      Fase 43
- [x] tsc, eslint bersih di seluruh project

## Fase 57 — Dark Mode

Direncanakan lewat plan mode. Riset awal nemuin kejutan: `app/
globals.css` SUDAH punya blok `.dark` lengkap (semua token
`--background`/`--card`/`--muted`/`--sidebar*` dst sudah ada versi
gelapnya) dan `@custom-variant dark (&amp;:is(.dark *));` sudah
dideklarasikan, PLUS `next-themes` sudah ada di `package.json`
(`^0.4.6`) dan `components/ui/sonner.tsx` sudah manggil `useTheme()`
duluan — berarti ada sesi sebelumnya yang naruh groundwork ini tapi
tidak pernah nyambungin `ThemeProvider`-nya. Jadi kerjanya jauh lebih
kecil dari perkiraan awal.

- [x] `app/providers.tsx` — bungkus `SessionProvider` dengan
      `ThemeProvider` dari `next-themes` (`attribute="class"`,
      `defaultTheme="system"`, `enableSystem`)
- [x] `app/layout.tsx` — tambah `suppressHydrationWarning` di `<html>`
      (wajib buat next-themes, `class="dark"` di-inject client-side
      jadi beda dari markup server)
- [x] `components/theme-toggle.tsx` (baru) — `Select` 3 opsi (Terang/
      Gelap/Ikuti Sistem) pakai `useTheme()`. Ada "mounted guard" pola
      baku next-themes (render placeholder sebelum client mount, biar
      tidak hydration-mismatch) — ini genuinely butuh `useEffect` +
      `setState`, ditambahin `eslint-disable-next-line
      react-hooks/set-state-in-effect` sekali dengan komentar alasan
      (tidak ada cara lain deteksi "sudah hydrate belum" di React)
- [x] Card baru **"Tampilan"** di `app/(app)/settings/page.tsx`,
      ditaruh sebelum card Notifikasi
- [x] Verifikasi: tsc, eslint bersih; smoke test curl (halaman render
      200, tidak ada crash dari provider baru). Verifikasi visual
      tema gelap di ~13 file yang punya gradient/`bg-white` (hero
      card, landing, onboarding, dst) diserahkan ke user langsung
      (`feedback_no_playwright_screenshots`) — sebagian besar itu
      kartu gradient brand yang memang didesain vibrant di kedua tema

## Fase 58 — Target Tabungan (Savings Goal)

Fitur baru: user catat kontribusi MANUAL ke tujuan nabung spesifik
(beda dari alokasi "Investasi" bulanan rutin yang sudah ada), bisa
banyak goal sekaligus, halaman baru sendiri di sidebar (bukan numpang
Dashboard) — tiga keputusan ini dikonfirmasi user lewat AskUserQuestion
sebelum eksekusi.

- [x] `models/SavingsGoal.ts` — `{userId, name, targetAmount,
      targetDate (opsional)}`, ikutin konvensi `AllocationCategory.ts`
- [x] `models/SavingsContribution.ts` — `{userId, goalId, amount, date
      (default now), note (opsional)}`, index `{userId, goalId}`
- [x] `app/api/savings-goals/route.ts` (GET list dengan progress
      dihitung on-the-fly via `SavingsContribution.aggregate`
      `$group`/`$sum` per `goalId` — bukan field ter-cache, pola sama
      kayak `getMonthBreakdown` yang jumlahin `Expense` tiap request;
      POST create) + `[id]/route.ts` (GET/PATCH/DELETE — DELETE
      **cascade** hapus semua `SavingsContribution` terkait, beda dari
      pola no-cascade `AllocationCategory` karena kontribusi murni
      running-log tanpa konsep snapshot historis yang perlu dijaga) +
      `[id]/contributions/route.ts` (GET list, POST tambah) +
      `[id]/contributions/[contributionId]/route.ts` (DELETE, buat
      koreksi kalau salah catat)
- [x] `components/app-shell.tsx` — nav item baru "Target" (icon
      `Target` dari lucide, sengaja beda dari `PiggyBank` yang sudah
      jadi logo app) masuk ke grup "Input" (sejajar Pengeluaran &amp;
      Budget), otomatis kepakai di sidebar desktop &amp; bottom tab
      bar mobile sekaligus (satu sumber `NAV_GROUPS`)
- [x] `app/(app)/target/page.tsx` (halaman baru) — grid Card per goal:
      progress bar, terkumpul/target, persentase &amp; sisa, badge
      "Tercapai" kalau sudah lunas. Tombol "Tambah Kontribusi" per
      goal (dialog kecil: `CurrencyInput`, catatan opsional, tanggal
      via Popover+Calendar — bukan native date input, konsisten sama
      fix Fase 55). Riwayat kontribusi collapsible per goal, tiap
      entry ada `ConfirmDeleteButton` (dari Fase 56 follow-up) buat
      koreksi. Edit/hapus goal juga pakai `ConfirmDeleteButton` dengan
      deskripsi yang jelasin kontribusi ikut terhapus. Form tambah goal
      baru di bagian bawah halaman
- [x] Verifikasi lewat akun uji: buat goal (target Rp5jt) → tambah 2
      kontribusi (1jt + 500rb) → `GET /api/savings-goals` balas
      `contributed:1500000` (benar) → hapus 1 kontribusi → balas
      `contributed:1000000` (ter-update benar) → hapus goal-nya →
      `GET` balas array kosong → dicek langsung ke MongoDB: 0 goals
      &amp; 0 contributions tersisa (cascade delete terkonfirmasi
      benar-benar jalan, bukan cuma goal-nya yang hilang dari list)
- [x] tsc, eslint bersih di seluruh project; data uji dibersihkan

### Follow-up: Kontribusi Ikut Tercatat sebagai Pengeluaran

User sadar gap: kontribusi ke Target Tabungan sebelumnya sama sekali
tidak nyentuh `Expense`, jadi uang yang beneran keluar buat ditabung
seolah "menghilang" — Total Bersih/sisa budget di Dashboard jadi
kelihatan lebih besar dari kenyataan. Diputuskan: kontribusi otomatis
ikut tercatat sebagai `Expense` kategori "lain-lain".

- [x] `models/SavingsContribution.ts` — field baru `expenseId`
      (opsional, ref `Expense`) buat nge-link kontribusi ke Expense
      yang otomatis dibuat
- [x] `app/api/savings-goals/[id]/contributions/route.ts` (POST) —
      bikin `Expense` dulu (`category:"lain-lain"`, `note:"Nabung: {nama
      goal}"`, amount &amp; date sama persis) baru `SavingsContribution`
      dengan `expenseId` menunjuk ke situ
- [x] `.../contributions/[contributionId]/route.ts` (DELETE) — kalau
      kontribusinya punya `expenseId`, Expense terkait ikut dihapus
      (ini "koreksi salah catat", representasi kejadian yang sama)
- [x] `.../savings-goals/[id]/route.ts` (DELETE goal) — SENGAJA TIDAK
      diubah buat ikut cascade ke Expense — beda dari hapus kontribusi
      individual. Alasan: hapus goal cuma berarti "berhenti nge-track
      progress", bukan "kontribusi yang sudah terjadi dianggap tidak
      pernah ada" — prinsip yang sama kayak kenapa hapus kategori tidak
      mencabut nominal di `MonthlyBudget` bulan-bulan lalu
      (`feedback_category_delete_no_cascade`)
- [x] `app/(app)/target/page.tsx` — teks `ConfirmDeleteButton` &amp;
      `DialogDescription` diperbarui biar jelas bedanya dua perilaku
      delete ini (goal vs kontribusi individual)
- [x] **Ketemu lagi bug "Mongoose model cache stale"**
      (`feedback_restart_dev_after_schema_change`) — field `expenseId`
      baru tidak muncul di response API sampai dev server di-restart,
      walau kode model sudah benar dari awal. Restart dev server (punya
      user, sudah jalan 33 menit) menyelesaikannya
- [x] Verifikasi lewat akun uji: tambah kontribusi → `Expense` otomatis
      kebuat (`category:"lain-lain"`, note benar) → hapus kontribusi
      itu → `Expense`-nya ikut hilang → tambah kontribusi lagi → hapus
      GOAL-nya (bukan kontribusinya) → `Expense` yang sudah tercatat
      tadi TETAP ADA (perilaku no-cascade terkonfirmasi benar)
- [x] tsc, eslint bersih di seluruh project; data uji dibersihkan

### Follow-up: Bottom Tab Bar Mobile Belum Ada "Target"

User sadar: `MOBILE_NAV_ITEMS` di `components/app-shell.tsx` itu daftar
statis 5 href — "/target" tidak ada di situ, dan tidak ada menu
overflow lain di mobile, jadi halaman Target sama sekali tidak bisa
diakses di mobile kecuali ketik URL manual. Dikasih 3 opsi lewat
AskUserQuestion, user pilih: ganti Reports jadi tab "More".

- [x] `MOBILE_NAV_ITEMS` sekarang cuma 4 href tetap:
      `/dashboard`, `/expenses`, `/budget`, `/target`
- [x] Slot ke-5 grid jadi tombol **"More"** (icon `MoreHorizontal`) —
      buka `DropdownMenu` (side="top", biar muncul ke atas dari bottom
      bar) isinya Reports, Settings, Admin (kalau admin), Panduan,
      Hubungi, Keluar — konsolidasi navigasi sekunder yang sebelumnya
      cuma ada di dropdown avatar header mobile
- [x] `MORE_MENU_ROUTES` (`/reports`, `/settings`, `/admin`, `/panduan`)
      dipakai buat nyalain highlight tab "More" pas user lagi di salah
      satu halaman itu — sama kayak tab lain yang nyala pas aktif
- [x] Dropdown avatar di header mobile (atas) TIDAK diubah — masih ada
      Panduan/Hubungi/Admin/Keluar di situ juga, jadi sedikit redundan
      sama menu "More" yang baru, tapi tidak apa-apa (dua akses ke aksi
      yang sama, bukan bug)
- [x] tsc, eslint bersih di seluruh project; smoke test curl konfirmasi
      server tetap sehat sesudah perubahan

### Follow-up: Redesign Visual Bottom Tab Bar Mobile

User minta tampilan bottom nav lebih modern/estetik. Sempat didiskusikan
opsi speed-dial/FAB radial (kayak referensi gambar user) — saya
rekomendasikan TIDAK ke arah itu (6 item ketinggian buat busur radial
yang idealnya 3-4 shortcut, campuran navigasi+aksi butuh label teks,
dan tidak ada "celah tengah" di grid 5-kolom yang ada buat naruh FAB
tanpa restrukturisasi total) — user setuju, minta reuse bahasa desain
yang sudah ada aja.

- [x] `components/app-shell.tsx` — bottom tab bar jadi **floating
      pill**: `bottom-3 inset-x-3` (bukan `bottom-0 inset-x-0` rata
      tepi), `rounded-2xl` + `shadow-lg shadow-black/5` — sama pola
      navbar landing page (Fase 46)
- [x] Tab aktif ganti dari `bg-emerald-100` pudar jadi gradient
      `from-emerald-500 to-teal-600` + ikon putih + shadow tipis — sama
      persis treatment tab aktif di sidebar desktop, biar mobile &amp;
      desktop konsisten. Ukuran chip ikon dinaikkan `size-7`→`size-8`
      biar sepadan sama gradient yang lebih "berani"
- [x] Tambah `transition-transform active:scale-95` di tiap tab (incl.
      trigger "More") — animasi tekan kecil, murni CSS tanpa dependency
      baru
- [x] `pb-20`→`pb-24` di `<main>` — bar sekarang punya margin bawah
      sendiri (`bottom-3`), padding konten perlu sedikit lebih besar
      biar tidak ketutupan
- [x] tsc, eslint bersih di seluruh project; smoke test curl

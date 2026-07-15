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

## Fase 59 — Update Panduan &amp; Landing Page (Fitur-Fitur Baru)

Banyak fitur baru ditambahkan sesi ini (notifikasi, pengeluaran
berulang, target tabungan, insight otomatis, dark mode) tapi belum
kesebut di halaman Bantuan (in-app) maupun landing page publik.

- [x] `app/(app)/panduan/page.tsx` — array baru `EXTRA_FEATURES` (5
      item: Notifikasi Pengingat, Pengeluaran Berulang, Target
      Tabungan, Insight Otomatis, Tema Gelap), section baru "Fitur
      Tambahan" ditaruh setelah STEPS (5 langkah setup awal) dan
      sebelum card FAQ — sengaja TIDAK dimasukkan ke STEPS supaya
      urutan onboarding sekuensial yang sudah ada tidak terganggu (ini
      "fitur opsional", bukan "langkah wajib"). Reuse persis pola JSX
      Card yang sama kayak STEPS (IconChip + CardTitle/Description +
      tombol link)
- [x] 2 FAQ baru ditambahin ke `FAQS`: kenapa kontribusi Target
      Tabungan ikut muncul di Pengeluaran (jawab dari diskusi user
      sebelumnya soal desain ini), dan kenapa belum dapat notifikasi
      kalau belum diaktifkan manual di Settings
- [x] `app/page.tsx` (landing page publik) — 5 entry baru ditambah ke
      `FEATURES` (dari 6 jadi 11 total): Pengingat Otomatis,
      Pengeluaran Berulang, Target Tabungan, Insight Otomatis, Tema
      Gelap. Section "Cara Kerja" (4 langkah) TIDAK diubah — sama
      alasan kayak Panduan, itu alur setup inti bukan daftar fitur
- [x] tsc, eslint bersih di seluruh project; smoke test curl konfirmasi
      landing page (200, public route) &amp; Panduan (307 redirect ke
      login, expected karena request tanpa session) tetap sehat

## Fase 60 — Redesign Section Fitur Landing Page (Dua Tingkat)

User merasa hasil Fase 59 (11 fitur rata di satu grid) kurang oke —
fitur inti jadi tenggelam sama fitur pelengkap. Direncanakan lewat plan
mode, user kasih izin "kalau dirombak besar hasilnya lebih baik,
lakukan saja" termasuk kalau perlu screenshot baru.

- [x] `app/page.tsx` — `FEATURES` dipecah jadi `CORE_FEATURES` (6 item
      asli, treatment TIDAK berubah — kartu besar `rounded-3xl p-6`,
      deskripsi lengkap) dan `BONUS_FEATURES` (5 item baru, treatment
      kompak — `rounded-2xl px-5 py-4` flex-row, cuma judul tanpa
      deskripsi, grid rapat `grid-cols-5` di desktop). Bonus features
      ditaruh di bawah core dalam section yang sama, dipisah
      sub-heading "Makin Lengkap"
- [x] `SCREENSHOTS` — tambah entry baru **"Target Tabungan"** (`src:
      "/target.jpeg"`) — **file ini belum ada, user yang akan
      menyediakan gambarnya** (pola sama kayak 3 screenshot lain yang
      sudah ada di `/public`). Grid diubah dari `md:grid-cols-3` jadi
      `sm:grid-cols-2 lg:grid-cols-4` biar rapi buat 4 gambar
- [x] Hero, Cara Kerja (4 langkah), Final CTA, Footer sengaja TIDAK
      disentuh — alasan sama kayak Fase 59 (sudah solid/tidak terkait)
- [x] tsc, eslint bersih di seluruh project; smoke test curl (200);
      `pnpm build` sukses walau `/public/target.jpeg` belum ada
      (Next Image asset publik, bukan static import — tidak bikin
      build gagal, cuma gambar patah di browser sampai file ditaruh)
- [x] User sediakan `public/target.jpeg` — dikonfirmasi ke-serve benar
      (curl 200), screenshot Target Tabungan sekarang tampil di
      section Tampilan

## Fase 61 — Nudge Fitur Baru di Akhir Onboarding

Gap yang disadari: user baru yang selesai wizard onboarding (5 langkah:
welcome→income→jatah makan→alokasi→selesai) sama sekali tidak tahu ada
notifikasi pengingat/Target Tabungan/Pengeluaran Berulang — cuma bisa
ketemu sendiri lewat Settings/Panduan. Padahal push notification
reminder itu fitur retensi utama yang percuma kalau tidak pernah
diaktifkan user baru.

- [x] `app/onboarding/page.tsx` — step "done" (terakhir) ditambah
      section baru di bawah 2 tombol CTA yang sudah ada
      ("Isi Budget Sekarang"/"Nanti Saja"): heading kecil "Biar makin
      gampang dipakai" + `&lt;PushNotificationToggle /&gt;` (reuse
      LANGSUNG komponen yang sudah ada, dipakai juga di Settings —
      tidak ada duplikasi logic sama sekali) + teks singkat nyebutin
      Target Tabungan &amp; Pengeluaran Berulang bisa dicoba lewat
      sidebar (bukan tombol navigasi baru, biar tidak bersaing sama
      2 CTA utama yang sudah ada)
- [x] Sengaja BUKAN step baru di `STEPS` array (tetap 5 langkah,
      progress bar tidak berubah) — cuma nambah konten di step
      terakhir yang sudah ada, sesuai arahan "nudge kecil" bukan
      onboarding tambahan yang lebih panjang
- [x] tsc, eslint bersih di seluruh project; smoke test curl (307
      redirect ke login, expected — `/onboarding` protected route)

## Fase 62 — Banner Ajakan Bikin Target Tabungan di Dashboard

User minta banner di Dashboard yang ngajak bikin Target Tabungan,
tapi CUMA muncul kalau user belum punya target sama sekali, dan
maksimal 1x per hari (ditutup → muncul lagi besok). Ditanya dulu lewat
AskUserQuestion soal penyimpanan status "sudah ditutup" — user pilih
localStorage (bukan DB), trade-off disepakati: per-browser/device,
bukan per-akun.

- [x] `components/savings-goal-nudge-banner.tsx` (baru) — cek
      `localStorage["pundi-savings-banner-dismissed"]` (nyimpen
      tanggal LOKAL browser, format `YYYY-MM-DD`); kalau sama dengan
      hari ini, skip (jangan fetch apa-apa). Kalau beda/belum ada,
      `GET /api/savings-goals` — tampilkan banner cuma kalau array-nya
      kosong. Tombol close nyimpen tanggal hari ini ke localStorage
      lalu sembunyiin bannernya
- [x] `app/(app)/dashboard/page.tsx` — render `&lt;SavingsGoalNudgeBanner
      /&gt;` sekali di luar percabangan mode Bulanan/Tahunan (jadi
      konsisten muncul di kedua mode), setelah header judul, sebelum
      konten yang bergantung ke `loading`/`monthlySummary` — banner ini
      fetch datanya sendiri, tidak nunggu data dashboard lain selesai
      loading
- [x] tsc, eslint bersih di seluruh project; smoke test curl. Logic
      inti (goals kosong → true/false) sudah diverifikasi lewat test
      `/api/savings-goals` di Fase 58 sebelumnya; bagian localStorage-nya
      murni client-side, perlu dicek manual di browser (ganti tanggal
      sistem atau tunggu besok buat lihat banner muncul lagi)

## Fase 63 — Export Laporan Keuangan Tahunan (PDF)

Direncanakan lewat plan mode. Dikonfirmasi lewat AskUserQuestion: format
PDF, per tahun, ada verdict kesehatan keuangan otomatis
(Sehat/Perlu Perhatian/Waspada). Khusus admin bisa export laporan milik
member dalam family-nya juga.

- [x] `pnpm add @react-pdf/renderer` — dependency PDF pertama di
      codebase ini (belum pernah ada export/PDF apa pun sebelumnya)
- [x] `lib/financialReport.ts` — `getAnnualFinancialReport(userId,
      year)` reuse `getYearlyDashboardSummary` + `getYearlyInvestmentData`
      yang SUDAH ADA (tidak re-derive angka dari nol), hitung
      `savingsRate` (realisasi investasi ÷ income), `adherenceRate`
      (bulan tidak melenceng ÷ 12), verdict lewat rule-of-thumb (≥20%
      &amp; ≥75% → Sehat; ≥10% atau ≥50% → Perlu Perhatian; selain itu
      Waspada)
- [x] `lib/dashboardSummary.ts` — `getYearlyDashboardSummary`'s
      `months[]` diperluas nambah `totalIncome`/`totalAllocation` per
      bulan (sebelumnya cuma ada di agregat tahunan, bukan per-bulan) —
      perubahan ADDITIVE, tidak ada consumer lama yang somehow bisa
      "break" cuma karena ada field baru
- [x] `lib/pdf/AnnualFinancialReportPdf.tsx` — dokumen PDF pakai
      `@react-pdf/renderer` (`Document`/`Page`/`View`/`Text`/
      `StyleSheet`), styling netral/formal (hitam-abu-abu, bukan
      gradient warna-warni ala landing page) biar berasa dokumen resmi:
      Ringkasan Eksekutif (4 kotak stat + badge verdict berwarna),
      Laporan Ringkasan gaya Laba Rugi, tabel Rincian Bulanan 12 baris,
      Analisis Investasi (kondisional), Indikator Kesehatan Keuangan +
      disclaimer eksplisit "bukan nasihat finansial profesional",
      footer nomor halaman
- [x] `app/api/reports/export/route.ts` — pola auth PERSIS sama
      `dashboard-summary` routes (`getCurrentUser` 401 →
      `resolveAdminTargetUserId` buat family-scoped admin access →
      403/404). File tetap `.ts` (bukan `.tsx`, dukungan Next.js buat
      `route.tsx` tidak terdokumentasi jelas di versi ini) — pakai
      `createElement()` biar tidak butuh sintaks JSX; tipe parameter
      `renderToBuffer` diambil generik lewat `Parameters&lt;typeof
      renderToBuffer&gt;[0]` (bukan `any`) karena `DocumentProps`
      react-pdf tidak diekspor dari paketnya
- [x] `app/(app)/reports/page.tsx` — card baru "Export Laporan
      Keuangan" dekat header halaman, tombol "Export PDF (tahun)"
      pakai `&lt;a download&gt;` native (bukan fetch+blob manual, server
      sudah kirim `Content-Disposition:attachment`). Khusus admin:
      `Select` tambahan "Export untuk: Saya/[Nama Member]" (reuse
      `/api/admin/members` yang sudah ada, sama persis dipakai
      Dashboard) — SENGAJA cuma ngubah tombol export, tidak mengubah
      chart yang tampil di layar (di luar scope)
- [x] **2 bug ketemu &amp; diperbaiki dari inspeksi visual PDF hasil
      generate** (bukan cuma tsc/eslint, tapi benar-benar dibaca isi
      PDF-nya): (1) karakter "≥" di teks disclaimer render jadi huruf
      "e" yang salah — font Helvetica bawaan react-pdf tidak dukung
      glyph itu, diganti frasa "minimal X%" (aman lintas font, sekalian
      lebih mudah dibaca); (2) badge verdict "Perlu Perhatian"
      ke-hyphenate jadi "Perhat-ian" di tengah kata karena box-nya
      sempit — dimatikan lewat
      `Font.registerHyphenationCallback((word) => [word])` (matiin
      hyphenation, biarkan wrap utuh per kata) + font size verdict
      diperkecil dikit (15→13) biar lebih lega
- [x] Verifikasi lewat 2 akun uji (admin + member dalam family sama):
      export punya sendiri (200, PDF valid 2 halaman, header
      Content-Type/Content-Disposition benar) → admin export laporan
      member (200) → member coba export laporan admin lewat `?userId=`
      (403 Forbidden, ditolak benar) → admin coba `userId` acak/luar
      family (404, family boundary tetap ditegakkan) → no session sama
      sekali (401) → year param kosong (400). Semua skenario proteksi
      sesuai ekspektasi; data uji dibersihkan
- [x] tsc, eslint bersih di seluruh project

### Follow-up: Selector Admin Sekarang Nge-drive Seluruh Chart, Bukan Cuma Export

User tanya apakah lebih baik selector "Export untuk" juga ngubah chart
yang tampil di layar (bukan cuma pengaruh ke PDF) — saya setuju, alasan:
konsisten sama pola Dashboard (pilih member → semua data ikut berubah)
dan menghindari kebingungan selector-yang-cuma-pengaruh-ke-export tapi
chart di layar tetap punya sendiri.

- [x] `app/api/reports/yearly/route.ts`, `.../allocation/route.ts`,
      `.../investment/route.ts` — ketiganya diperluas pakai
      `resolveAdminTargetUserId` (pola PERSIS `dashboard-summary`),
      sebelumnya ketiganya hardcode `user.id` doang, sama sekali belum
      pernah support admin ngelihat data member lain
- [x] `app/(app)/reports/page.tsx` — `exportUserId` (state terpisah,
      cuma buat export) diganti jadi `selectedUserId`/`effectiveUserId`
      yang dipakai bareng buat SEMUA fetch chart (`yearly`,
      `allocation`, `investment`) DAN link export. Selector-nya
      dipindah dari dalam card Export ke header halaman (sejajar judul
      "Reports"), persis pola penempatan di Dashboard — judul halaman
      juga nunjukkin "Reports — [Nama Member]" pas admin lagi viewing
      punya member lain
- [x] Verifikasi lewat 2 akun uji (admin + member): seed income
      DISTINCTIVE (Rp77.777.000) di akun member → admin lihat laporan
      sendiri (semua 0, benar beda) → admin pakai `?userId=` ke member
      → `totalTarget`/`lainLainBudget` nunjukkin 77.777.000 (benar,
      data member yang kebaca, bukan data admin) → dicek juga di
      endpoint allocation &amp; investment (sama-sama benar) → member
      coba lihat data admin lewat `?userId=` → tetap 403 Forbidden
      (family-scoped access control tidak berubah/tidak bocor)
- [x] tsc, eslint bersih di seluruh project; data uji dibersihkan

## Fase 64 — Poles Desain Visual PDF Export

User minta desain export PDF dipoles dengan aksen warna dan/atau logo
brand (bukan minta rombak layout/isi laporan, murni polish visual),
sambil TETAP mempertahankan tone "laporan keuangan resmi" yang sudah
sengaja netral/formal (bukan jadi materi marketing gradasi warna-warni).

- [x] `lib/pdf/AnnualFinancialReportPdf.tsx` — tambah logo piggy-bank
      brand di header (chip bulat emerald berisi `Svg`/`Path` dari
      `@react-pdf/renderer`, reuse persis path SVG yang sama dipakai
      `lib/pwa-icon.tsx`/favicon/PWA icons di seluruh app, biar
      konsisten — bukan gambar terpisah)
- [x] Aksen warna emerald ditambah secukupnya, sengaja dibatasi biar
      tidak mendominasi: garis vertikal kecil (accent bar) di depan
      tiap judul section, border atas tipis warna emerald di 3 stat box
      polos ("Ringkasan Eksekutif" &amp; "Indikator Kesehatan
      Keuangan" — menyamai treatment box verdict yang sudah berwarna),
      tint hijau muda di background header tabel (`#ecfdf5`) dengan
      teks header jadi emerald gelap (`#065f46`) — kontras tetap jelas
      buat print/hitam-putih
- [x] **Bug ke-reintroduce &amp; ketauan sebelum ke-ship**: waktu edit
      pertama nambah komentar penjelasan palet warna, `Font.
      registerHyphenationCallback((word) => [word])` (fix hyphenation
      dari Fase 63) ke-hapus tanpa sengaja karena ada di tengah blok
      teks yang di-replace — ketauan dari warning eslint
      `'Font' is defined but never used`, langsung dikembalikan sebelum
      lanjut. Pengingat kalau eslint/tsc bisa nangkep regresi yang
      tidak kelihatan dari sekadar baca diff
- [x] Verifikasi via inspeksi visual PDF hasil generate (bukan cuma
      tsc/eslint — akun uji baru, seed 3 bulan data, hit
      `/api/reports/export?year=2026`, baca hasilnya langsung lewat
      Read tool): logo render bersih, accent bar &amp; tint tabel
      kebaca jelas, tidak ada regresi dari 2 bug Fase 63 (glyph "≥"
      &amp; hyphenation verdict) — semua tetap benar
- [x] tsc, eslint bersih; `pnpm build` sukses; data uji dibersihkan

## Fase 65 — Target Tabungan Kolaboratif (Shared Savings Goals)

User tertarik ide "collaborative savings goals" waktu diskusi arah
pengembangan berikutnya — target tabungan yang bisa dikontribusi lebih
dari satu anggota keluarga (mis. "Liburan Keluarga"), bukan cuma milik
satu akun kayak sebelumnya. Dikonfirmasi lewat AskUserQuestion: toggle
per-goal (Pribadi vs Bersama, bukan semua goal otomatis jadi bersama —
goal lama tetap Pribadi, tidak ada perubahan perilaku), dan izin
edit/hapus goal Bersama dibatasi ke pembuat goal + admin keluarga saja
(anggota lain cuma bisa lihat &amp; nambah kontribusi).

- [x] `models/SavingsGoal.ts` — tambah `familyId` (family pemilik goal)
      &amp; `shared` (boolean, default `false` — goal lama otomatis
      tetap Pribadi tanpa migrasi karena ternyata belum ada data
      `SavingsGoal` sama sekali di database sebelum fitur ini, dicek
      lewat script sekali-jalan sebelum nulis kode)
- [x] `lib/session.ts` — 2 helper baru `canAccessSavingsGoal` (pemilik
      ATAU goal Bersama + family sama) &amp; `canEditSavingsGoal`
      (pemilik ATAU (Bersama + admin + family sama)), dipakai konsisten
      di semua route `savings-goals`
- [x] Semua route `app/api/savings-goals/**` diperluas: `GET` list
      pakai `$or` (goal sendiri + goal Bersama family), total
      kontribusi per goal dihitung dari SEMUA kontributor (bukan cuma
      diri sendiri); `PATCH`/`DELETE` goal pakai `canEditSavingsGoal`
      (403 kalau accessible tapi tidak boleh edit, 404 kalau sama
      sekali tidak accessible); `DELETE` cascade kontribusi dari SEMUA
      kontributor; `GET/POST` kontribusi pakai `canAccessSavingsGoal`,
      GET kontribusi di-enrich nama kontributor (`UserModel.find` sekali
      buat semua distinct `userId`, hindari N+1)
- [x] **SENGAJA TIDAK diubah**: `DELETE` kontribusi individual tetap
      cuma boleh oleh kontributor aslinya (bukan admin/pembuat goal) —
      hapus kontribusi ikut menghapus `Expense` terkait, dan `Expense`
      adalah data budget pribadi satu akun yang tidak boleh disentuh
      user lain lewat jalur ini, meski goal-nya Bersama
- [x] `app/api/family-members/route.ts` (baru) — endpoint ringan
      terbuka buat SEMUA anggota keluarga login (beda dari
      `/api/admin/members` yang admin-only), cuma expose `{id, name}`,
      dipakai buat nampilin nama kontributor &amp; syarat nampilkan
      toggle "Bagikan ke keluarga" (cuma kalau family &gt; 1 anggota)
- [x] `components/ui/switch.tsx` (baru) — ditambah via
      `npx shadcn@latest add switch`, konsisten sama preset
      `radix-nova` yang dipakai semua komponen `ui/` lain
- [x] `app/(app)/target/page.tsx` — form goal baru dapat toggle
      "Bagikan ke keluarga" (`Switch`, cuma render kalau family &gt; 1
      anggota); `GoalCard` dapat badge "Bersama" (biru, sejajar badge
      "Tercapai"), tombol edit/hapus goal cuma render kalau
      `goal.canManage` dari response API, riwayat kontribusi tampilkan
      nama kontributor buat goal Bersama, tombol hapus kontribusi cuma
      muncul buat baris milik user sendiri
- [x] **Bug ke-reproduce dari sesi lalu &amp; langsung dikenali**:
      field `familyId`/`shared` awalnya hilang total dari response API
      walau kode &amp; schema sudah benar — Mongoose model cache dev
      server masih pakai schema versi lama (gotcha yang sama berulang
      kali kejadian sesi ini). Fixed dengan restart `pnpm dev`
      (`kill` proses lama, `pnpm dev` baru) sebelum lanjut testing
- [x] Verifikasi lewat 3 akun uji (admin + member 1 family, admin
      keluarga lain): member lihat goal Bersama admin di list-nya tanpa
      jadi pembuat, TIDAK lihat goal Pribadi admin sama sekali; member
      nambah kontribusi ke goal Bersama → `Expense` masuk ke budget
      MEMBER (bukan admin), progress goal ke-update gabungan; member
      PATCH/DELETE goal Bersama (bukan pembuat/admin) → 403; admin
      PATCH/DELETE goal Bersama buatan member → berhasil; admin coba
      hapus kontribusi milik member → 404 (cuma kontributor aslinya
      boleh); goal dibuat member di-cek admin bisa kelola juga (pola
      "pembuat + admin" berlaku dua arah); akun keluarga lain sama
      sekali tidak bisa akses goal manapun dari family ini (404 di
      semua endpoint, termasuk yang Bersama)
- [x] tsc, eslint bersih di semua file yang disentuh; `pnpm build`
      sukses; data uji (3 akun, 2 family, goal &amp; expense terkait)
      dibersihkan

### Follow-up: Bug Toggle "Bagikan ke Keluarga" &amp; Bisa Diubah Kapan Saja

User bikin goal "Liburan" dengan toggle Bersama, tapi tidak muncul di
akun `member@pundi.test`. Investigasi: `familyId` benar, tapi
`shared: false` di database — toggle-nya tidak kesimpen sebagai `true`.

- [x] Root cause: toggle "Bagikan ke keluarga" dirender DI BAWAH tombol
      submit "Tambah" di form Target Baru — gampang ke-skip/submit
      duluan sebelum sempat di-toggle. Fixed: toggle dipindah ke ATAS
      tombol submit
- [x] Gap kedua ketahuan sekalian: goal yang sudah dibuat TIDAK BISA
      diubah status Pribadi/Bersama-nya lagi — cuma nama &amp; nominal
      yang bisa di-edit. `PATCH /api/savings-goals/[id]` diperluas
      terima field `shared` opsional; mode edit `GoalCard` dapat
      toggle Bersama juga (baris kedua di bawah nama/nominal, cuma
      muncul kalau family &gt; 1 anggota atau goal-nya memang sudah
      Bersama)
- [x] Fix data langsung: goal "Liburan" milik user di-update manual
      jadi `shared: true` lewat script sekali-jalan (di scratchpad,
      bukan masuk repo) — dikonfirmasi `member@pundi.test` langsung
      bisa lihat setelahnya, tanpa user perlu hapus &amp; bikin ulang
- [x] tsc, eslint bersih; `pnpm build` sukses

## Fase 66 — Notifikasi Push Saat Ada Kontribusi ke Goal Bersama

Follow-up natural dari fitur Target Tabungan Kolaboratif (Fase 65) —
kontribusi ke goal Bersama sebelumnya senyap, anggota lain baru tahu
kalau buka halaman Target sendiri. User setuju nambah push notification
selama tetap pakai stack gratis yang sudah ada (`web-push` + VAPID,
BUKAN layanan berbayar pihak ketiga seperti OneSignal/Firebase) — sudah
dipakai buat reminder harian (`app/api/cron/daily-reminder/route.ts`).

- [x] `lib/push.ts` (baru) — ekstrak logika VAPID config &amp; kirim-ke-
      satu-subscription (`configureWebPush`, `sendPushToSubscription`)
      dari `daily-reminder/route.ts` yang sebelumnya cuma fungsi lokal
      di situ, supaya bisa dipakai ulang. Tambah `sendPushToUsers`
      (kirim payload sama ke semua subscription milik sekumpulan user
      sekaligus, best-effort — return diam-diam kalau VAPID belum
      diset, bukan throw, biar fitur yang numpang kirim push tidak ikut
      gagal)
- [x] `app/api/cron/daily-reminder/route.ts` — direfactor pakai
      `lib/push.ts`, tidak ada perubahan perilaku (payload &amp; kondisi
      pengiriman tetap sama persis, cuma helper-nya dipindah biar tidak
      duplikat)
- [x] `app/api/savings-goals/[id]/contributions/route.ts` — setelah
      kontribusi &amp; `Expense` tersimpan, kalau `goal.shared`: hitung
      ulang total kontribusi (agregat SEMUA kontributor) &amp;
      persentase progress, kirim push ke SEMUA anggota keluarga LAIN
      (bukan diri sendiri) isinya "{nama kontributor} baru menambah
      {nominal} ke &quot;{nama goal}&quot; — total kini {persen}%",
      link ke `/target`. Dibungkus try/catch — kegagalan kirim push
      (VAPID belum diset, subscription invalid, dll) SENGAJA tidak
      menggagalkan response kontribusi yang sudah tersimpan sukses
- [x] Verifikasi lewat 2 akun uji (admin + member 1 family) dengan
      push subscription PALSU (endpoint &amp; key format valid tapi
      tidak terhubung ke device asli — keterbatasan curl, tidak bisa
      test penerimaan notifikasi beneran di browser): member kontribusi
      ke goal Bersama admin → response tetap 201 sukses &amp; cepat
      (~0.3 detik, tidak nge-hang nunggu push gagal) → dicek langsung
      ke database, KEDUA subscription (admin &amp; member) masih ada
      utuh sesudahnya (tidak salah kehapus sebagai "invalid" walau
      push-nya gagal terkirim ke endpoint palsu) — konfirmasi jalur
      kode aman end-to-end walau penerimaan aktual belum bisa
      dites tanpa browser sungguhan
- [x] tsc, eslint bersih; `pnpm build` sukses; data uji dibersihkan

## Fase 67 — Fitur Cicilan (Installment Tracking dengan Bunga)

Lanjutan diskusi arah pengembangan — user tertarik nambah tracking
cicilan (KPR, motor, kartu kredit), yang beda bentuknya dari fitur
yang sudah ada: beda dari `RecurringExpense` (berulang TANPA batas)
karena cicilan punya TENOR terbatas &amp; progress lunas; beda dari
`SavingsGoal` (uang MASUK) karena cicilan adalah uang KELUAR melunasi
utang. Dikonfirmasi lewat AskUserQuestion (4 putaran), keputusan
kunci: (1) bunga cuma dipakai SEKALI di awal buat hitung nominal
cicilan/bulan lewat amortisasi, bukan buat nge-track rincian pokok-vs-
bunga tiap pembayaran; (2) dua jenis bunga didukung — Flat (motor/
elektronik) &amp; Efektif/Anuitas (KPR/bank) — user pilih pas bikin
cicilan baru; (3) reuse pola pengingat Pengeluaran Berulang (push
bulanan, tap buat konfirmasi); (4) personal per akun dulu, belum
collaborative kayak Target Tabungan Bersama.

- [x] `models/Installment.ts` (baru) — `interestType` (flat/efektif),
      `principal`/`annualInterestRate`/`tenorMonths` (CUMA dipakai
      sekali buat hitung `monthlyInstallment` saat dibuat, sengaja
      TIDAK bisa diedit lagi setelahnya), `dayOfMonth` (pola sama
      persis `RecurringExpense`), `active` (false = lunas OTOMATIS
      atau dihentikan manual)
- [x] `models/InstallmentPayment.ts` (baru) — pola identik
      `SavingsContribution`: running-log pembayaran, tiap create
      otomatis bikin `Expense` terkait via `expenseId`
- [x] `lib/installment.ts` (baru) — `calculateMonthlyInstallment()`,
      pure function (bisa diimport client buat live-preview DAN
      server saat create): Flat =
      `pokok/tenor + pokok×suku_bunga/100/12`; Efektif/Anuitas =
      rumus anuitas standar `pokok×r×(1+r)^n / ((1+r)^n−1)` dengan
      fallback ke pembagian rata kalau `r=0`. Divalidasi manual lewat
      Node script: pokok 24jt/bunga 8%/tenor 24bln → Flat Rp1.160.000,
      Efektif Rp1.085.455 (efektif lebih murah dari flat buat suku
      bunga nominal sama — sesuai fakta umum cicilan)
- [x] `app/api/installments/**` (baru, 4 route file) — list+progress
      (agregat `InstallmentPayment` per cicilan: `monthsPaid`,
      `totalPaid`, `remainingMonths`, `remainingAmount`, `lunas`),
      create, edit (cuma `name`/`monthlyInstallment`/`dayOfMonth`/
      `active`), delete (cascade `InstallmentPayment`, Expense
      historis TETAP ADA — prinsip sama `SavingsGoal`), payments
      (create Expense+Payment atomik, auto-set `active:false` kalau
      `monthsPaid >= tenorMonths`), delete payment (cascade Expense,
      auto-balikin `active:true` kalau sebelumnya ke-mark lunas gara-
      gara payment yang dihapus)
- [x] `app/api/cron/daily-reminder/route.ts` — blok ke-4 (paralel
      pengeluaran berulang): cicilan jatuh tempo hari ini dapat push
      `"{nama} {nominal} jatuh tempo hari ini — tap buat catat"`, url
      `/dashboard?confirmInstallment=<id>`
- [x] `components/confirm-installment-dialog.tsx` (baru) — pola dual
      controlled/uncontrolled + `confirmOnClose` SAMA PERSIS
      `AddExpenseDialog`, tapi POST ke
      `/api/installments/[id]/payments` (bukan `/api/expenses`
      langsung) karena butuh nyimpen `InstallmentPayment` juga, bukan
      cuma `Expense`
- [x] `app/(app)/dashboard/page.tsx` — tambah handling
      `?confirmInstallment=<id>` (pola sama persis
      `?confirmRecurring=<id>` yang sudah ada), render
      `ConfirmInstallmentDialog` terkontrol ter-prefill
- [x] `app/(app)/installments/page.tsx` (baru) — meniru struktur
      `target/page.tsx`: list card progress bulan ke-X dari Y +
      riwayat pembayaran collapsible + form tambah dengan **live
      preview** nominal cicilan/bulan (pakai `calculateMonthlyInstallment`
      client-side, update real-time saat user ngetik pokok/bunga/tenor)
- [x] `components/app-shell.tsx` — nav item "Cicilan" ditambah ke grup
      "Input" (desktop sidebar) DAN ke menu "More" mobile (baru sadar
      pola bottom-tab-bar mobile itu HARDCODE 4 rute tetap + dropdown
      "More" yang list item-nya juga manual, bukan auto-generate dari
      `NAV_GROUPS` — kalau cuma nambah ke `NAV_GROUPS` doang, halaman
      baru jadi TIDAK bisa diakses sama sekali dari mobile)
- [x] Verifikasi lewat 2 akun uji (1 family beda + 1 family lain buat
      cek isolasi): bikin cicilan Flat &amp; Efektif → `monthlyInstallment`
      tersimpan PERSIS sesuai hasil validasi formula manual → bayar 1x
      → `Expense` muncul benar (kategori lain-lain, note "Cicilan:
      {nama}") → progress ke-update benar → cicilan tenor pendek (2
      bulan) dibayar sampai lunas → `active` otomatis `false` →hapus
      1 payment terakhir → `active` balik `true` (bukan lunas lagi) →
      `Expense` terkait ikut kehapus → user family lain coba akses/
      bayar cicilan orang lain → 404 di semua endpoint → cron
      reminder: `installmentDue: 1` terdeteksi benar buat cicilan
      `dayOfMonth` = hari ini, push subscription palsu tetap utuh
      sesudahnya (gagal kirim tidak merusak data, sama pola Fase 66)
- [x] tsc, eslint bersih; `pnpm build` sukses (`/installments` masuk
      daftar route); data uji (2 akun, 2 family) dibersihkan

### Follow-up: Soft Warning Debt-to-Income di Form Cicilan Baru

User tanya gimana kalau nominal cicilan/bulan ternyata lebih besar dari
pemasukan bulanan user. Diskusi &amp; dikonfirmasi: soft warning (bukan
blocker — konsisten sama filosofi app ini, overspending pengeluaran
biasa juga cuma ditandai "Melenceng" di Dashboard, tidak pernah
diblokir), muncul LIVE saat user masih ngetik di form (bukan setelah
disimpan) — reuse mekanisme live-preview nominal cicilan yang sudah
ada, tinggal ditambah baris rasio.

- [x] `app/(app)/installments/page.tsx` — fetch `totalIncome` bulan
      berjalan sekali saat halaman dibuka (`GET /api/monthly-budget?
      month=<bulan-ini>`, endpoint yang sudah ada, dipakai luas di
      halaman lain); live preview nominal cicilan yang sudah ada
      diperluas nampilin juga persentase dari pemasukan
      (`Rp X (Y% dari pemasukan bulan ini)`); kalau rasio &gt; 30%
      (`DEBT_TO_INCOME_WARNING_RATIO`, rule-of-thumb debt-to-income
      umum dipakai bank buat nilai kelayakan kredit) — muncul banner
      soft warning (`bg-amber-50 ring-amber-200`, pola sama persis
      banner warning yang sudah ada di Dashboard), TETAP bisa disimpan
      kalau user pilih lanjut
- [x] Verifikasi lewat akun uji: set income bulan ini Rp5.000.000 lewat
      `PUT /api/monthly-budget` → cek `GET /api/monthly-budget?month=`
      balikin `totalIncome: 5000000` (field name persis yang dipakai
      client) → hitung manual: cicilan Rp2.160.000/bulan → rasio 43,2%
      (di atas 30%, warning harusnya muncul), cicilan Rp1.160.000/bulan
      → rasio 23,2% (di bawah 30%, tidak ada warning) — logika
      terverifikasi benar dari data API, rendering client tidak
      di-screenshot sesuai preferensi user
- [x] tsc, eslint bersih; `pnpm build` sukses; data uji dibersihkan

## Fase 68 — Pengeluaran Berulang Tahunan (bukan cuma Bulanan)

User tanya apakah Pengeluaran Berulang bisa nambah opsi pencatatan
tahunan (mis. pajak kendaraan/STNK, asuransi tahunan), bukan cuma
bulanan seperti sekarang. Disetujui — perubahan aditif, backward-
compatible tanpa migrasi data.

- [x] `models/RecurringExpense.ts` — tambah `frequency` (enum
      monthly/yearly, default "monthly") &amp; `month` (1-12, cuma
      relevan kalau `frequency === "yearly"`)
- [x] `app/api/recurring-expenses/route.ts` (POST) &amp;
      `[id]/route.ts` (PATCH) — terima `frequency`/`month`, validasi
      `month` wajib diisi (1-12) kalau `frequency: "yearly"`; PATCH
      otomatis kosongkan `month` kalau dibalik ke "monthly"
- [x] `app/api/cron/daily-reminder/route.ts` — query jatuh tempo
      diperluas: item "yearly" cuma dianggap jatuh tempo kalau
      `dayOfMonth` DAN `month` dua-duanya cocok, bukan tiap bulan
      kayak sebelumnya. Sengaja pakai `frequency: { $ne: "yearly" }`
      (bukan `frequency: "monthly"`) di sisi "bukan yearly" — biar item
      LAMA yang dibuat sebelum field ini ada (belum kesimpen di DB sama
      sekali) tetap otomatis ke-anggap bulanan TANPA perlu migrasi
      data, karena filter database-level tidak melewati default schema
      Mongoose kalau field-nya memang tidak ada di dokumen
- [x] `app/(app)/settings/page.tsx` — form tambah &amp; mode edit
      Pengeluaran Berulang dapat Select "Bulanan/Tahunan", dengan
      Select bulan (Jan-Des) yang cuma muncul kalau "Tahunan" dipilih;
      badge item di list nampilin "{Bulan} Tgl {tanggal}" buat yang
      tahunan; fix bug kecil sekalian: cek "dueToday" (buat langsung
      munculin dialog konfirmasi kalau tanggal yang baru ditambah PAS
      hari ini) sebelumnya cuma cek `dayOfMonth`, sekarang juga ikut
      cek `month` biar item tahunan bulan lain tidak salah ke-anggap
      jatuh tempo hari ini
- [x] Verifikasi lewat akun uji: bikin 3 item (yearly bulan ini+hari
      ini, yearly bulan lain+hari ini, monthly hari ini) → query
      langsung ke DB pakai logika `$or` yang sama persis cron → cuma 2
      dari 3 yang benar ke-anggap jatuh tempo (yearly bulan lain
      TIDAK, sesuai ekspektasi) → coba bikin yearly tanpa `month` →
      400 sesuai validasi
- [x] tsc, eslint bersih; restart `pnpm dev` preventif (schema
      berubah); `pnpm build` sukses; data uji dibersihkan

### Follow-up: Perbaiki UI Mobile Pengeluaran Berulang

User laporan (dengan screenshot) tombol edit/hapus di item Pengeluaran
Berulang ke-overlap/hilang di mobile setelah badge frequency baru
ditambahkan Fase 68 — root cause: `<li>` list item cuma satu baris
flex non-wrap, badge yang banyak (nominal, tanggal, "Tahunan",
"Nonaktif") mendorong tombol aksi keluar layar.

- [x] `app/(app)/settings/page.tsx` — didesain ulang total, bukan
      cuma di-fix overlap-nya: tiap item dapat `IconChip` (ikon Repeat,
      konsisten sama Target/Cicilan), badge dirapel jadi satu baris teks
      deskriptif ("Rp350.000 · tiap Maret, tgl 3") bukan tumpukan badge
      terpisah, mode edit &amp; form tambah dirombak jadi grid
      responsif (`grid-cols-2 sm:grid-cols-4`) menggantikan flex-wrap
      yang berantakan
- [x] tsc, eslint bersih; `pnpm build` sukses

## Fase 69 — Dashboard: "Sisa Bulan Ini" Menggantikan "Total Bersih"

User observasi (dengan screenshot hero card Dashboard): angka "Total
Bersih" (Income - Alokasi) kurang berguna buat user cek harian karena
itu angka RENCANA yang ditentukan di awal bulan, tidak pernah berkurang
seiring pengeluaran beneran tercatat — user harus mental math sendiri
buat tahu "duit saya beneran masih sisa berapa". Diusulkan &amp;
disetujui: ganti jadi "Sisa {label}" dihitung dari
`totalTarget - totalActual` (target gabungan makan+lain-lain dikurangi
yang beneran sudah dibelanjakan) — angka yang BENERAN mengecil seiring
waktu, bukan angka statis.

- [x] `app/(app)/dashboard/page.tsx` — `HeroCard` props diganti dari
      `totalBersih` jadi `totalActual`/`totalTarget`, hitung
      `sisa = totalTarget - totalActual` di dalam komponen; kalau
      negatif (`over`), angka ditampilkan absolut dengan warna merah
      (`text-red-200`) + caption "Melebihi budget bulan ini" — Income
      &amp; Alokasi tetap tampil sebagai sub-baris seperti sebelumnya
      (tidak ada informasi yang hilang, cuma headline number-nya diganti)
- [x] **Bug lama ketauan &amp; ikut diperbaiki sekalian**: ring radial
      "X% terpakai" sebelumnya pakai kondisi `spentPct > 100` buat
      nentuin warna merah — tapi `spentPct` selalu di-clamp maksimal
      100 lewat `progressValue()` sebelum sampai ke situ, jadi kondisi
      itu MATI TOTAL (tidak pernah true, ring tidak pernah merah walau
      beneran overspend). Diganti pakai `over` (dari `sisa < 0`,
      dihitung dari angka mentah sebelum di-clamp) — sekarang ring
      beneran berubah merah pas overspend, konsisten sama angka sisa
      di sebelahnya
- [x] Kedua pemanggil `HeroCard` (MonthlyDashboard &amp; YearlyDashboard)
      diupdate pass `totalActual`/`totalTarget` yang sesuai
      (`summary.monthSummary.*` buat bulanan, `summary.*` buat tahunan)
- [x] Verifikasi lewat akun uji: set income 10jt, alokasi makan 1.5jt
      (`totalTarget` = 10jt) → cek `sisa = 10.000.000` saat belum ada
      pengeluaran → tambah pengeluaran 11jt → `totalActual: 11000000`,
      `totalTarget: 10000000` → `sisa = -1.000.000` (negatif, sesuai
      skenario overspend, bakal tampil merah + caption peringatan)
- [x] tsc, eslint bersih; `pnpm build` sukses; data uji dibersihkan

## Fase 70 — Pencarian/Filter Pengeluaran &amp; Ringkasan Utang di Dashboard

Dua ide pengembangan yang disetujui user sekaligus: (1) halaman
Pengeluaran belum bisa dicari/difilter, menyulitkan kalau daftar sudah
panjang; (2) progress Cicilan cuma kelihatan per-item di halaman
Cicilan, tidak ada angka gabungan "total utang aktif" yang menyatu
sama gambaran keuangan di Dashboard (pas timing-nya karena Fase 69
baru saja bikin Dashboard fokus ke "sisa uang riil").

- [x] `app/(app)/expenses/page.tsx` — tambah search box (cari
      substring di `note`, case-insensitive) &amp; dropdown filter
      kategori (Semua/Makan/Lain-lain), murni CLIENT-SIDE (data
      sebulan sudah di-fetch semua, tidak perlu endpoint baru). Stat
      card "Hari Ini"/"Total Bulan" SENGAJA tetap dihitung dari data
      mentah (bukan hasil filter) biar tidak menyesatkan user kalau
      lagi nge-filter. Empty-state pesan beda kalau kosong karena
      filter vs beneran belum ada data
- [x] `app/api/installments/route.ts` (GET) — diperluas terima
      `?userId=` lewat `resolveAdminTargetUserId` (pola persis
      `dashboard-summary`/`reports`), sebelumnya cuma bisa lihat punya
      sendiri. POST/PATCH/DELETE Cicilan TETAP personal-only (tidak
      diubah) — cuma GET (buat nampilin ringkasan) yang perlu dibuka
      buat admin
- [x] `app/(app)/dashboard/page.tsx` — fetch `/api/installments?userId=`
      terpisah dari `refresh()` (snapshot utang aktif tidak spesifik
      bulan/tahun yang lagi dipilih, cuma re-fetch kalau ganti anggota
      yang dilihat admin), hitung `totalUtang`/`activeInstallmentCount`
      dari item yang `!lunas`, di-pass ke `HeroCard` sebagai sub-stat
      ke-3 (icon `CreditCard`) sejajar Income/Alokasi — SENGAJA cuma
      muncul kalau `activeInstallmentCount > 0`, biar user tanpa
      cicilan tidak lihat widget kosong/nol
- [x] Verifikasi lewat 3 akun uji (admin+member 1 family, outsider
      family lain): member bikin 3 cicilan (2 aktif + 1 langsung
      dilunasi), admin lihat lewat `?userId=` → benar nampilin 3 item
      dengan `lunas` yang tepat, `totalUtang` cuma menjumlah 2 yang
      aktif (~Rp37,5jt, `Cicilan HP Lunas` dikecualikan) → outsider
      coba akses → 404 (family boundary tetap ditegakkan) → member
      akses tanpa `userId` (punya sendiri) tetap jalan normal. Search/
      filter Pengeluaran dicek lewat data nyata (1 expense "Beli kopi"
      lain-lain, 1 expense makan tanpa catatan) — logika filter
      dikonfirmasi benar dari kombinasi data tsb (kategori cocok,
      keyword cocok, gabungan keduanya kosong sesuai ekspektasi)
- [x] tsc, eslint bersih; `pnpm build` sukses; data uji (semua akun)
      dibersihkan

## Fase 71 — Halaman "Lainnya" Menggantikan Dropdown "More" di Mobile

Feedback dari teman-teman user yang dijadikan tester: menu "More" di
bottom nav mobile (sebelumnya `DropdownMenu` kecil isinya Cicilan/
Reports/Settings/Admin/Panduan/Hubungi/Keluar) kepencet-nya susah,
kekecilan buat ukuran tap target di HP. Disetujui: ganti jadi halaman
penuh, pola umum "More"/"Profile" tab yang lazim di app mobile (mis.
Instagram, WhatsApp).

- [x] `app/(app)/more/page.tsx` (baru) — halaman penuh: card profil
      (avatar+nama+email di atas, ambil dari `useSession()` client-side
      karena halaman ini dibungkus `AppGroupLayout` server yang cuma
      nyalur `user` ke `AppShell`, bukan ke `children`), lalu 2 grup
      card berisi menu (Cicilan/Reports/Settings/Admin-kalau-admin;
      Panduan/Hubungi Kami) masing-masing baris icon+label+chevron,
      tombol "Keluar" terpisah di bawah (destructive style) — SENGAJA
      cuma jadi tujuan tab "More" mobile, tidak ada link masuk dari
      desktop sidebar (menu yang sama sudah ada langsung di situ)
- [x] `components/app-shell.tsx` — slot "More" di bottom tab bar
      diganti dari `DropdownMenu` jadi `<Link href="/more">` biasa
      (pola sama persis 4 tab lain), `MORE_MENU_ROUTES` ditambah
      `/more` sendiri biar tab tetap ke-highlight aktif pas lagi di
      halaman itu maupun di semua halaman yang cuma reachable lewat
      situ
- [x] **Insiden di luar rencana**: dev server yang sudah jalan sejak
      awal sesi (dipakai user buat testing manual di browser) tiba-tiba
      berhenti total (proses hilang, bukan hang) di tengah verifikasi —
      bukan disebabkan perubahan kode manapun sesi ini, cuma kebetulan
      ketauan pas mau verifikasi. Di-restart ulang, dikonfirmasi
      `/more` &amp; `/dashboard` kembali normal (200) sesudahnya
- [x] tsc, eslint bersih; `pnpm build` sukses (`/more` masuk daftar
      route); verifikasi fungsional lewat akun admin asli — GET
      `/more` &amp; `/dashboard` sama-sama 200 setelah restart server

### Follow-up: Tombol Back di Header Mobile buat Halaman Lewat "More"

User observasi: PWA yang di-install standalone sering tidak punya
tombol back browser sama sekali, jadi halaman yang cuma reachable
lewat tab "More" (Cicilan/Reports/Settings/Admin/Panduan) butuh
affordance back eksplisit di dalam app, bukan cuma kosmetik — pola
umum "push navigation" di app mobile native.

- [x] `components/app-shell.tsx` — header mobile (`<header
      className="md:hidden ...">`) sekarang kondisional: kalau
      pathname cocok salah satu `SECONDARY_PAGE_TITLES` (peta baru
      href→judul: Cicilan/Reports/Settings/Admin/Panduan), tampilkan
      chevron back + judul halaman (link balik ke `/more`, FIXED
      destination — bukan `router.back()` — biar konsisten walau user
      masuk lewat bookmark/shortcut PWA langsung, bukan cuma dari
      /more); selain itu (4 tab utama + /more sendiri) tetap tampilkan
      logo "Pundi" seperti biasa. Desktop tidak disentuh sama sekali
- [x] tsc, eslint bersih; `pnpm build` sukses; verifikasi fungsional
      lewat akun admin asli — ke-6 halaman (installments/reports/
      settings/admin/panduan/more) + dashboard semuanya tetap 200
      sesudah perubahan

## Fase 72 — Fitur Teman (Friend List) + Undang Teman ke Target Tabungan

User ingin bisa mengisi Target Tabungan bareng orang di LUAR
keluarganya (teman), atau kombinasi keluarga + teman sekaligus di goal
yang sama. Dikonfirmasi lewat AskUserQuestion: scope-nya friend-list
PERMANEN (bukan cuma invite sekali pakai per-goal) — ada halaman
"Teman" tersendiri dengan friend request/accept, reusable buat fitur
lain ke depannya.

**Perubahan arsitektur penting**: fitur PERTAMA di app ini yang
SENGAJA melintasi batas `familyId` — semua fitur sebelumnya (admin
lihat member, goal Bersama, cicilan) dibatasi ketat cuma sesama
anggota family yang sama. Teman secara definisi ada di family lain,
jadi butuh mekanisme akses baru independen dari family, bukan
modifikasi konsep family yang sudah ada. Karena tidak ada infra email
(nodemailer/dll) di project ini, invite HANYA bisa ke user yang SUDAH
terdaftar (dicari exact-match by email, `User.email` sudah `unique`).

- [x] `models/Friendship.ts` (baru) — `fromUserId`/`toUserId`/`status`
      (pending/accepted/declined), unique index pasangan+arah. Kasus A
      kirim request ke B padahal B baru saja kirim ke A (belum sempat
      accept) — auto-match: row PENDING yang sudah ada langsung
      di-set `accepted` (bukan bikin row baru)
- [x] `app/api/friends/route.ts` (GET daftar teman accepted + POST
      kirim request by email), `app/api/friends/requests/route.ts`
      (GET gabungan permintaan masuk+keluar, section terpisah buat
      UI), `app/api/friends/[id]/route.ts` (PATCH accept/decline —
      cuma `toUserId`; DELETE batalkan pending (cuma `fromUserId`) atau
      unfriend relasi accepted (kedua pihak boleh))
- [x] Push notification (reuse `lib/push.ts`, pola Fase 66): `toUserId`
      dapat notif pas ada request baru, `fromUserId` dapat notif pas
      request-nya di-accept — best-effort, try/catch
- [x] `models/SavingsGoal.ts` — tambah `friendCollaboratorIds`
      (array ObjectId, ADDITIF — `shared` family-wide TIDAK berubah
      sama sekali). Kombinasi yang jadi mungkin: goal pribadi + teman
      (tanpa keluarga), goal Bersama keluarga + teman sekaligus, atau
      kombinasi lain — persis yang diminta user
- [x] `lib/friendship.ts` (baru) — `validateFriendCollaboratorIds()`,
      dipakai di POST &amp; PATCH savings-goals buat mastiin id yang
      dikirim beneran teman ACCEPTED milik PEMBUAT goal (bukan
      dipercaya dari body request begitu saja)
- [x] `lib/session.ts` `canAccessSavingsGoal` diperluas cek
      `friendCollaboratorIds` juga; `canEditSavingsGoal` TIDAK berubah
      (kolaborator teman cuma bisa lihat+kontribusi, sama pembatasan
      anggota keluarga di goal Bersama)
- [x] `app/api/savings-goals/route.ts` (GET query `$or` ditambah
      `friendCollaboratorIds`, response tambah `friendCollaborators:
      {id,name}[]`; POST terima+validasi `friendCollaboratorIds`),
      `[id]/route.ts` (PATCH terima+validasi juga, divalidasi terhadap
      teman PEMILIK goal — bukan admin yang PATCH, kalau beda),
      `[id]/contributions/route.ts` (penerima push notification
      digabung: anggota keluarga kalau `shared` + `friendCollaboratorIds`,
      dedupe, exclude kontributor sendiri — riwayat kontribusi TIDAK
      perlu diubah sama sekali, lookup nama sudah query `UserModel`
      langsung by id independen dari family)
- [x] `app/(app)/friends/page.tsx` (baru) — form tambah teman by email,
      section Permintaan Masuk (terima/tolak), Permintaan Terkirim
      (batalkan), Daftar Teman (hapus pertemanan) — **bug ketauan &amp;
      diperbaiki sebelum ship**: `GET /api/friends` awalnya cuma balikin
      user id (dipakai buat identifikasi teman), tapi tombol hapus
      butuh FRIENDSHIP id (beda field) — diperbaiki dengan nambah
      `friendshipId` terpisah di response
- [x] `app/(app)/target/page.tsx` — komponen baru
      `FriendCollaboratorPicker` (chip toggle sederhana, reused di form
      create &amp; mode edit), badge "+N teman" di `GoalCard` kalau ada
      kolaborator, riwayat kontribusi nampilin nama kontributor kalau
      `shared` ATAU ada `friendCollaborators` (sebelumnya cuma cek
      `shared`)
- [x] Nav: `components/app-shell.tsx` (`/friends` masuk grup
      "Pengaturan" desktop + `SECONDARY_PAGE_TITLES`/`MORE_MENU_ROUTES`
      buat tombol back &amp; highlight "More" mobile),
      `app/(app)/more/page.tsx` (entry "Teman")
- [x] Verifikasi lewat 3 akun uji **di FAMILY BERBEDA-BEDA** (poin
      utama fitur ini): A kirim request ke B → B accept → saling
      muncul di daftar teman; A kirim ke C, C kirim balik ke A hampir
      bersamaan → auto-match langsung accepted (tidak bikin row
      dobel) → duplikat request setelah berteman → 400; self-request →
      400; email tidak terdaftar → 404. A bikin goal `shared:false` +
      `friendCollaboratorIds:[B]` → B (family lain) bisa lihat &amp;
      kontribusi, kontribusi masuk ke `Expense` BUDGET B (bukan A),
      riwayat kontribusi nampilin "Friend B" dengan benar tanpa
      perubahan kode tambahan → C (teman A juga, tapi tidak
      ditambahkan ke goal INI) tetap TIDAK lihat goal ini (list
      kosong) → B coba PATCH goal (bukan owner) → 403 → coba bikin
      goal dengan `friendCollaboratorIds` isi id random (bukan teman)
      → 400 ditolak dengan pesan jelas
- [x] tsc, eslint bersih; `pnpm build` sukses (`/friends` masuk
      daftar route); data uji (3 akun, 3 family) dibersihkan

### Follow-up: Live Search Tambah Teman &amp; Banner Permintaan di Dashboard

User minta form "Tambah Teman" (sebelumnya wajib ketik email persis)
diganti jadi live search yang bisa diklik, plus banner permintaan
pertemanan masuk di Dashboard biar kelihatan tanpa buka halaman Teman
duluan. Live search sengaja DIBATASI (bukan directory search bebas) —
dikonfirmasi lewat AskUserQuestion: minimal 3 karakter, hasil maks 5,
email ditampilkan ter-mask sebagian (`j***@domain.com`) — biar tetap
bisa browse &amp; klik tapi tidak jadi alat buat "menjelajahi" semua
user terdaftar.

- [x] `app/api/friends/search/route.ts` (baru) — GET `?q=`, balikin
      `[]` kalau query &lt;3 karakter (bukan cuma validasi client-side),
      cari `name` ATAU `email` (regex case-insensitive, karakter
      spesial di-escape), exclude diri sendiri + user yang sudah
      pending/accepted (relasi `declined` SENGAJA TIDAK di-exclude,
      biar masih bisa dicari &amp; request-nya dikirim ulang), limit 5,
      email di-mask (`maskEmail()`)
- [x] `app/api/friends/route.ts` (POST) — terima `userId` sebagai
      alternatif `email` (dipakai pas klik hasil search, yang cuma
      punya id + email ter-mask, bukan email asli)
- [x] **Bug ketauan &amp; diperbaiki sekalian** (baru kesorot pas
      desain ulang alur search+klik, sebelumnya belum pernah
      ke-exercise di testing): kirim ulang request ke orang yang
      PERNAH nolak sebelumnya bakal CRASH — unique index
      `{fromUserId,toUserId}` di `Friendship` nolak `create()` baru
      karena row `declined` lama masih nempatin slot unique yang sama.
      Fixed: kalau relasi existing statusnya `declined`, REUSE row yang
      sama (update jadi `pending` lagi, arah baru) bukan bikin dokumen
      baru
- [x] `app/(app)/friends/page.tsx` — form "Tambah Teman" diganti total
      jadi search box ter-debounce (350ms), nampilin daftar hasil
      (nama + email ter-mask) di bawahnya kalau ketikan ≥3 karakter,
      klik tombol "Kirim" langsung POST pakai `userId`
- [x] **Lint gotcha ketemu dua kali &amp; diperbaiki**: `useEffect`
      yang manggil `setState` langsung di badan efek (bukan di dalam
      callback async/timeout) kena `react-hooks/set-state-in-effect` —
      fix-nya selalu sama: pindahkan `setState` ke dalam
      callback timeout/fetch, JANGAN panggil langsung di badan efek
      buat kondisi early-return (biarkan render yang nge-gate
      tampilan, bukan reset state secara sinkron)
- [x] `components/friend-request-nudge-banner.tsx` (baru) — pola
      IDENTIK `SavingsGoalNudgeBanner` (dismiss per hari via
      localStorage, key terpisah): fetch `/api/friends/requests`,
      tampil kalau `incoming.length > 0`, link ke `/friends`
- [x] `app/(app)/dashboard/page.tsx` — render `FriendRequestNudgeBanner`
      di ATAS `SavingsGoalNudgeBanner` (permintaan pertemanan lebih
      actionable/time-sensitive daripada sekadar saran fitur)
- [x] Verifikasi lewat 2 akun uji beda family: search 2 karakter → `[]`
      kosong (gate server-side jalan); search nama teman → ketemu,
      email ter-mask, diri sendiri tidak muncul; kirim request via
      `userId` (klik hasil search) → search ulang nama yang sama →
      TIDAK muncul lagi (sudah pending, ter-exclude); direspon
      "declined" → search ulang → MUNCUL LAGI (declined tidak
      di-exclude) → kirim ulang request ke row yang sama → sukses
      (200, row di-reuse jadi pending lagi, TIDAK crash) → cek
      `/api/friends/requests` penerima nampilin request masuk dengan
      benar (data yang sama dipakai banner Dashboard)
- [x] tsc, eslint bersih; `pnpm build` sukses; data uji (2 akun, 2
      family) dibersihkan

## Fase 73 — Fitur Split Bill (Bagi Rata Tagihan)

Lanjutan natural dari fitur Teman — user sering satu orang bayar
duluan buat semua (makan bareng dll), perlu dibagi rata ke yang lain,
partisipan bisa campuran keluarga + teman. Dikonfirmasi lewat
AskUserQuestion: bagi rata saja (bukan custom nominal per orang),
partisipan boleh keluarga + teman sekaligus (satu picker gabungan).
User juga minta pajak/service charge (PPN dll, lazim di struk
restoran) ikut dihitung sebelum dibagi, bukan cuma subtotal mentah.

**Desain akuntansi kunci**: split bill sengaja TIDAK bikin pembayar
kelihatan overspending buat uang yang bakal balik — bagian PEMBAYAR
SENDIRI langsung tercatat sebagai `Expense`-nya (itu beneran
pengeluaran dia), bagian yang ditalangin buat orang lain TIDAK ikut
tercatat sebagai expense pembayar (itu piutang). Tiap partisipan lain
"Tandai Lunas" bagiannya sendiri → BARU jadi `Expense` buat DIA (bukan
pembayar) — pola sama persis `SavingsContribution`/`InstallmentPayment`
(aksi bikin Expense terkait). Tidak ada entry "income" buat pembayar
pas ada yang bayar balik — app ini tidak punya konsep reimbursement,
disepakati sebagai simplifikasi yang oke.

- [x] `models/SplitBill.ts` (baru) — `payerId`, `name`, `subtotal`,
      `taxPercent` (default 0, gabungan PPN+service jadi SATU
      persentase, bukan dipisah dengan urutan compounding — cukup buat
      kasus umum), `totalAmount` (`subtotal + round(subtotal *
      taxPercent/100)`, DIHITUNG SEKALI &amp; disimpan, bukan
      dihitung ulang)
- [x] `models/SplitBillShare.ts` (baru) — satu baris per partisipan
      TERMASUK payer sendiri (biar query "split bill yang melibatkan
      saya" tinggal satu collection), `amount` (bagian rata, sisa
      pembulatan rupiah masuk ke share PAYER), `settled`/`settledAt`/
      `expenseId` (baris payer langsung `settled:true` +
      `expenseId` terisi saat create)
- [x] `app/api/split-bills/route.ts` (GET list + progress "X/Y lunas"
      per bill dari agregat share; POST create — partisipan divalidasi
      HARUS anggota family yang sama ATAU teman accepted milik payer,
      reuse `validateFriendCollaboratorIds` dari `lib/friendship.ts`
      buat yang bukan family; hitung share dari `totalAmount`
      tax-inclusive, `Math.floor` per orang + sisa ke payer),
      `[id]/route.ts` (GET detail semua share + nama, akses cuma buat
      yang punya baris `SplitBillShare`; DELETE cuma payer, cascade
      share, Expense historis TETAP ADA), `[id]/settle/route.ts`
      (POST, cuma partisipan yang bersangkutan boleh settle
      BAGIANNYA SENDIRI — bukan payer, bukan orang lain — bikin
      `Expense` + push notification ke payer)
- [x] `app/(app)/split-bills/page.tsx` (baru) — list card per bill
      (progress, badge "Kamu bayar duluan", tombol "Tandai Lunas" cuma
      buat non-payer yang belum settled), rincian expand per
      partisipan, form buat baru dengan Subtotal + Pajak/Service (%) +
      tanggal + participant picker GABUNGAN (fetch
      `/api/family-members` + `/api/friends` bareng jadi satu daftar
      chip toggle, exclude diri sendiri dari daftar keluarga karena
      payer implisit ikut) — live preview "Pajak: Rp.. · Total: Rp.. ·
      ≈ Rp../orang"
- [x] Nav: `components/app-shell.tsx` (`/split-bills` masuk grup
      "Input" desktop sejajar Cicilan, icon `Divide` biar beda dari
      `Receipt` yang sudah dipakai Pengeluaran; `SECONDARY_PAGE_TITLES`/
      `MORE_MENU_ROUTES` buat tombol back &amp; highlight "More"
      mobile), `app/(app)/more/page.tsx` (entry "Split Bill")
- [x] Verifikasi lewat 4 akun uji **campuran family + friend + outsider**
      (pola sesi ini): payer bikin split bill subtotal Rp100.000 +
      PPN 11% buat 3 orang (payer + 1 anggota family + 1 teman beda
      family) → `totalAmount` benar Rp111.000, share masing-masing
      Rp37.000 pas (habis dibagi 3, tanpa sisa pembulatan di kasus
      ini) → payer LANGSUNG dapat `Expense` Rp37.000 (bukan Rp111.000)
      saat create → family member DAN friend dua-duanya bisa GET
      detail → outsider (bukan partisipan/family/teman) → 404 → friend
      "Tandai Lunas" → `Expense` Rp37.000 muncul di budget FRIEND
      sendiri (bukan payer) → friend coba settle lagi (sudah lunas) →
      400 → outsider coba settle → 404 → list view payer nampilin
      progress "2 dari 3 lunas" dengan benar → coba bikin split bill
      masukin id yang bukan family DAN bukan teman → 400 ditolak
- [x] tsc, eslint bersih; `pnpm build` sukses (`/split-bills` masuk
      daftar route); data uji (4 akun, 3 family) dibersihkan

## Fase 74 — Fitur Piutang (Uang Dipinjamkan ke Orang Lain) + Widget "Piutang Aktif"

Lanjutan diskusi arah pengembangan setelah Split Bill — user setuju
duluan bikin widget "Piutang Aktif" di Dashboard (mirror dari "Utang
Aktif" yang sudah ada buat Cicilan), lalu lanjut bikin fitur Piutang
standalone (orang lain berutang ke kita, DI LUAR konteks split bill).

**Keputusan desain kunci**: beda dari Split Bill/Cicilan/Friends yang
semuanya butuh pihak lain PUNYA akun Pundi, Piutang standalone SENGAJA
tidak begitu — user secara eksplisit menekankan "untuk siapa yang
hutang mungkin bisa diluar teman atau keluarga, karna bisa aja orang
lain kan yang dimana tidak terdaftar". Debitur cuma **nama teks bebas**
(mis. "Budi"), BUKAN referensi ke `User`. Konsekuensinya: TIDAK ada
validasi cross-user, TIDAK ada push notification ke debitur (mereka
belum tentu punya akun buat nerima), TIDAK ada accept/settle dari sisi
mereka — **PENCATAT SENDIRI (lender) yang mencatat tiap pembayaran
diterima**, beda dari Split Bill di mana tiap partisipan nge-settle
bagiannya sendiri. Piutang jadi murni personal ledger, paling simpel
dari fitur manapun sesi ini (tidak ada family/friend validation, tidak
ada 403/404 access-control lintas akun — cukup cek `userId: user.id`).

**Prinsip akuntansi konsisten** (sama kayak keputusan Split Bill):
Piutang TIDAK bikin `Expense` apa pun — baik pas dibuat (uang yang
dipinjemkan bukan "pengeluaran", cuma sementara keluar dari kantong)
maupun pas dibayar balik (app ini tidak model reimbursement/income-
offset). Murni catatan tersendiri, tidak menyentuh Expense/budget sama
sekali.

- [x] `models/Receivable.ts` (baru) — `userId` (ref User, si pemberi
      pinjaman), `debtorName` (String teks bebas, BUKAN `User` id),
      `amount`, `description`/`dueDate` opsional
- [x] `models/ReceivablePayment.ts` (baru) — running-log pembayaran
      diterima (bisa dicicil/parsial, pola sama `InstallmentPayment`
      tapi SENGAJA TANPA `expenseId` — tidak ada Expense yang di-link
      sama sekali). `lunas` = `paidAmount >= amount` DIHITUNG on-the-fly
      dari SUM payment (pola sama `SavingsGoal`/Installment, bukan
      field ter-cache)
- [x] `app/api/receivables/route.ts` (GET list + `paidAmount`/
      `remainingAmount`/`lunas` terhitung dari agregat; POST create —
      TIDAK ada validasi cross-user sama sekali karena `debtorName`
      bukan referensi `User`), `[id]/route.ts` (GET/PATCH/DELETE,
      DELETE cascade hapus `ReceivablePayment` terkait — TIDAK ada
      Expense yang perlu dipertimbangkan sama sekali, beda dari fitur
      lain manapun), `[id]/payments/route.ts` (GET riwayat, POST catat
      pembayaran — TIDAK bikin Expense, TIDAK ada push notification),
      `[id]/payments/[paymentId]/route.ts` (DELETE koreksi salah catat)
- [x] `app/api/split-bills/route.ts` — tambah field `owedToMe` per bill
      (SUM `SplitBillShare.amount` partisipan LAIN yang `settled:
      false`, cuma dihitung kalau `isPayer`) buat melengkapi widget
      Piutang Aktif gabungan
- [x] `app/(app)/dashboard/page.tsx` — sub-stat ke-4 di `HeroCard`
      (sejajar Income/Alokasi/Utang Aktif), icon `HandCoins`, label
      "Piutang Aktif", SENGAJA cuma tampil kalau `totalPiutang > 0`.
      `totalPiutang` = SUM `owedToMe` semua split bill + SUM
      `remainingAmount` receivable yang belum lunas — fetch paralel ke
      `/api/split-bills` + `/api/receivables`, keyed `currentUserId`
      (BUKAN `effectiveUserId` — kedua API ini belum support admin
      cross-view `?userId=`)
- [x] `app/(app)/receivables/page.tsx` (baru) — list card per piutang
      (nama debitur, progress terbayar Rp../Rp.., badge "Lunas", badge
      jatuh tempo, tombol "Catat Pembayaran" dialog nominal+tanggal
      TANPA field Expense apa pun, riwayat pembayaran collapsible
      dengan hapus per baris), form "Piutang Baru" — Nama Debitur
      `Input` teks bebas (BUKAN picker/select, sengaja beda dari Split
      Bill/Target yang pakai picker user), `CurrencyInput` nominal,
      keterangan opsional, jatuh tempo opsional (Popover+Calendar)
- [x] Nav: `components/app-shell.tsx` (`/receivables` masuk grup
      "Input" desktop sejajar Cicilan/Split Bill, icon `HandCoins`;
      `SECONDARY_PAGE_TITLES`/`MORE_MENU_ROUTES` buat tombol back &amp;
      highlight "More" mobile), `app/(app)/more/page.tsx` (entry
      "Piutang")
- [x] Verifikasi lewat 1 akun uji personal + 1 akun teman (buat sisi
      split bill widget): bikin piutang "Budi" Rp500.000 →
      `remainingAmount: 500000, lunas: false` → bayar parsial Rp200.000
      → `paidAmount: 200000, remainingAmount: 300000` → bayar lagi
      Rp300.000 → `lunas: true` → hapus payment pertama → `lunas`
      balik `false`, `remainingAmount: 200000` → cek TIDAK ADA Expense
      baru tercipta dari semua aksi piutang di atas (`Expense` count
      untuk user tetap 0, beda dari Cicilan/Split Bill yang bikin
      Expense) → bikin split bill Rp100.000 ke 1 teman → `owedToMe:
      50000` → kombinasi widget Piutang Aktif = Rp50.000 (split bill)
      + Rp200.000 (receivable) = Rp250.000 gabungan, sesuai formula
- [x] tsc, eslint bersih; `pnpm build` sukses (`/receivables` +
      4 route API baru masuk daftar route); data uji (2 akun, 2
      family) dibersihkan

## Fase 75 — Pundi Business MVP: Chart of Accounts, Jurnal Umum, Laporan Laba Rugi

Pivot ke fitur berbayar B2B: bantu UMKM generate laporan keuangan tanpa
sewa akuntan. Domain data TERPISAH TOTAL dari fitur personal Pundi yang
sudah ada (tidak reuse `Family`/`Expense`/`MonthlyBudget`) — direuse cuma
sesi Auth.js/User, UI kit, dan pipeline deploy. Beda dari semua fitur
sebelumnya di app ini yang single-entry, modul ini pakai **double-entry
bookkeeping** asli: Chart of Accounts + Jurnal Umum di mana tiap entry
debit harus sama dengan kredit. User bisa jadi anggota banyak company
sekaligus dengan role berbeda (owner/accountant/staff), beda dari
`User.familyId` yang 1:1. Desain diinformasikan oleh scan 2 contoh
laporan keuangan resmi OJK/IDX (AADI — General Industry, BBRI — Financial
and Sharia Industry) yang menunjukkan taksonomi akun beda total per
industri — konfirmasi Chart of Accounts harus fleksibel per company,
bukan daftar akun universal hardcoded. Scope MVP sengaja sempit: cuma
Laporan Laba Rugi bertingkat (Pendapatan Operasional − COGS → Laba Kotor
− Beban Operasional → Laba Usaha + Pendapatan Non-Operasional − Beban
Non-Operasional → Laba Bersih) — Neraca, Arus Kas, invoicing/AP-AR,
rekonsiliasi bank, multi-currency, pajak, dan billing/Stripe di luar
scope, didaftar eksplisit sebagai backlog fase depan.

- [x] `models/business/Company.ts` (baru) — `name`, `legalName?`,
      `industry?` (hint template CoA fase depan), `createdBy`,
      `fiscalYearStartMonth` (default 1, dipakai default rentang laporan)
- [x] `models/business/CompanyMember.ts` (baru) — `companyId`, `userId`,
      `role` enum owner/accountant/staff, index unique
      `{companyId,userId}` (satu role per user per company)
- [x] `models/business/Account.ts` (baru, Chart of Accounts) — `code`
      (unik per company), `name`, `type`
      (asset/liability/equity/revenue/expense), `normalBalance`
      (di-set sekali dari `type` saat create, immutable), `reportSection`
      (cuma revenue/expense — drive pengelompokan Laba Rugi:
      operating-revenue/cogs/operating-expense/non-operating-revenue/
      non-operating-expense), `costBehavior?` (fixed/variable, tag
      manajerial murni, TIDAK dipakai kalkulasi Laba Rugi resmi),
      `parentId?` (hierarki, schema-ready tapi UI MVP flat),
      `isActive`/`isSystemDefault`
- [x] `models/business/JournalEntry.ts` (baru) — `date` (tanggal
      transaksi bukan createdAt), `lines` (sub-schema `_id:false`:
      accountId/debit/credit/memo, minimal 2 baris divalidasi di API),
      `sourceType` (manual/reversal), `reversalOfEntryId?`,
      `isReversed`. **Immutable**: TIDAK ADA route PATCH sama sekali —
      koreksi lewat `POST .../[entryId]/reverse` yang bikin entry BARU
      dengan debit/kredit ditukar &amp; flip `isReversed:true` di entry
      asli, bukan edit in-place (jaga audit trail)
- [x] `lib/business/seedChartOfAccounts.ts` (baru) — 18 akun starter
      UMKM generik mencakup 5 type + 5 reportSection, dipanggil sinkron
      langsung setelah `Company.create()` (bukan job/queue); company
      admin bebas rename/nonaktifkan/tambah lewat halaman CoA
- [x] `lib/business/access.ts` (baru) — `resolveCompanyAccess(userId,
      companyId, {minRole})`, sibling `resolveAdminTargetUserId` di
      `lib/session.ts` — SELALU query `CompanyMember` fresh tiap request
      (beda dari familyId yang 1:1 &amp; disimpan di JWT), 404 (bukan
      403) kalau requester bukan member sama sekali (anti-leak
      keberadaan company), 403 kalau member tapi role kurang
- [x] Route tree `/api/business/companies/...` — CRUD company, members
      (invite by email, 404 kalau user belum terdaftar Pundi — TIDAK ada
      alur invite-token/email), accounts (CRUD + saldo terhitung
      on-the-fly dari aggregate `JournalEntry.lines`, bukan
      cache/tersimpan), journal-entries (POST validasi lines≥2, tiap
      akun aktif &amp; milik company ini, tiap baris cuma isi salah
      satu sisi, total debit===kredit float-safe), `[entryId]/reverse`
      (bikin entry pembalik), `reports/income-statement` (aggregate +
      `$lookup` ke accounts by `reportSection`, subtotal dihitung di JS
      biar gampang dibaca/diuji)
- [x] `app/(business)/layout.tsx` + `components/business/business-shell.tsx`
      (baru) — route group &amp; shell TERPISAH dari `AppShell`
      (bukan nested di `app/(app)/...`), company switcher di top bar
      (localStorage cuma buat default UX, otorisasi selalu re-derive
      server-side dari companyId di URL), avatar menu sendiri dengan
      "Kembali ke Pundi"
- [x] Halaman: `business/onboarding` (bikin company pertama),
      `[companyId]/dashboard` (snapshot Laba Bersih + 3 beban terbesar),
      `[companyId]/accounts` (CoA dikelompokkan per type pakai
      `Accordion`, inline edit/nonaktifkan/hapus), `[companyId]/
      transactions/new` (**form simplified** — pilih jenis transaksi
      dari template mis. "Penjualan Tunai"/"Bayar Beban Operasional",
      debit/kredit mentah tersembunyi dari user non-akuntan; opsi
      "Lainnya (Manual)" raw multi-baris cuma muncul buat role
      accountant+), `[companyId]/journal-entries` (ledger + dialog
      detail + tombol koreksi/reverse), `[companyId]/reports/
      income-statement` (6 baris laporan + date-range picker + cetak),
      `[companyId]/settings` (profil company + kelola member/role,
      owner-only)
- [x] `components/app-shell.tsx` — entry "Pundi Business" (icon
      `Briefcase`) di avatar dropdown desktop &amp; mobile, dipisah
      `DropdownMenuSeparator` sebelum "Keluar"
- [x] Ketemu &amp; diperbaiki sebelum testing: `.next` cache basi dari
      `pnpm build` sebelumnya bikin `next dev` 404 di SEMUA route
      (termasuk yang sudah lama ada) — `rm -rf .next` sebelum restart
      dev server jadi langkah wajib baru selain restart proses
- [x] Verifikasi fungsional lewat curl (3 akun uji — owner, staff,
      outsider): company dibuat → 18 akun seed lengkap &amp;
      `normalBalance` benar per type → owner undang staff → staff
      `PATCH accounts` → 403 → outsider (bukan member) `GET
      companies/[id]` → 404 (bukan 403, cek aturan anti-leak) → jurnal
      tidak balance → 400 → jurnal Penjualan Tunai + HPP + Beban Sewa
      balance → 201 → saldo akun (Kas 800.000, Persediaan -400.000,
      Pendapatan Penjualan 1.000.000, dst) benar → Laporan Laba Rugi
      (grossProfit 600.000, operatingProfit 400.000, netIncome 400.000)
      cocok kalkulasi manual → reverse entry Beban Sewa → `isReversed`
      ke-flip di entry asli, netIncome balik ke 600.000 → delete entry
      test → hilang dari ledger → delete akun yang sudah dipakai jurnal
      → 409; data uji (3 akun, 1 company, 18 akun, 4 jurnal) dibersihkan
- [x] tsc, eslint bersih; `pnpm build` sukses (7 route API +
      7 halaman `/business/*` baru masuk daftar route)
- [x] Data dummy 55 transaksi (Jan-Jul 2026, skenario perusahaan
      logistik) diisi via script Mongoose langsung ke akun real user
      (`admin@pundi.test`, bukan akun uji throwaway) buat demo hasil UI
      ke user — lalu dihapus lagi semua atas permintaan user, kembali ke
      0 jurnal (18 akun seed tetap utuh, tidak disentuh)
- [x] `app/(business)/business/[companyId]/panduan/page.tsx` (baru) —
      menu bantuan di dalam Pundi Business, pola sama persis
      `app/(app)/panduan/page.tsx` (Langkah-langkah + Fitur Tambahan +
      FAQ + kontak WhatsApp), tapi konten spesifik ke alur double-entry:
      saldo akun TIDAK diisi manual (dihitung dari transaksi), cara
      Setor Modal Awal, cara koreksi jurnal (reversal, bukan edit),
      beda COGS vs Beban Operasional, kenapa role Staff tidak bisa akses
      "Lainnya (Manual)". Ditambahkan setelah user sempat bingung lihat
      saldo Kas Rp0 di halaman Akun dan tidak tahu cara mengisinya
- [x] `components/business/business-shell.tsx` — link "Panduan" (icon
      `HelpCircle`) ditambah di sidebar desktop (area footer, sejajar
      "Kembali ke Pundi") &amp; dropdown mobile
- [x] tsc, eslint bersih; `pnpm build` sukses (`/business/[companyId]/
      panduan` masuk daftar route)

## Fase 76 — Chart Report di Laporan Laba Rugi (Tren Bulanan + Komposisi Beban)

User minta fitur chart di laporan keuangan Pundi Business ("saya rasa perlu
ada fitur report seperti chart gitu, semua perusahaan suka kalo ada yang
seperti itu"). Disepakati 2 chart, ditaruh di halaman Laporan Laba Rugi
yang sudah ada (bukan halaman baru), pakai `recharts` (sudah dependency
existing, dipakai juga di `app/(app)/reports/page.tsx`).

- [x] Wajib jalanin skill `dataviz` sebelum nulis kode chart apa pun —
      dipatuhi lewat prosedur 7 langkahnya (pilih bentuk → assign warna
      per job → validasi palet via `validate_palette.js` → mark
      spec/spacer → hover layer → aksesibilitas → render & cek visual)
- [x] **Pivot dari rencana awal**: Chart Komposisi Beban awalnya
      diusulkan sebagai pie/donut chart, tapi tabel "job → tipe" di
      referensi skill dataviz eksplisit memetakan part-to-whole ke
      **stacked/horizontal bar** (dan tidak pernah merekomendasikan
      pie) — direklasifikasi ulang sebagai job "compare magnitude,
      low→high" (sequential, satu hue), jadi dibangun sebagai
      **horizontal ranked bar chart** bukan pie/donut
- [x] Palet warna dipakai apa adanya dari `lib/chartColors.ts`
      (`CATEGORICAL`/`CHROME`) — sudah palet tervalidasi yang sama
      persis dipakai `app/(app)/reports/page.tsx`, tidak perlu
      validasi ulang dari nol. Dicek lewat `validate_palette.js`:
      pasangan biru (`#2a78d6`) + aqua (`#1baf7a`) PASS di lightness
      band, chroma floor, & CVD separation (ΔE 73.6 deutan / 21.6
      tritan) — tapi **WARN** kontras aqua-vs-surface-terang
      (2.74:1, target 3:1). WARN kontras tidak boleh diabaikan begitu
      saja → mitigasi wajib: `LabelList` nilai langsung di tiap bar
      Beban (bukan cuma andalkan warna fill) + legend tetap ada
- [x] `app/api/business/companies/[id]/reports/income-statement/monthly/route.ts`
      (baru) — endpoint breakdown per bulan, pola aggregation sama
      persis route `income-statement` utama (`$match` companyId+
      rentang tanggal → `$unwind lines` → `$lookup accounts` → filter
      `reportSection` ada) ditambah `$group` per tahun+bulan. Bulan
      kosong (tanpa transaksi) tetap diisi 0 di response biar tren
      tidak "melompat" di chart. Compute-on-read, tidak ada saldo
      bulanan yang disimpan
- [x] `app/(business)/business/[companyId]/reports/income-statement/page.tsx`
      (diubah) — 2 chart baru pakai `recharts`:
      1. **Tren Pendapatan vs Beban Bulanan** — grouped bar chart
         (categorical: biru=Pendapatan, aqua=Beban, urutan hue fixed
         bukan merah=beban/hijau=pendapatan yang intuitif, sesuai
         aturan skill "jangan campur identity channel dengan status
         good/bad"), data dari endpoint monthly baru
      2. **Komposisi Beban** — horizontal ranked bar chart (sequential
         satu hue biru), data dari `byAccount` yang sudah ada di
         response `income-statement` (field ini sebelumnya di-return
         API tapi belum dipakai UI) — difilter section
         cogs/operating-expense/non-operating-expense, di-rank
         terbesar→terkecil, ekor di luar 8 teratas dilipat ke
         "Lainnya"
      3. Kedua chart dikasih class `no-print` (konsisten sama filter
         tanggal & tombol Cetak yang sudah ada) — laporan cetak PDF
         tetap fokus ke angka, bukan chart
- [x] tsc, eslint bersih (cuma warning `exhaustive-deps` yang sudah
      lazim ditoleransi di halaman lain repo ini, bukan error);
      `pnpm build` sukses (`/api/business/companies/[id]/reports/
      income-statement/monthly` masuk daftar route)
- [x] Verifikasi fungsional lewat curl (akun uji throwaway): company
      baru → 4 jurnal lintas 2 bulan (Jan: penjualan 1.000.000 + gaji
      200.000; Feb: penjualan 1.500.000 + HPP 300.000) → endpoint
      monthly balikin breakdown per bulan yang benar (Jan: revenue
      1.000.000/expense 200.000/netIncome 800.000; Feb: revenue
      1.500.000/expense 300.000/netIncome 1.200.000) → `byAccount` di
      endpoint income-statement utama cocok (HPP 300.000, Pendapatan
      Penjualan 2.500.000, Beban Gaji 200.000); data uji dibersihkan

## Fase 77 — Langganan Berbayar Pundi Business (Rp99.000/bulan, Transfer Manual)

User memutuskan Pundi Business jadi berbayar, Rp99.000/bulan per company —
harga murah dulu buat divalidasi sebelum naik seiring Neraca/Arus Kas/pajak
ditambah nanti. Belum mau integrasi payment gateway (Midtrans/Xendit,
terlalu berat buat tahap ini), jadi alurnya manual: owner transfer ke
rekening, klik "Saya sudah transfer", lalu user sendiri (bukan payment
gateway) yang cek mutasi bank & approve/reject klaim lewat halaman admin
baru yang cuma bisa diakses emailnya sendiri.

- [x] **Keputusan desain kunci**: status langganan (`trial`/`active`/
      `pending_verification`/`overdue`) TIDAK PERNAH disimpan sebagai
      field — selalu dihitung dari `trialEndsAt`/`currentPeriodEnd`
      (tanggal) + ada-tidaknya `SubscriptionPayment` berstatus `pending`
      saat request masuk. Pola yang sama seperti saldo `Account` &
      Laporan Laba Rugi (compute-on-read) — mencegah bug lupa "revert
      status" waktu klaim ditolak
- [x] `models/business/CompanySubscription.ts` (baru) — `companyId`
      (unique), `trialEndsAt`, `currentPeriodEnd` (nullable)
- [x] `models/business/SubscriptionPayment.ts` (baru) — log klaim
      append-only (mirip semangat immutable `JournalEntry`): `amount`
      (snapshot harga saat klaim, bukan reference harga sekarang),
      `claimedBy/At`, `periodStart/End` (dihitung saat klaim, nyambung
      dari periode berjalan/trial — bukan dari tanggal klaim, biar owner
      yang bayar sebelum jatuh tempo tidak rugi sisa masa aktifnya),
      `status` (pending/approved/rejected), `reviewedBy/At`, `note?`
- [x] `lib/business/subscription.ts` (baru) — `MONTHLY_PRICE_IDR=99_000`,
      `getSubscriptionStatus()`, `addOneMonthUTC()` (pola month-math sama
      seperti endpoint `income-statement/monthly` Fase 76)
- [x] `lib/business/platformAdmin.ts` (baru) — `isPlatformAdmin(email)`
      cek terhadap env var baru `PLATFORM_ADMIN_EMAILS` (comma-separated,
      pola sama `CRON_SECRET` yang sudah ada). **Bukan** `User.role:
      "admin"` yang sudah ada — itu scoped per keluarga (family admin),
      konsep beda total dari "approve pembayaran SEMUA company"
- [x] `app/api/business/companies/route.ts` (diubah) — company baru
      otomatis dapat `CompanySubscription` trial 14 hari
- [x] `.../[id]/subscription/route.ts` (GET, baru) & `.../subscription/
      claim/route.ts` (POST, baru, owner-only, 409 kalau sudah ada klaim
      pending — guard satu klaim pending per company)
- [x] `/api/platform-admin/subscriptions/route.ts` (GET list, baru) &
      `.../[paymentId]/approve|reject/route.ts` (POST, baru) — gate
      `isPlatformAdmin`, 403 (bukan 404, ini soal role global bukan
      resource-exist) kalau bukan; approve set `CompanySubscription.
      currentPeriodEnd = payment.periodEnd`, reject cuma ubah status
      payment (company otomatis balik overdue lewat compute-on-read,
      tanpa perlu revert manual)
- [x] `.../settings/page.tsx` (diubah) — Card "Tagihan": badge status,
      instruksi transfer (dari env `BUSINESS_BANK_*`, null-safe kalau
      belum diisi), tombol "Saya sudah transfer" (owner only), alasan
      penolakan kalau klaim terakhir ditolak
- [x] `.../dashboard/page.tsx` (diubah) — banner amber "jatuh tempo"
      (link ke Pengaturan) kalau overdue, banner biru netral kalau
      pending_verification, pakai pola warning yang sudah ada di
      `app/(app)/budget/page.tsx` (border-dashed amber + `AlertTriangle`)
- [x] `app/(app)/platform-admin/subscriptions/page.tsx` (baru) — reuse
      `AppShell`, tidak ditambah link nav di mana pun (cuma diakses
      lewat URL langsung oleh pemilik akun), tampil "Tidak punya akses"
      kalau API 403
- [x] Env var baru di `.env.local`: `PLATFORM_ADMIN_EMAILS` (diisi email
      user), `BUSINESS_BANK_NAME/ACCOUNT_NUMBER/ACCOUNT_HOLDER` (sengaja
      dikosongkan — data rekening pribadi, user isi sendiri nanti)
- [x] tsc, eslint bersih (cuma warning `exhaustive-deps` yang sudah lazim
      ditoleransi di halaman lain repo ini); `pnpm build` sukses (7 route
      baru: 2 company-scoped + 3 platform-admin + 1 halaman platform-admin
      masuk daftar route)
- [x] Verifikasi fungsional lewat curl (owner + staff + platform-admin
      throwaway, `PLATFORM_ADMIN_EMAILS` ditambah sementara buat testing
      lalu dikembalikan lagi): company baru → `trial` 14 hari → backdate
      `trialEndsAt` → `overdue` → staff coba klaim → 403 → owner klaim →
      `pending_verification`, klaim kedua → 409 → non-admin akses
      endpoint platform-admin → 403 → platform admin approve →
      `active`, `currentPeriodEnd` tepat +1 bulan dari `periodStart` →
      alur reject di company kedua → status balik `overdue` otomatis +
      `lastRejectedPayment.note` muncul; data uji & env var testing
      dibersihkan/dikembalikan
- [x] **Ditemukan & diperbaiki sebelum selesai**: company yang sudah ada
      dari sebelum fitur ini (`admin@pundi.test`, dibuat waktu Fase 75)
      tidak punya `CompanySubscription` sama sekali — kalau dibiarkan,
      `getSubscriptionStatus` bakal langsung balikin `overdue` (default
      fallback) dan dashboard-nya tiba-tiba nampilin peringatan jatuh
      tempo padahal belum pernah ditawari langganan. Di-backfill lewat
      script sekali pakai: kasih trial 14 hari baru buat semua company
      existing yang belum punya `CompanySubscription`

## Fase 78 — Landing Page: Positioning Umum + Pendaftaran Business Terpisah

Dua permintaan berurutan dari user: (1) landing page perlu di-refresh biar
tidak "keluarga"-sentris lagi (sekarang ada Pundi Business juga), dan (2)
alur daftar buat business perlu dipisah dari personal — klik "Coba Pundi
Business" idealnya langsung kasih konteks bisnis + linear ke pembuatan
company, bukan nyasar ke onboarding budget personal.

- [x] **Refresh copy landing page & metadata** — ganti framing
      "Kelola Keuangan Keluarga" jadi "Kelola Keuangan Pribadi & Bisnis" di
      SEMUA tempat yang nge-drive SEO/share preview, bukan cuma hero:
      `lib/site.ts` (`SITE_DESCRIPTION`, dipakai `layout.tsx` DAN
      `manifest.ts`), `app/layout.tsx` (title/openGraph/twitter/keywords),
      `app/manifest.ts` (nama PWA), `app/login/layout.tsx`,
      `app/register/layout.tsx`. Hero h1 diganti dari "Kelola keuangan
      **keluarga**" jadi "Kelola keuangan **kamu**" + subhead sebut
      eksplisit individu/keluarga/laporan bisnis. Copy plan "Personal"
      yang memang menjelaskan fitur keluarga/multi-anggota SENGAJA
      dibiarkan — itu akurat buat plan itu spesifik, bukan klaim produk
      secara umum
- [x] Section baru "Pundi Business" (`#bisnis`) di landing page — dark
      slate theme (beda sengaja dari emerald personal, biar kebedaan
      tier kerasa), 6 feature card, dan `BusinessMockup` — panel abstrak
      dibuat dari CSS bar (bukan `<Image>` screenshot beneran, karena
      belum ada screenshot Pundi Business) buat preview "Laporan Laba
      Rugi" tanpa broken image
- [x] Section baru "Harga" (`#harga`) — 2 kartu perbandingan Personal
      (Gratis) vs Business (Rp99.000/bulan, badge "Trial 14 hari gratis",
      kartu di-highlight/elevated sebagai plan unggulan)
- [x] **Ditemukan lewat pertanyaan user**: CTA "Coba Pundi Business" &
      "Coba Gratis 14 Hari" tadinya masih mengarah ke `/register`
      (halaman personal, redirect abis daftar ke `/onboarding` — setup
      budget personal, bukan pembuatan company). Ini bukan cuma cosmetic
      gap, alur signup buat business beneran nyasar
- [x] `app/register/business/page.tsx` + `layout.tsx` (baru) — form
      pendaftaran SAMA PERSIS secara fungsi (masih bikin `User` yang
      sama, Pundi Business tidak punya sistem auth terpisah — Company
      cuma layer tambahan di atas User yang sudah ada), tapi branding
      slate + copy benefit bisnis (`BENEFITS` beda dari `/register`), dan
      redirect abis signup ke `/business/onboarding` (bukan `/onboarding`)
      — keputusan user: dua langkah (signup dulu, company creation di
      halaman onboarding yang sudah ada), bukan digabung satu form,
      biar konsisten sama pola `/register` -> `/onboarding` personal &
      reuse halaman onboarding company apa adanya
- [x] `proxy.ts` — `/register/business` ditambah ke `publicRoutes`
      (exact-match array, bukan prefix) biar bisa diakses tanpa login;
      user yang SUDAH login otomatis di-redirect ke `/dashboard` kalau
      buka halaman ini (perilaku publicRoute yang sama kayak `/register`)
- [x] Link silang buat discoverability: `/register` (personal) dapat
      baris kecil "Daftar buat usaha/UMKM? Coba Pundi Business" ->
      `/register/business`, dan sebaliknya `/register/business` punya
      "Bukan buat bisnis? Daftar akun personal" -> `/register`
- [x] CTA business di landing page (`#bisnis` section & kartu pricing
      Business) diupdate dari `/register` ke `/register/business`; CTA
      personal (nav, hero, final CTA, footer) TETAP ke `/register`
- [x] tsc, eslint bersih; `pnpm build` sukses (`/register/business`
      masuk daftar route STATIC — tidak butuh server-side auth check
      karena publicRoute)
- [x] Verifikasi fungsional lewat curl (akun uji throwaway): `GET
      /register/business` tanpa auth -> 200; register+login -> `GET
      /business/onboarding` (authed) -> 200 (bukan redirect ke /login,
      konfirmasi company-creation page beneran reachable abis alur
      business signup); `GET /register/business` DENGAN auth (tanpa
      follow redirect) -> 307 ke `/dashboard` (konfirmasi publicRoute
      gating jalan, tidak nyasar nampilin form daftar ke user yang
      sudah login); data uji dibersihkan

## Fase 79 — Onboarding Business Jadi 2 Langkah (Setor Modal Awal)

Lanjutan langsung dari kebingungan user waktu awal pakai Pundi Business
(saldo Kas Rp0, tidak tahu cara mengisinya — sudah dijawab lewat halaman
Panduan di Fase 76). User minta onboarding-nya sendiri yang diperbaiki:
begitu perusahaan baru dibuat, jangan langsung lempar ke Dashboard yang
serba Rp0 — kasih kesempatan isi modal awal dulu. Didiskusikan berapa step
yang pas: disepakati TETAP 2 langkah (bukan ditambah step lain kayak
undang tim atau kustomisasi Chart of Accounts — keduanya lebih pas tetap
di Pengaturan/Akun, bukan dipaksakan masuk onboarding), dan langkah kedua
harus BISA DILEWATI (skippable), bukan wajib — beberapa owner belum tahu
nominal modal pastinya waktu pertama kali onboarding.

- [x] `app/(business)/business/onboarding/page.tsx` (diubah jadi 2-step
      wizard, state `step: 1 | 2` lokal, bukan route terpisah):
      - **Step 1** (sama seperti sebelumnya): form profil perusahaan →
        `POST /api/business/companies` (bikin Company + seed 18 akun +
        `CompanySubscription` trial). Bedanya, sekarang TIDAK langsung
        redirect ke dashboard — lanjut fetch `GET .../accounts?
        activeOnly=true` buat cari akun Kas (default terpilih) dan pindah
        ke step 2
      - **Step 2** (baru): Card "Setor Modal Awal" — `Select` akun
        Kas/Bank + `CurrencyInput` nominal, tombol utama "Setor & Buka
        Dashboard" (`POST .../journal-entries` dengan `lines` debit akun
        terpilih / kredit "Modal Pemilik", pola identik template
        `setor-modal` yang sudah ada di halaman Transaksi Baru — reuse
        logic, bukan reimplementasi), tombol sekunder redup "Lewati dulu"
        yang langsung `router.push` ke dashboard tanpa post apa pun
- [x] tsc, eslint bersih (fix 1 error `react/no-unescaped-entities` buat
      tanda kutip di judul step 2, dan 1 error tipe karena `CurrencyInput`
      tidak punya prop `autoFocus`); `pnpm build` sukses
- [x] Verifikasi fungsional lewat curl (akun uji throwaway, mensimulasikan
      urutan call yang persis dilakukan wizard): step 1 bikin company →
      fetch accounts nemuin Kas/Bank/Modal Pemilik by name → step 2 post
      journal entry Setor Modal Awal 5.000.000 → `GET accounts` konfirmasi
      saldo Kas jadi 5.000.000 (bukan lagi 0) → `GET reports/
      income-statement` konfirmasi tetap 0 di semua baris (benar secara
      akuntansi — setoran modal itu transaksi ekuitas, bukan pendapatan,
      jadi tidak boleh muncul di Laporan Laba Rugi); data uji dibersihkan

## Fase 80 — Sumber Dana Kas/Bank di Template + Beban Berulang Business

User kasih contoh data biaya nyata (DP Notaris, domain, email business
bulanan, virtual office) yang mayoritas dibayar via Transfer Bank/Kartu,
bukan tunai — dari situ ketemu gap nyata: SEMUA template simplified di
Transaksi Baru hardcode akun Kas sebagai sisi kas-nya, tidak ada pilihan
Bank. User juga minta fitur beban berulang buat Business (mirip personal),
dan didiskusikan modul aset/amortisasi — disepakati BELUM perlu (alasan:
Neraca buat nampilin book value belum ada, dan biaya di contoh user bukan
aset yang wajar dikapitalisasi, expensing langsung sudah cukup & konsisten
sama paradigma app ini).

- [x] `transactions/new/page.tsx` (diubah) — tambah `Select` "Sumber/
      Tujuan Dana" (akun `type:asset` yang namanya mengandung "kas"/
      "bank") yang muncul di semua template kecuali "Lainnya (Manual)".
      Semua referensi hardcoded `kas._id` di `handleTemplateSubmit`
      diganti jadi state `cashAccountId` (default akun Kas kalau ada,
      tapi bisa diganti ke Bank) — TIDAK ada perubahan API, murni soal
      `accountId` mana yang dikirim di `lines`
- [x] `models/business/RecurringBusinessExpense.ts` (baru) — beda dari
      `RecurringExpense` personal (nama kategori bebas), di sini butuh
      `accountId` (akun beban tujuan, mis. Beban Sewa) DAN `cashAccountId`
      (akun Kas/Bank sumber dana) yang konkret, karena bakal jadi baris
      jurnal beneran. Nama model Mongoose SENGAJA `"BusinessRecurringExpense"`
      (bukan `"RecurringExpense"`) biar tidak bentrok di registry global
      Mongoose sama model personal yang sudah ada di koneksi yang sama
- [x] `/api/business/companies/[id]/recurring-expenses/route.ts` +
      `[recurringId]/route.ts` (baru) — CRUD, pola identik
      `/api/recurring-expenses` personal (validasi amount/dayOfMonth/
      month-kalau-yearly sama persis), ditambah validasi `accountId`/
      `cashAccountId` valid & aktif di company itu. GET boleh siapa saja
      (buat prefill), POST/PATCH/DELETE minimal role `accountant`
      (nyentuh akun GL, konsisten gating kelola Chart of Accounts)
- [x] `app/api/cron/daily-reminder/route.ts` (diubah) — extend cron
      harian yang SUDAH ADA (jadwal tunggal `0 5 * * *`, tidak perlu cron
      baru), tambah query `BusinessRecurringExpense` due hari ini (logika
      dayOfMonth/frequency/month sama persis pola personal), kirim push
      ke SEMUA member company yang punya `PushSubscription` (bukan cuma
      pembuat item) — karena staff pun bisa catat transaksi lewat
      template "Bayar Beban Operasional". **Semi-otomatis, BUKAN
      auto-post**: cuma notifikasi "tap buat catat", deep-link ke
      `/business/[id]/transactions/new?confirmRecurring=<id>` — alasan
      ini dipertahankan malah lebih penting buat Business karena jurnal
      immutable (auto-post nominal salah/berubah bakal mencemari ledger
      permanen, beda dari Expense personal yang masih bisa diedit)
- [x] `transactions/new/page.tsx` (diubah lagi) — baca query param
      `?confirmRecurring=<id>`, fetch detail item, prefill template
      "Bayar Beban Operasional" (akun beban, akun Kas/Bank, nominal,
      keterangan) — USER tetap review & submit manual. Dibungkus
      `<Suspense>` (component dipecah jadi `NewTransactionContent` +
      wrapper `NewTransactionPage`) karena `useSearchParams()` next.js
      wajib ada suspense boundary, pola identik dashboard personal
- [x] Card baru "Beban Berulang" di `.../settings/page.tsx` (diubah,
      bukan halaman/nav item baru — pola sama Card "Tagihan" yang sudah
      ada) — list item (nama, nominal, akun beban → akun sumber dana,
      jadwal, toggle aktif/nonaktif, delete) + form tambah (Select akun
      beban dari akun `type:expense`, Select akun Kas/Bank, nominal,
      jadwal). Field baru `canManage` (owner/accountant) di halaman ini
      — staff cuma lihat read-only, sebelumnya cuma ada `isOwner`
- [x] tsc, eslint bersih (cuma warning `exhaustive-deps` yang sudah lazim
      ditoleransi); `pnpm build` sukses (2 route API baru masuk daftar)
- [x] Verifikasi fungsional lewat curl (owner + staff throwaway):
      - Post jurnal "Bayar Beban Operasional" pilih Bank (bukan Kas) buat
        Virtual Office 2.220.000 → `GET accounts` konfirmasi saldo BANK
        yang berkurang (-2.220.000), Kas tetap 0 (regression check fix
        sumber dana)
      - POST recurring-expenses sebagai staff → 403; sebagai owner
        (dayOfMonth = tanggal WIB hari ini) → 201; GET list (staff) →
        muncul; GET satu item → field `accountId`/`cashAccountId` lengkap
      - Hit `/api/cron/daily-reminder` → `businessRecurringDue: 1`
        (query/counting logic kebukti jalan; push delivery sendiri tidak
        bisa diverifikasi tanpa subscription asli)
      - PATCH sebagai staff → 403; PATCH `active:false` sebagai owner →
        200 → cron lagi → `businessRecurringDue: 0` (item nonaktif tidak
        lagi due) → DELETE → GET list → kosong
      - Data uji (2 akun, 1 company, 1 recurring expense, 1 jurnal)
        dibersihkan

## Fase 81 — Laporan Neraca (Balance Sheet)

Lanjutan diskusi fitur berbayar: user tanya apa lagi yang perlu
ditambahkan buat Pundi Business sekarang berbayar, direkomendasikan
Neraca sebagai prioritas #1 (data mentahnya sudah lengkap dari
double-entry bookkeeping yang sudah ada, cuma belum ada laporan yang
mengagregasi jadi Neraca resmi). User minta dijelasin dulu konsepnya
(sudah, dalam Bahasa Indonesia non-jargon) sebelum setuju lanjut build.

- [x] **Keputusan desain kunci — Laba Ditahan dihitung KUMULATIF SEJAK
      AWAL, bukan per tahun fiskal**: beda dari Laporan Laba Rugi yang
      pakai `defaultRange` per tahun fiskal, Neraca butuh net income
      SEMUA transaksi sejak company dibuat s/d `asOf` — karena app ini
      tidak punya proses tutup buku (closing entries) yang mereset akun
      revenue/expense tiap akhir periode. Kalau Laba Ditahan cuma dihitung
      tahun berjalan, Neraca TIDAK AKAN balance begitu masuk tahun kedua
- [x] `app/api/business/companies/[id]/reports/balance-sheet/route.ts`
      (baru) — 2 aggregation: (1) saldo tiap akun asset/liability/equity
      per tanggal `asOf` (pola sama `accounts/route.ts` GET, ditambah
      filter `date: {$lte: asOf}`), (2) Laba Ditahan kumulatif (reuse
      pola aggregation `reports/income-statement/route.ts` yang match
      `reportSection exists`, tapi tanpa batas bawah tanggal — insight:
      jumlah `netCredit` semua baris revenue+expense LANGSUNG jadi net
      income, tidak perlu pisah revenue/expense dulu, karena netCredit
      akun revenue natural positif & akun expense natural negatif).
      Response include `isBalanced` (sanity check `assets.total ===
      totalLiabilitiesAndEquity`, dibulatkan 2 desimal biar float-safe)
- [x] `.../reports/balance-sheet/page.tsx` (baru) — pola sama persis
      Laporan Laba Rugi (skeleton, `no-print`, `window.print()`), beda
      di 1 date picker (`asOf`, bukan date-range from/to karena Neraca
      itu snapshot 1 tanggal) + badge "Seimbang ✓" (emerald,
      `CheckCircle2`) kalau `isBalanced` — penegasan visual sederhana
      buat user non-akuntan
- [x] `components/business/business-shell.tsx` (diubah) — nav item baru
      "Neraca" (icon `Scale`, pas secara metafora) setelah "Laporan Laba
      Rugi", satu fungsi `navItems()` yang dipakai desktop+mobile jadi
      cukup 1 titik perubahan
- [x] `.../panduan/page.tsx` (diubah) — 1 FAQ baru "Apa bedanya Neraca
      sama Laporan Laba Rugi?", jawaban non-jargon (per-periode vs
      per-tanggal, dan gimana keduanya terhubung lewat Laba Ditahan)
- [x] tsc, eslint bersih (cuma warning `exhaustive-deps` yang sudah lazim
      ditoleransi); `pnpm build` sukses (`/business/[companyId]/reports/
      balance-sheet` masuk daftar route)
- [x] Verifikasi fungsional lewat curl (akun uji throwaway): setor modal
      5.000.000 → Neraca hari itu: assets 5jt, equity 5jt (semua
      contributedCapital, retainedEarnings 0), `isBalanced: true` →
      tambah penjualan tunai 2jt + bayar sewa 500rb (dari Bank) + utang
      usaha 300rb → Neraca: assets 6,5jt (Kas 7jt, Bank -500rb),
      liabilities 300rb, equity 6,2jt (retainedEarnings tepat 1,2jt =
      2jt-500rb-300rb), `totalLiabilitiesAndEquity` 6,5jt = `assets.total`
      6,5jt, `isBalanced: true` → post 1 jurnal bertanggal BESOK → Neraca
      `asOf` hari ini TIDAK berubah (6,5jt, filter tanggal benar), Neraca
      `asOf` besok naik jadi 7,5jt (ikut menghitung); data uji dibersihkan
- [x] **Bug ditemukan user via screenshot beberapa saat setelah rilis**:
      Neraca company real user ("Toko Minuman") nampilin Rp0 di semua
      baris padahal ada 1 jurnal "Virtual Office" tercatat hari itu juga.
      Akar masalah: default `asOf` (waktu halaman dibuka tanpa pilih
      tanggal) pakai `new Date()` mentah, sementara tanggal transaksi
      disimpan sebagai UTC-midnight dari tanggal kalender yang dipilih di
      date picker. Buat user WIB (UTC+7) antara jam 00:00-07:00 pagi,
      kalender UTC "sekarang" masih di TANGGAL SEBELUMNYA — transaksi
      yang baru dicatat "hari ini" (WIB) keliatan kayak tanggalnya di
      masa depan relatif ke `new Date()`, jadi ke-exclude dari agregasi
      `date: {$lte: asOf}`. Reproduce persis kondisi race-nya (dev server
      jalan jam 06:5x WIB, persis window bug-nya) pakai company uji
      throwaway, konfirmasi bug, lalu diperbaiki 2 iterasi: percobaan
      pertama (default ke akhir hari kalender UTC) TERNYATA MASIH SALAH
      (cuma geser masalahnya, bukan fix — kalender acuannya masih UTC,
      bukan WIB), baru bener di percobaan kedua pakai pola geser +7 jam
      `wibNow()` yang sudah ada persis di
      `app/api/cron/daily-reminder/route.ts` buat nentuin kalender WIB
      yang benar sebelum hitung akhir hari. Re-verified reproduce case
      yang sama (masih di window bug jam 06:5x WIB) → `assets.total`
      sekarang benar 1.000.000 (sebelumnya 0), `asOf` response
      `2026-07-13T23:59:59.999Z` (akhir hari WIB, bukan UTC); data uji
      dibersihkan. **Catatan buat masa depan**: kalau ada laporan lain
      yang butuh default "sampai hari ini" (bukan date-range fiscal year
      kayak Laporan Laba Rugi yang punya akhir periode jauh di masa
      depan sehingga tidak kena bug ini), pola `wibNow()` + akhir hari
      WAJIB dipakai, bukan `new Date()` mentah

## Fase 82 — Mobile Bottom Tab Bar buat Pundi Business

User buka Pundi Business di mobile dan tidak nemu menu apa-apa —
sebelumnya versi mobile cuma punya dropdown di avatar top bar yang
nge-list SEMUA 7 item nav sekaligus (kurang idiomatis & gampang
kepencet salah), beda jauh dari pengalaman mobile Pundi personal yang
sudah punya bottom tab bar + halaman "Lainnya" (Fase 71). Diminta
disamakan polanya, reuse persis `components/app-shell.tsx`.

- [x] `components/business/business-shell.tsx` (diubah) — tambah bottom
      tab bar mobile (floating pill, pola & styling sama persis
      `app-shell.tsx`, cuma warna slate bukan emerald): 4 tab utama
      (Dashboard/Transaksi Baru/Jurnal/Laporan Laba Rugi — dipilih karena
      paling sering dicek/dipakai harian) + 1 slot "Lainnya" buat sisanya
      (Akun/Neraca/Pengaturan/Panduan). Top bar mobile diubah dari
      dropdown-berisi-semua-item jadi pola back-button+judul pas di
      halaman sekunder (persis `SECONDARY_PAGE_TITLES` personal), avatar
      dropdown disederhanakan jadi cuma akun-level actions (Panduan,
      Hubungi WhatsApp, Kembali ke Pundi, Keluar) — bukan lagi nav
      lengkap
- [x] `app/(business)/business/[companyId]/more/page.tsx` (baru) — tujuan
      tab "Lainnya", pola sama persis `app/(app)/more/page.tsx` personal:
      Card profil user, Card daftar item nav sekunder (Akun/Neraca/
      Pengaturan) sebagai list tap-target besar, Card Panduan+Hubungi,
      Card Kembali ke Pundi+Keluar. **Tambahan yang personal tidak
      punya**: company switcher (list semua company + "Perusahaan
      Baru") — perlu di mobile karena Business (beda dari personal)
      support multi-company per user, dan sebelumnya cuma ada di
      sidebar desktop
- [x] tsc, eslint bersih; `pnpm build` sukses (`/business/[companyId]/
      more` masuk daftar route)
- [x] Verifikasi fungsional lewat curl (akun uji throwaway): semua 9
      destinasi (dashboard, transactions/new, journal-entries, reports/
      income-statement, reports/balance-sheet, accounts, settings,
      panduan, more) dicek satu-satu → semua 200 (bukan redirect ke
      login atau 404); data uji dibersihkan
- [x] **Bug ditemukan user lewat screenshot**: label tab bottom mobile
      "Transaksi Baru" & "Laporan Laba Rugi" kebungkus 2 baris di slot
      grid-cols-5 yang sempit, bikin baris ikon jadi tidak sejajar
      antar-tab. Diperbaiki dengan label khusus mobile 1 kata (`MOBILE_TABS`:
      Dashboard/Catat/Jurnal/Laba Rugi — beda dari label lengkap di
      sidebar desktop) + `whitespace-nowrap` sebagai jaring pengaman

## Fase 83 — Redesign Onboarding Business (Full-Screen, Konsisten Personal)

User bandingkan halaman `/business/onboarding` dengan onboarding personal
Pundi (`app/onboarding/page.tsx`) — kurang menarik karena masih dibungkus
`BusinessShell` (sidebar dengan "Pilih Perusahaan" kosong, "Kembali ke
Pundi") padahal user belum punya company sama sekali, beda dari onboarding
personal yang full-screen standalone dengan gradient blob & progress bar.

- [x] **Pindah lokasi file** — `app/(business)/business/onboarding/
      page.tsx` dipindah jadi `app/business/onboarding/page.tsx` (di luar
      route group `(business)`, pola sama persis `app/onboarding/
      page.tsx` personal yang juga di luar `(app)`). URL TETAP
      `/business/onboarding` (route group tidak nambah segment URL) —
      efeknya cuma lepas dari layout `BusinessShell`, dapat kontrol penuh
      buat full-screen treatment. Terverifikasi tidak ada konflik routing
      sama `app/(business)/business/[companyId]/...` yang dinamis (Next.js
      App Router memang mendukung split route across groups begini)
  - **Efek samping positif**: route ini sekarang `○` (static) di build
    output, bukan `ƒ` (dynamic) — karena tidak lagi lewat
    `getServerSession` di layout `BusinessShell`
- [x] Redesign visual full-screen (reuse pola persis `app/onboarding/
      page.tsx`, tema slate bukan emerald): background gradient + blob
      dekoratif slate (pola sama `app/register/business/page.tsx`, bukan
      `GradientBlobs` component yang hardcode warna emerald), progress
      bar 2 segmen ("Perusahaan"/"Modal Awal") + label langkah, Card
      `shadow-xl border-0`, step 1 dapat icon badge besar (`size-16
      rounded-3xl`) + headline terpusat sebelum form (gabungan
      "welcome"+form jadi satu layar, karena onboarding Business cuma
      2 langkah nyata bukan 4 kayak personal)
- [x] tsc, eslint bersih; `pnpm build` sukses, tidak ada route conflict
- [x] Verifikasi fungsional lewat curl (akun uji throwaway): `GET
      /business/onboarding` (authed) → 200; data uji dibersihkan
- [x] **Bug ditemukan user lewat screenshot mobile**: baris akun di
      halaman Akun (`AccountRow` di `.../accounts/page.tsx`) pakai
      `flex items-center justify-between` satu baris tanpa wrap — di
      layar sempit, nama akun panjang ("Piutang Usaha", "Prive /
      Penarikan Pemilik") kebungkus tapi badge "bawaan" & saldo "Rp 0"
      (sisi kanan `shrink-0`) ke-posisi di baris yang sama secara visual
      jadi TUMPANG TINDIH ("bawaaRp 0"). Diperbaiki jadi layout stack
      2-baris di mobile (`flex-col`, kiri: kode+nama+badge dengan
      `flex-wrap`; kanan: saldo+kontrol) yang balik jadi 1 baris di
      `sm:` ke atas (`sm:flex-row sm:justify-between`) — pola grid
      responsif yang sama juga diterapkan ke form "Akun Baru"
      (`grid-cols-1 sm:grid-cols-2`, sebelumnya 2 kolom fixed di semua
      ukuran layar)
- [x] tsc, eslint bersih; `pnpm build` sukses

## Fase 84 — Card "Beban Berulang Aktif" di Dashboard Business

User minta Dashboard nampilin beban berulang yang lagi aktif, biar tidak
perlu bolak-balik ke Pengaturan buat cek apa saja yang sudah dijadwalkan.

- [x] `.../[companyId]/dashboard/page.tsx` (diubah) — Card baru "Beban
      Berulang Aktif" setelah Card "Beban Terbesar": fetch
      `GET .../recurring-expenses` (endpoint yang sudah ada dari Fase 80,
      tidak ada API baru), filter `active`, urut berdasarkan `dayOfMonth`
      terdekat. Tiap baris nampilin nama, jadwal ("Tiap tanggal N" /
      "Tiap {bulan}, tgl N"), dan nominal — plus badge amber "Jatuh tempo
      hari ini" (helper `isDueToday`, cek `dayOfMonth` cocok tanggal hari
      ini DAN, kalau `yearly`, `month` juga cocok) buat item yang
      persis jatuh tempo pas dibuka. Tombol "Kelola" di header Card
      nge-link ke Pengaturan buat tambah/edit/nonaktifkan
- [x] `isDueToday` sengaja pakai `new Date()` browser (client component,
      bukan default boundary server) — beda dari bug WIB Fase 81, di sini
      tidak ada isu timezone karena jam yang dipakai adalah jam device
      user sendiri (WIB), bukan UTC server, jadi tanggal kalendernya
      sudah otomatis benar tanpa perlu geser offset apa pun
- [x] tsc, eslint bersih; `pnpm build` sukses
- [x] Verifikasi fungsional lewat curl (akun uji throwaway): bikin
      recurring expense `dayOfMonth`=tanggal WIB hari ini, `frequency:
      yearly`, `month`=bulan WIB berjalan → `GET recurring-expenses`
      balikin field lengkap (name/amount/dayOfMonth/frequency/month/
      active) yang persis dikonsumsi card baru; data uji dibersihkan

## Fase 85 — Grouping Sidebar Desktop Pundi Business (Konsisten Personal)

User minta sidebar desktop Business dikelompokkan seperti personal Pundi
(`NAV_GROUPS` di `components/app-shell.tsx`: Input/Laporan/Pengaturan
dengan section header), bukan 7 item flat tanpa pengelompokan.

- [x] `components/business/business-shell.tsx` (diubah) — `navItems()`
      (flat) diganti `navGroups()` yang balikin `NavGroup[]`, pola sama
      persis `NAV_GROUPS` personal:
      - *(tanpa label)*: Dashboard
      - **Input**: Transaksi Baru, Jurnal
      - **Laporan**: Laporan Laba Rugi, Neraca
      - **Pengaturan**: Akun, Pengaturan (Akun dikelompokkan sebagai
        konfigurasi/referensi, bukan "Input" — sejalan sama placement-nya
        di tab "Lainnya" mobile Fase 82)
      - Flat `items` (dipakai `mobileTabItems` & `MORE_MENU_SUFFIXES`)
        sekarang diturunkan lewat `groups.flatMap((g) => g.items)` — satu
        sumber kebenaran, tidak ada 2 daftar nav yang bisa saling
        kedaluwarsa
      - Sidebar desktop render section header (`text-[11px] font-semibold
        uppercase tracking-wider text-muted-foreground/70`) sebelum tiap
        grup berlabel — styling & struktur JSX disalin persis dari
        `app-shell.tsx`. Bottom tab bar mobile TETAP flat (tidak berubah,
        tidak ada ruang buat section header di situ)
- [x] tsc, eslint bersih; `pnpm build` sukses

## Fase 86 — Login Ingat Mode Terakhir (Personal/Business)

User keluhan: user yang cuma pakai Pundi Business selalu diarahkan ke
dashboard personal tiap habis login — harus klik "Pundi Business" manual
tiap kali. Didiskusikan 2 opsi (otomatis inget mode terakhir vs toggle
manual di Settings), user pilih **otomatis** (zero-config, konsisten sama
pola "last company" yang sudah pakai localStorage).

- [x] `lib/pundiMode.ts` (baru) — `setPundiMode("personal"|"business")`
      nulis cookie `pundi_mode` (BUKAN httpOnly — sengaja bisa dibaca
      client DAN `proxy.ts` server-side), `getPundiMode()` buat baca
      balik di client (dipakai `app/login/page.tsx`)
- [x] `components/app-shell.tsx` & `components/business/business-shell.tsx`
      (diubah) — masing-masing `setPundiMode("personal")`/
      `setPundiMode("business")` di `useEffect` sekali waktu mount. Efeknya:
      begitu user buka HALAMAN APAPUN di salah satu mode, cookie ke-update
      ke mode itu — "mode terakhir" murni ditentukan dari histori
      kunjungan, tidak perlu pengaturan eksplisit
- [x] `proxy.ts` (diubah) — blok `token && isPublicRoute` (user yang
      sudah login buka `/`, `/login`, `/register`, dst) sekarang baca
      cookie `pundi_mode` buat nentuin redirect ke `/dashboard` (default,
      kalau cookie belum ada — user baru) atau `/business` (yang sendiri
      sudah auto-redirect ke company terakhir/onboarding, logic lama
      tidak disentuh)
- [x] `app/login/page.tsx` (diubah) — **root cause kedua yang ditemukan**:
      form submit habis login sukses `router.push(callbackUrl)` dengan
      fallback hardcode `"/dashboard"` — ini CLIENT-SIDE push abis
      `signIn()`, tidak lewat blok `isPublicRoute` di `proxy.ts` sama
      sekali (targetnya langsung `/dashboard`, bukan public route), jadi
      fix `proxy.ts` doang TIDAK CUKUP. Fallback diganti baca
      `getPundiMode()` juga — `callbackUrl` dari query string (kasus
      diusir dari halaman protected) tetap diprioritaskan, mode cookie
      cuma dipakai kalau tidak ada `callbackUrl` eksplisit. Pembacaan
      cookie sengaja ditaruh di dalam `handleSubmit` (event handler),
      bukan di render — `document.cookie` tidak ada di server-render
      pass biar tidak mismatch hydration
- [x] tsc, eslint bersih; `pnpm build` sukses
- [x] Verifikasi fungsional lewat curl (akun uji throwaway, cookie
      `pundi_mode` di-set manual lewat `-b` buat simulasikan apa yang
      BusinessShell/AppShell lakukan client-side): `GET /` tanpa cookie
      mode → redirect `/dashboard` (default aman buat user baru) →
      dengan `pundi_mode=business` → redirect `/business` → dengan
      `pundi_mode=personal` → redirect `/dashboard` → `GET /login`
      dengan `pundi_mode=business` → sama-sama redirect `/business`
      (konfirmasi semua public route kena logic yang sama); data uji
      dibersihkan

## Fase 87 — Laporan Arus Kas (Cash Flow Statement)

Lanjutan rekomendasi fitur setelah Neraca — melengkapi trio laporan
keuangan standar (Laba Rugi + Neraca + Arus Kas). User setuju langsung
gas tanpa perlu penjelasan konsep dulu (beda dari Neraca kemarin).

- [x] **Keputusan desain — metode LANGSUNG (direct method), bukan tidak
      langsung**: karena semua transaksi sudah tercatat double-entry
      lengkap, arus kas dihitung langsung dari baris jurnal yang
      menyentuh akun Kas/Bank tiap periode — bukan direkonstruksi dari
      selisih Neraca 2 titik waktu (metode tidak langsung), yang baru
      relevan kalau ada item non-kas kompleks (mis. depresiasi) yang
      butuh disesuaikan balik. Klasifikasi 3 aktivitas standar: Operasi
      (lawan akun revenue/expense/asset non-kas/liability), Pendanaan
      (lawan akun equity — Modal Pemilik/Prive), Investasi (SELALU Rp0
      buat sekarang — CoA belum punya akun Aset Tetap, di luar scope
      sampai modul itu ada, tapi seksi tetap ditampilkan biar format
      laporan konsisten sama standar 3-aktivitas)
- [x] **Bug ditemukan & diperbaiki SEBELUM testing** (nemu sendiri lewat
      reasoning, bukan lewat screenshot user kali ini): implementasi
      awal memproses baris NON-kas dari SEMUA entry tanpa syarat — entry
      akrual murni (mis. debit Beban Admin/kredit Utang Usaha, belum
      dibayar sama sekali) jadinya tetap muncul di breakdown `byAccount`
      Aktivitas Operasi (saling meniadakan di TOTAL tapi individual
      row-nya tetap kelihatan), padahal tidak ada kas yang beneran
      bergerak. Diperbaiki dengan guard `touchesCash` per-entry — entry
      yang sama sekali tidak punya baris akun kas di-skip total, tidak
      diproses sama sekali
- [x] `app/api/business/companies/[id]/reports/cash-flow/route.ts`
      (baru) — date-range (`from`/`to`, `defaultRange` per fiscal year,
      copy-paste sama persis dari `income-statement/route.ts`, bukan
      snapshot 1 tanggal kayak Neraca). `beginningCash` dihitung dari
      semua entry SEBELUM `from`, `periodCashDelta` dari baris kas
      langsung di periode ini, `operating`/`financing` dari kontribusi
      baris NON-kas (transfer antar-kas — mis. Kas ke Bank — otomatis
      saling meniadakan karena kedua baris sama-sama `isCashAccount`,
      tidak ada baris "lawan" yang diproses). `isBalanced` (sanity
      check): total `operating+investing+financing` (direkonstruksi
      dari baris non-kas) HARUS persis sama dengan `periodCashDelta`
      (dihitung langsung dari baris kas) — dua cara hitung independen
      yang harus konvergen, pola sama semangatnya kayak Neraca
- [x] `.../reports/cash-flow/page.tsx` (baru) — pola sama persis Laporan
      Laba Rugi (date-range Popover+Calendar, `no-print`,
      `window.print()`), 4 Card (Aktivitas Operasi, Aktivitas Investasi
      dengan pesan "belum ada modul Aset Tetap", Aktivitas Pendanaan,
      Ringkasan: kenaikan/penurunan kas bersih + kas awal + kas akhir) +
      badge "Seimbang ✓" kalau `isBalanced` (pola sama Neraca)
- [x] Nav — `components/business/business-shell.tsx` (item baru "Arus
      Kas" icon `Waves` di grup "Laporan" desktop, ditambah ke
      `MORE_MENU_SUFFIXES`/`SECONDARY_PAGE_TITLES`), `.../more/page.tsx`
      mobile (item menu baru), `.../panduan/page.tsx` (FAQ baru
      jelasin bedanya Arus Kas vs Laba Rugi vs Neraca, termasuk insight
      "bisa untung di Laba Rugi tapi Arus Kas negatif kalau uang
      tertahan di Piutang/Persediaan")
- [x] tsc, eslint bersih (cuma warning `exhaustive-deps` yang sudah lazim
      ditoleransi); `pnpm build` sukses (`/business/[companyId]/reports/
      cash-flow` masuk daftar route)
- [x] Verifikasi fungsional lewat curl (akun uji throwaway, skenario 6
      jurnal): setor modal 5jt (financing) → penjualan tunai 2jt
      (operating) → bayar sewa 500rb dari Bank (operating) → prive 200rb
      (financing) → **transfer 1jt Kas↔Bank** (harus TIDAK muncul sama
      sekali) → **akrual murni Beban Admin/Utang Usaha 300rb belum
      dibayar** (harus TIDAK muncul sama sekali, konfirmasi fix bug di
      atas). Hasil: `operating.total` 1.500.000 (2jt-500rb, byAccount
      cuma 2 baris: Pendapatan Penjualan & Beban Sewa, TIDAK ada Beban
      Admin/Utang Usaha) → `financing.total` 4.800.000 (5jt-200rb) →
      `investing.total` 0 → `netCashFlow`=`endingCash` 6.300.000,
      `isBalanced: true` → cross-check independen: saldo Kas+Bank
      aktual dari `GET accounts` persis 6.300.000, cocok 100% sama
      `endingCash`; data uji dibersihkan
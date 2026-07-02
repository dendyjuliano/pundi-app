# Pundi — System Design

## 1. Tujuan Aplikasi

Aplikasi pengelolaan keuangan keluarga untuk mencatat pemasukan (multi sumber),
mengalokasikan pemasukan ke pos-pos tetap bulanan (fixed cost, jatah makan,
investasi), lalu melacak pengeluaran harian dan membandingkannya terhadap
budget yang sudah dialokasikan — mingguan maupun bulanan.

Model bisnis mengikuti kebiasaan pencatatan manual yang sudah berjalan di
spreadsheet (lihat referensi struktur di riwayat diskusi), diadaptasi menjadi
aplikasi web.

## 2. Aktor & Role

Sejak Fase 28, Pundi bersifat **multi-grup (multi-tenant)** — satu
deployment/database bisa dipakai banyak grup independen yang tidak saling
kenal (keluarga, organisasi, tim — istilahnya generik, bukan cuma keluarga),
masing-masing terisolasi lewat entitas **Family** (nama koleksi tetap
`Family` di kode, tapi konsepnya generik "grup").

| Role   | Akses                                                                          |
|--------|-----------------------------------------------------------------------------------|
| admin  | Pemilik/pengelola grup. Semua fitur member + dashboard gabungan, TAPI cuma untuk user dengan `familyId` yang sama dengannya |
| member | Kelola income, alokasi, budget makan, dan expense miliknya sendiri, di dalam 1 `familyId` yang sama dengan admin yang membuatnya |

Data **tidak digabung** menjadi satu pool bersama — tiap user punya budget
dan pengeluaran sendiri-sendiri. Admin hanya punya *visibility* tambahan ke
data member **dalam grupnya sendiri**, bukan kepemilikan bersama dan bukan
visibility ke grup lain.

Tiap user (admin maupun member) wajib punya `familyId`. Admin baru dibuat
lewat 2 jalur:
1. **`/register`** (publik, tanpa login) — siapa saja bisa daftar jadi
   admin dari grup BARU (family baru otomatis dibuat bersamaan).
2. **Admin membuat admin/member lain** lewat `/admin` — user baru selalu
   ikut `familyId` admin yang membuatnya (tidak bisa pilih grup lain).

Penegakan batas grup dilakukan di server (`lib/session.ts`
`resolveAdminTargetUserId()` dan filter `familyId` di tiap query admin),
bukan cuma disembunyikan di UI — lihat §6 dan Fase 28 di `PLAN.md`.

## 3. Konsep Inti

### 3.1 Kategori (katalog, reusable tiap bulan)

- **Income Category** — nama sumber pemasukan, mis. "RDS", "Brixee Singapore".
  Dibuat sekali, dipakai berulang di tiap `monthlyBudget`.
- **Allocation Category** — nama pos alokasi/pengeluaran tetap, mis.
  "TF Ibu", "TF Bapak", "Kosan", "Invest". Punya `type`:
  - `fixed` — biaya tetap manual (Kosan, TF Ibu, dst)
  - `food` — jatah makan (dihitung otomatis dari rate harian × jumlah hari)
  - `invest` — alokasi investasi
  - `other` — pos lain di luar 3 tipe di atas

### 3.2 Monthly Budget

Dibuat oleh user tiap awal bulan. Berisi daftar income (nilai per kategori)
dan daftar allocation (nilai per kategori) untuk bulan tersebut.

**Auto-prefill (baca)**: saat user membuka bulan yang belum punya budget,
`getMonthlyBudgetOrDraft` meng-copy struktur & nilai dari bulan sebelumnya
sebagai draft (belum tersimpan ke DB), lalu user tinggal edit angka yang
berubah.

**Propagasi ke depan (tulis, sejak Fase 39)**: begitu user klik "Simpan
Budget" untuk suatu bulan, `propagateBudgetForward` otomatis menulis
`MonthlyBudget` permanen (bukan cuma draft) untuk bulan-bulan SETELAHNYA
yang masih benar-benar kosong (belum pernah tersimpan sama sekali) —
carry-forward nilai yang sama, pos `food` tetap dihitung ulang sesuai
jumlah hari tiap bulan. Berhenti otomatis begitu ketemu bulan yang sudah
punya data sendiri (tidak pernah menimpa), dibatasi 24 bulan ke depan
sebagai pengaman. Bulan-bulan SEBELUM bulan yang disimpan tidak disentuh
sama sekali — propagasi cuma maju, tidak pernah mundur.

Pos "Makan" di allocation dihitung otomatis:
```
jatah_makan_bulan = dailyBudgetSetting.amountPerDay × jumlah_hari_di_bulan_itu
```
Nilai ini tetap bisa di-override manual per bulan kalau perlu.

**Kalkulasi turunan (tidak disimpan, dihitung saat request):**
```
totalIncome      = sum(monthlyBudget.incomes[].amount)
totalAllocation  = sum(monthlyBudget.allocations[].amount)   // termasuk food
totalBersih      = totalIncome - totalAllocation
```
`totalBersih` adalah sisa yang jadi "budget lain-lain" harian.

**Realisasi investasi**: tiap baris `allocations[]` punya field `realized`
(default 0), tapi cuma bermakna untuk kategori bertipe `invest` — nilai
investasi yang benar-benar sudah dijalankan bulan itu, dibandingkan ke
`amount` (rencana) di baris yang sama. Berbeda dari `amount`, `realized`
**tidak** di-carry-forward ke draft bulan baru (selalu mulai dari 0) karena
ini angka aktual per-bulan, bukan rencana yang wajar diulang. Ditampilkan
di `/budget` sebagai sub-input "Realisasi" di bawah tiap baris kategori
invest, plus badge status ("Sesuai rencana" / "Kurang Rp X") dan ringkasan
total (realisasi vs rencana gabungan semua kategori invest).

### 3.3 Daily Budget Setting

Menyimpan nilai jatah makan per hari (default awal, mis. Rp 100.000).
Disimpan dengan `effectiveFrom` supaya kalau nilainya diubah, histori bulan
lama tetap akurat merefer ke rate yang berlaku saat itu (bukan retroaktif
berubah semua).

### 3.4 Expense (input harian)

Dicatat kronologis oleh user setiap kali ada pengeluaran:
```
{ userId, date, category: 'makan' | 'lain-lain', amount, note }
```
- `note` wajib untuk kategori `lain-lain`, opsional untuk `makan`.
- Sistem **tidak** mewajibkan grid mingguan seperti Excel — user input dalam
  bentuk list transaksi biasa, pengelompokan minggu dihitung otomatis saat
  membuat laporan (minggu ke-N dalam bulan = `ceil(day_of_month / 7)`, atau
  bisa disesuaikan ke minggu kalender — diputuskan saat implementasi report).

## 4. Kalkulasi & Laporan

### 4.1 Ringkasan Harian
- Total makan hari ini vs `dailyBudgetSetting.amountPerDay`
- Total lain-lain hari ini

### 4.2 Ringkasan Mingguan
- Total makan minggu ini, total lain-lain minggu ini
- Sisa budget makan minggu ini = (rate harian × jumlah hari berjalan di minggu itu) − total makan aktual
- Sisa budget lain-lain minggu ini = porsi alokasi lain-lain minggu itu − total lain-lain aktual

### 4.3 Ringkasan Bulanan
- Total pengeluaran aktual (makan + lain-lain) vs Target Pengeluaran
  (Target = alokasi pos bertipe `food` + `totalBersih`, karena fixed cost
  dan invest bukan pengeluaran yang dicatat harian) → status
  "on track" / "melenceng"
- Alokasi penghasilan dalam persentase per kategori
- Pengeluaran makan bulanan: nilai tertinggi harian vs rata-rata harian

### 4.4 Visualisasi (chart)
1. Bar chart pengeluaran bulanan (per tahun) + garis Target Pengeluaran + trendline
2. **100%-stacked horizontal bar** alokasi penghasilan (% per kategori +
   sisa bersih) — dipilih menggantikan pie chart mengikuti rekomendasi
   skill dataviz (part-to-whole lebih terbaca sebagai stacked bar;
   pie chart termasuk anti-pattern yang dihindari kecuali untuk 2 slice)
3. Bar chart pengeluaran makan bulanan: nilai tertinggi vs rata-rata + trendline

Palet warna kategorikal untuk chart divalidasi lewat
`scripts/validate_palette.js` dari skill dataviz (CVD-safety, kontras)
sebelum dipakai — lihat `lib/chartColors.ts`.

## 5. Skema Data (MongoDB / Mongoose)

```
families
  _id, name, createdAt

users
  _id, name, email, passwordHash, role: 'admin' | 'member', familyId, createdAt

incomeCategories
  _id, userId, name, createdAt

allocationCategories
  _id, userId, name, type: 'fixed' | 'food' | 'invest' | 'other', createdAt

monthlyBudget
  _id, userId, month ("YYYY-MM"),
  incomes: [{ categoryId, amount }],
  allocations: [{ categoryId, amount, realized }],
  createdAt, updatedAt

dailyBudgetSetting
  _id, userId, amountPerDay, effectiveFrom, createdAt

expenses
  _id, userId, date, category: 'makan' | 'lain-lain', amount, note, createdAt
```

Semua koleksi punya `userId` untuk isolasi data per user; admin query lintas
`userId` untuk dashboard gabungan **tapi dibatasi ke user dengan `familyId`
yang sama** (lihat §2 dan §6) — `users.familyId` adalah batas isolasi
antar-keluarga, `expenses`/`monthlyBudget`/dst tidak perlu tahu soal family
sama sekali karena mereka sudah di-scope lewat `userId`, dan `userId` itu
sendiri sudah terikat ke satu `familyId` tertentu.

**Index**: `users` → `{ familyId: 1 }`, `expenses` → `{ userId: 1, date: -1 }`,
`dailyBudgetSetting` → `{ userId: 1, effectiveFrom: -1 }`,
`incomeCategories`/`allocationCategories` → `{ userId: 1 }`, `monthlyBudget`
→ `{ userId: 1, month: 1 }` (unique, sejak awal). Dipilih sesuai pola query
yang benar-benar dipakai (filter by `userId`/`familyId` + range/sort
tanggal), bukan index generik.

## 6. Stack Teknis

| Layer      | Pilihan                                              |
|------------|-------------------------------------------------------|
| Framework  | Next.js 16 App Router (baca `node_modules/next/dist/docs/` dulu — ada breaking changes di versi ini) |
| Database   | MongoDB Atlas                                          |
| ODM        | Mongoose                                               |
| Auth       | Auth.js (NextAuth) credentials login, JWT session strategy (tanpa DB adapter) |
| API        | Next.js Route Handlers (`app/api/**`)                  |
| UI         | Tailwind CSS v4 + shadcn/ui (base Radix, style `base-nova`, base color `neutral`, accent emerald) |
| Chart      | Recharts (palet kategorikal tervalidasi skill dataviz, lihat `lib/chartColors.ts`) |
| Notifikasi | `sonner` (toast) — dipasang sekali di `app/layout.tsx`, dipakai konsisten di semua aksi simpan/tambah/hapus (Budget, Settings, Expenses, Admin) |

Halaman terautentikasi (`(app)` route group) dibungkus `components/app-shell.tsx`:
sidebar collapsible di desktop (≥768px), bottom tab bar ala aplikasi mobile
finance di layar kecil. Tidak ada dark mode (`.dark` class tidak pernah di-toggle).

## 7. Halaman (Routes)

| Route            | Akses         | Deskripsi                                          |
|-------------------|--------------|-----------------------------------------------------|
| `/login`           | public       | Login                                               |
| `/register`         | public       | Daftar jadi admin baru — bikin `Family` (grup) + `User` role admin sekaligus, auto sign-in, lanjut ke `/onboarding` |
| `/onboarding`        | user (baru login) | Wizard 5-step opsional (bisa di-skip kapan saja) untuk isi kategori income/alokasi & jatah makan pertama kali, ditampilkan sekali sesudah `/register` |
| `/dashboard`        | user         | Ringkasan bulan (pilih bulan/tahun bebas via month picker): income, alokasi, sisa bersih, rincian semua minggu dalam bulan |
| `/budget`           | user         | Kelola monthly budget (income + allocation per bulan) |
| `/expenses`          | user         | Input & list pengeluaran harian, navigasi per bulan  |
| `/settings`          | user         | Jatah makan/hari, kelola kategori income & alokasi   |
| `/reports`            | user         | Laporan mingguan/bulanan + chart                     |
| `/admin`               | admin only   | Dashboard gabungan anggota keluarga sendiri (bukan semua user) |

Route `/dashboard`, `/budget`, `/expenses`, `/settings`, `/reports`, `/admin`
secara fisik ada di `app/(app)/` (route group — tidak mengubah URL) supaya
berbagi satu `layout.tsx` yang merender `AppShell`.

`/dashboard` adalah Client Component (`useSession` + fetch), datanya
diambil dari `GET /api/dashboard-summary?month=YYYY-MM` yang membungkus
`getDashboardSummary()` di `lib/dashboardSummary.ts`. Fungsi itu menerima
`referenceDate` opsional (default `new Date()`); saat bulan yang diminta
bukan bulan berjalan, section "Hari Ini" otomatis `null` (tidak relevan
untuk bulan lampau/masa depan), dan rincian mingguan (`weeks[]`) selalu
berisi *semua* minggu dalam bulan tsb (bukan cuma minggu tempat tanggal
hari ini berada).

Dashboard punya toggle **Bulanan/Tahunan**. Mode Tahunan mengambil data
dari `GET /api/dashboard-summary-yearly?year=YYYY` yang membungkus
`getYearlyDashboardSummary()` — meng-agregasi 12 bulan sekaligus lewat
`getMonthBreakdown()` (shared dengan mode bulanan, lihat `lib/dashboardSummary.ts`).
Hasilnya: hero card total setahun + list ringkas 12 bulan (nama bulan,
progress bar Makan & Lain-lain terpisah, badge status), bukan 12 card
besar seperti versi mingguan — supaya tetap ringkas dan mudah di-scan.

**Admin melihat dashboard anggota lain**: kedua endpoint di atas menerima
parameter opsional `?userId=`. Kalau `userId` diisi dan berbeda dari user
yang login, endpoint mengecek `role === "admin"` (403 kalau bukan) sebelum
memakainya sebagai target data — jadi member biasa tidak bisa mengintip
data user lain lewat query string. Di UI, `/dashboard` menampilkan
dropdown pemilihan anggota (diisi dari `GET /api/admin/members`, endpoint
ringan khusus admin yang hanya mengembalikan `id/name/role` tanpa
menghitung summary) — dropdown ini hanya muncul untuk admin. Halaman
`/admin` juga punya tombol "Lihat Dashboard Lengkap" per anggota yang
mengarah ke `/dashboard?userId=<id>`, supaya admin bisa langsung membuka
dashboard lengkap (bulanan + tahunan, bukan cuma ringkasan accordion)
milik member tertentu.

## 8. Fitur v2 (Belum Termasuk MVP)

- Import mutasi bank / CSV
- Multi-currency

Sudah dikerjakan (dipindah dari daftar ini): tracking realisasi investasi
vs rencana alokasi Invest — lihat §3.2 dan Fase 20 di `PLAN.md`.

import Account from "@/models/business/Account";

// Template starter generik buat UMKM — mencakup kelima `type` &
// `reportSection` biar Laporan Laba Rugi langsung bisa dipakai begitu
// company dibuat. Company admin bebas rename/nonaktifkan/tambah akun
// lain lewat halaman Chart of Accounts (akun-akun ini cuma starting
// point, bukan daftar tetap).
const STARTER_ACCOUNTS: {
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  reportSection?:
    | "operating-revenue"
    | "cogs"
    | "operating-expense"
    | "non-operating-revenue"
    | "non-operating-expense";
  costBehavior?: "fixed" | "variable";
}[] = [
  { code: "1100", name: "Kas", type: "asset" },
  { code: "1200", name: "Bank", type: "asset" },
  { code: "1300", name: "Piutang Usaha", type: "asset" },
  { code: "1400", name: "Persediaan", type: "asset" },
  { code: "2100", name: "Utang Usaha", type: "liability" },
  { code: "3100", name: "Modal Pemilik", type: "equity" },
  { code: "3200", name: "Prive / Penarikan Pemilik", type: "equity" },
  {
    code: "4100",
    name: "Pendapatan Penjualan",
    type: "revenue",
    reportSection: "operating-revenue",
  },
  {
    code: "4200",
    name: "Pendapatan Jasa",
    type: "revenue",
    reportSection: "operating-revenue",
  },
  {
    code: "4900",
    name: "Pendapatan Lain-lain",
    type: "revenue",
    reportSection: "non-operating-revenue",
  },
  {
    code: "5100",
    name: "Harga Pokok Penjualan",
    type: "expense",
    reportSection: "cogs",
    costBehavior: "variable",
  },
  {
    code: "6100",
    name: "Beban Gaji",
    type: "expense",
    reportSection: "operating-expense",
    costBehavior: "fixed",
  },
  {
    code: "6200",
    name: "Beban Sewa",
    type: "expense",
    reportSection: "operating-expense",
    costBehavior: "fixed",
  },
  {
    code: "6300",
    name: "Beban Utilitas",
    type: "expense",
    reportSection: "operating-expense",
    costBehavior: "variable",
  },
  {
    code: "6400",
    name: "Beban Pemasaran",
    type: "expense",
    reportSection: "operating-expense",
    costBehavior: "variable",
  },
  {
    code: "6900",
    name: "Beban Administrasi & Umum",
    type: "expense",
    reportSection: "operating-expense",
    costBehavior: "fixed",
  },
  {
    code: "8100",
    name: "Beban Bunga",
    type: "expense",
    reportSection: "non-operating-expense",
    costBehavior: "fixed",
  },
  {
    code: "8900",
    name: "Beban Lain-lain",
    type: "expense",
    reportSection: "non-operating-expense",
    costBehavior: "variable",
  },
];

const DEBIT_NORMAL_TYPES = new Set(["asset", "expense"]);

export async function seedChartOfAccounts(companyId: string) {
  const docs = STARTER_ACCOUNTS.map((account) => ({
    companyId,
    ...account,
    normalBalance: DEBIT_NORMAL_TYPES.has(account.type) ? "debit" : "credit",
    isActive: true,
    isSystemDefault: true,
  }));
  await Account.insertMany(docs);
}

import { Schema, model, models, type InferSchemaType } from "mongoose";

const accountSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    code: { type: String, required: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["asset", "liability", "equity", "revenue", "expense"],
      required: true,
    },
    // Di-set SEKALI saat create dari `type` (asset/expense -> debit;
    // liability/equity/revenue -> credit) dan tidak pernah dihitung ulang —
    // ini fakta klasifikasi akun, beda dari saldo yang genuinely berubah
    // tiap ada jurnal baru (saldo dihitung on-the-fly, lihat lib/business).
    normalBalance: {
      type: String,
      enum: ["debit", "credit"],
      required: true,
    },
    // Cuma relevan/required buat type revenue/expense — drive pengelompokan
    // Laporan Laba Rugi. Kosong buat asset/liability/equity karena Neraca
    // di luar scope MVP.
    reportSection: {
      type: String,
      enum: [
        "operating-revenue",
        "cogs",
        "operating-expense",
        "non-operating-revenue",
        "non-operating-expense",
      ],
    },
    // Tag manajerial murni (cuma buat type expense) — TIDAK dipakai
    // kalkulasi Laporan Laba Rugi resmi sama sekali, cuma buat breakdown
    // fixed/variable di fase depan.
    costBehavior: { type: String, enum: ["fixed", "variable"] },
    // Buat hierarki akun (mis. sub-akun di bawah "Beban Operasional") —
    // schema support dari awal walau UI MVP masih flat-grouped per type.
    parentId: { type: Schema.Types.ObjectId, ref: "Account" },
    isActive: { type: Boolean, default: true },
    // True buat akun yang dibuat dari seed template — UI nampilin badge
    // "bawaan" dan warning sebelum dinonaktifkan.
    isSystemDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Kode akun harus unik per company, dipakai buat validasi create & lookup
// cepat saat posting jurnal.
accountSchema.index({ companyId: 1, code: 1 }, { unique: true });
// Buat render Chart of Accounts terkelompok per tipe.
accountSchema.index({ companyId: 1, type: 1 });
// Dipakai langsung sama aggregation pipeline Laporan Laba Rugi.
accountSchema.index({ companyId: 1, reportSection: 1 });

export type Account = InferSchemaType<typeof accountSchema>;

export default models.Account || model("Account", accountSchema);

import { Schema, model, models, type InferSchemaType } from "mongoose";

const journalLineSchema = new Schema(
  {
    accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    debit: { type: Number, default: 0, min: 0 },
    credit: { type: Number, default: 0, min: 0 },
    memo: { type: String },
  },
  { _id: false }
);

const journalEntrySchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    // Tanggal transaksi (business date), BUKAN createdAt — dipakai buat
    // filter rentang laporan.
    date: { type: Date, required: true },
    description: { type: String, required: true },
    // Minimal 2 baris & debit===credit divalidasi di API (bukan di schema),
    // sama seperti pola validasi lain di app ini (manual, bukan zod).
    lines: { type: [journalLineSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sourceType: {
      type: String,
      enum: ["manual", "reversal"],
      default: "manual",
    },
    // Cuma terisi di entry REVERSAL, nunjuk ke entry asli yang dikoreksi.
    reversalOfEntryId: { type: Schema.Types.ObjectId, ref: "JournalEntry" },
    // Di-flip true di entry ASLI saat ada reversal diposting terhadapnya —
    // biar UI ledger bisa nampilin badge tanpa reverse-lookup tiap render.
    isReversed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// List ledger terbaru dulu, dan filter rentang tanggal buat laporan.
journalEntrySchema.index({ companyId: 1, date: -1 });
// Hitung saldo per akun (aggregate on read) tanpa full collection scan.
journalEntrySchema.index({ companyId: 1, "lines.accountId": 1 });

export type JournalEntry = InferSchemaType<typeof journalEntrySchema>;

export default models.JournalEntry || model("JournalEntry", journalEntrySchema);

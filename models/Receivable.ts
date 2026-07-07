import { Schema, model, models, type InferSchemaType } from "mongoose";

const receivableSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // Nama debitur TEKS BEBAS, SENGAJA BUKAN referensi ke User — orang
    // yang dipinjemin uang belum tentu (bahkan sering tidak) punya akun
    // Pundi. Beda dari SplitBill/Friendship yang emang butuh pihak lain
    // terdaftar. Konsekuensinya: TIDAK ada validasi cross-user, TIDAK
    // ada push notification ke debitur, pencatat sendiri (lender) yang
    // mencatat tiap pembayaran diterima.
    debtorName: { type: String, required: true },
    amount: { type: Number, required: true },
    description: { type: String },
    dueDate: { type: Date },
  },
  { timestamps: true }
);

receivableSchema.index({ userId: 1 });

export type Receivable = InferSchemaType<typeof receivableSchema>;

export default models.Receivable || model("Receivable", receivableSchema);

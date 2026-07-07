import { Schema, model, models, type InferSchemaType } from "mongoose";

const splitBillShareSchema = new Schema(
  {
    splitBillId: {
      type: Schema.Types.ObjectId,
      ref: "SplitBill",
      required: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // Bagian rata dia — sisa pembulatan rupiah (kalau totalAmount tidak
    // habis dibagi rata) masuk ke share milik payer, bukan didistribusi
    // ke semua biar tidak ada pecahan.
    amount: { type: Number, required: true },
    // true otomatis buat baris payer sendiri saat dibuat (dia tidak
    // berutang ke dirinya sendiri) — partisipan lain mulai dari false
    // sampai mereka "Tandai Lunas".
    settled: { type: Boolean, default: false },
    settledAt: { type: Date },
    // Expense yang otomatis tercatat begitu share ini settled — buat
    // baris payer diisi LANGSUNG saat SplitBill dibuat (bagiannya
    // sendiri beneran pengeluaran dia), buat partisipan lain diisi pas
    // mereka settle sendiri.
    expenseId: { type: Schema.Types.ObjectId, ref: "Expense" },
  },
  { timestamps: true }
);

splitBillShareSchema.index({ splitBillId: 1 });
splitBillShareSchema.index({ userId: 1 });

export type SplitBillShare = InferSchemaType<typeof splitBillShareSchema>;

export default models.SplitBillShare ||
  model("SplitBillShare", splitBillShareSchema);

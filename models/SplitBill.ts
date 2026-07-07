import { Schema, model, models, type InferSchemaType } from "mongoose";

const splitBillSchema = new Schema(
  {
    payerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    // Sebelum pajak/service charge.
    subtotal: { type: Number, required: true },
    // Gabungan PPN + service charge jadi SATU persentase (bukan
    // dipisah dengan urutan compounding) — cukup buat kasus umum
    // "struk udah nunjukkin totalan pajak+service X%".
    taxPercent: { type: Number, default: 0 },
    // subtotal + pajak, DISIMPAN (bukan dihitung ulang tiap request)
    // biar tetap akurat historis walau ada bill lain dibuat dengan
    // taxPercent berbeda nanti.
    totalAmount: { type: Number, required: true },
    date: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

splitBillSchema.index({ payerId: 1 });

export type SplitBill = InferSchemaType<typeof splitBillSchema>;

export default models.SplitBill || model("SplitBill", splitBillSchema);

import { Schema, model, models, type InferSchemaType } from "mongoose";

const installmentPaymentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    installmentId: {
      type: Schema.Types.ObjectId,
      ref: "Installment",
      required: true,
    },
    amount: { type: Number, required: true },
    date: { type: Date, required: true, default: Date.now },
    // Tiap pembayaran otomatis ikut tercatat sebagai Expense kategori
    // "lain-lain" (biar Total Bersih/sisa budget di Dashboard ikut
    // berkurang) — field ini nyimpen link ke Expense itu supaya bisa
    // ikut dihapus kalau payment-nya dikoreksi/dihapus.
    expenseId: { type: Schema.Types.ObjectId, ref: "Expense" },
  },
  { timestamps: true }
);

installmentPaymentSchema.index({ userId: 1, installmentId: 1 });

export type InstallmentPayment = InferSchemaType<
  typeof installmentPaymentSchema
>;

export default models.InstallmentPayment ||
  model("InstallmentPayment", installmentPaymentSchema);

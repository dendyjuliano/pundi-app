import { Schema, model, models, type InferSchemaType } from "mongoose";

const receivablePaymentSchema = new Schema(
  {
    receivableId: {
      type: Schema.Types.ObjectId,
      ref: "Receivable",
      required: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    date: { type: Date, required: true, default: Date.now },
    // SENGAJA TIDAK ada `expenseId` — beda dari SavingsContribution/
    // InstallmentPayment, pembayaran piutang yang diterima TIDAK bikin
    // Expense atau income-offset apa pun (app ini tidak model
    // reimbursement), murni catatan "sudah diterima segini".
  },
  { timestamps: true }
);

receivablePaymentSchema.index({ receivableId: 1 });

export type ReceivablePayment = InferSchemaType<
  typeof receivablePaymentSchema
>;

export default models.ReceivablePayment ||
  model("ReceivablePayment", receivablePaymentSchema);

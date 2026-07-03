import { Schema, model, models, type InferSchemaType } from "mongoose";

const savingsContributionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    goalId: { type: Schema.Types.ObjectId, ref: "SavingsGoal", required: true },
    amount: { type: Number, required: true },
    date: { type: Date, required: true, default: Date.now },
    note: { type: String },
    // Tiap kontribusi otomatis ikut tercatat sebagai Expense kategori
    // "lain-lain" (biar Total Bersih/sisa budget di Dashboard ikut
    // berkurang, bukan cuma progress goal-nya doang) — field ini nyimpen
    // link ke Expense itu supaya bisa ikut dihapus kalau kontribusinya
    // dikoreksi/dihapus.
    expenseId: { type: Schema.Types.ObjectId, ref: "Expense" },
  },
  { timestamps: true }
);

savingsContributionSchema.index({ userId: 1, goalId: 1 });

export type SavingsContribution = InferSchemaType<
  typeof savingsContributionSchema
>;

export default models.SavingsContribution ||
  model("SavingsContribution", savingsContributionSchema);

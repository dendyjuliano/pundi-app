import { Schema, model, models, type InferSchemaType } from "mongoose";

const budgetLineSchema = new Schema(
  {
    categoryId: { type: Schema.Types.ObjectId, required: true },
    amount: { type: Number, required: true },
    // Only meaningful for allocation lines whose category type is "invest"
    // (realisasi investasi bulan ini vs rencana di `amount`). Unused for
    // income lines and non-invest allocation types.
    realized: { type: Number, default: 0 },
  },
  { _id: false }
);

const monthlyBudgetSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    month: { type: String, required: true }, // "YYYY-MM"
    incomes: { type: [budgetLineSchema], default: [] },
    allocations: { type: [budgetLineSchema], default: [] },
  },
  { timestamps: true }
);

monthlyBudgetSchema.index({ userId: 1, month: 1 }, { unique: true });

export type MonthlyBudget = InferSchemaType<typeof monthlyBudgetSchema>;

export default models.MonthlyBudget ||
  model("MonthlyBudget", monthlyBudgetSchema);

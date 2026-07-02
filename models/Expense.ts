import { Schema, model, models, type InferSchemaType } from "mongoose";

const expenseSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    category: { type: String, enum: ["makan", "lain-lain"], required: true },
    amount: { type: Number, required: true },
    note: { type: String },
  },
  { timestamps: true }
);

// Matches the dominant query pattern (find by userId within a date range,
// sorted by date desc) used by /api/expenses and dashboard/report aggregations.
expenseSchema.index({ userId: 1, date: -1 });

export type Expense = InferSchemaType<typeof expenseSchema>;

export default models.Expense || model("Expense", expenseSchema);

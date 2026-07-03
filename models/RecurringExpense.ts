import { Schema, model, models, type InferSchemaType } from "mongoose";

const recurringExpenseSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    dayOfMonth: { type: Number, required: true, min: 1, max: 31 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

recurringExpenseSchema.index({ userId: 1 });

export type RecurringExpense = InferSchemaType<typeof recurringExpenseSchema>;

export default models.RecurringExpense ||
  model("RecurringExpense", recurringExpenseSchema);

import { Schema, model, models, type InferSchemaType } from "mongoose";

const recurringExpenseSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    dayOfMonth: { type: Number, required: true, min: 1, max: 31 },
    // Default "monthly" biar item lama (dibuat sebelum field ini ada)
    // tetap jalan seperti sebelumnya tanpa migrasi apa pun — cuma item
    // baru yang pilih "yearly" yang perlu isi `month` juga.
    frequency: { type: String, enum: ["monthly", "yearly"], default: "monthly" },
    // Cuma diisi (1-12) kalau frequency === "yearly" — dicek di cron
    // bareng dayOfMonth, dua-duanya harus cocok baru diingetkan.
    month: { type: Number, min: 1, max: 12 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

recurringExpenseSchema.index({ userId: 1 });

export type RecurringExpense = InferSchemaType<typeof recurringExpenseSchema>;

export default models.RecurringExpense ||
  model("RecurringExpense", recurringExpenseSchema);

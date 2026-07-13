import { Schema, model, models, type InferSchemaType } from "mongoose";

const recurringBusinessExpenseSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    // Akun beban tujuan (mis. Beban Sewa) & akun Kas/Bank sumber dana —
    // beda dari RecurringExpense personal yang cuma nama kategori bebas,
    // di sini harus akun GL konkret karena bakal jadi baris jurnal.
    accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    cashAccountId: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    dayOfMonth: { type: Number, required: true, min: 1, max: 31 },
    frequency: { type: String, enum: ["monthly", "yearly"], default: "monthly" },
    // Cuma diisi (1-12) kalau frequency === "yearly", dicek bareng
    // dayOfMonth di cron — pola identik RecurringExpense personal.
    month: { type: Number, min: 1, max: 12 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

recurringBusinessExpenseSchema.index({ companyId: 1 });

export type RecurringBusinessExpense = InferSchemaType<
  typeof recurringBusinessExpenseSchema
>;

// Nama model SENGAJA "BusinessRecurringExpense" (beda dari "RecurringExpense"
// milik personal) — registry Mongoose global per-koneksi, nama sama akan
// bentrok kalau dua schema beda didaftarkan dengan key yang sama.
export default models.BusinessRecurringExpense ||
  model("BusinessRecurringExpense", recurringBusinessExpenseSchema);

import { Schema, model, models, type InferSchemaType } from "mongoose";

const companySubscriptionSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    trialEndsAt: { type: Date, required: true },
    // Null selama company masih trial / belum pernah ada pembayaran
    // disetujui — status efektif (trial/active/overdue) SELALU dihitung
    // dari tanggal ini + trialEndsAt di lib/business/subscription.ts,
    // tidak pernah disimpan sebagai field terpisah biar tidak bisa drift.
    currentPeriodEnd: { type: Date, default: null },
  },
  { timestamps: true }
);

companySubscriptionSchema.index({ companyId: 1 }, { unique: true });

export type CompanySubscription = InferSchemaType<typeof companySubscriptionSchema>;

export default models.CompanySubscription ||
  model("CompanySubscription", companySubscriptionSchema);

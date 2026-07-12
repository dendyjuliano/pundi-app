import { Schema, model, models, type InferSchemaType } from "mongoose";

const subscriptionPaymentSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    // Snapshot harga saat klaim dibuat, bukan reference ke harga
    // sekarang — biar histori tetap akurat kalau harga berlangganan
    // naik di kemudian hari.
    amount: { type: Number, required: true },
    claimedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    claimedAt: { type: Date, required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    // Diisi owner saat klaim (mis. "transfer BCA a.n. Budi", biar gampang
    // dicocokkan sama mutasi bank) ATAU diisi platform admin saat reject
    // (alasan penolakan, ditampilkan lagi ke owner).
    note: { type: String },
  },
  { timestamps: true }
);

// Dipakai buat guard "sudah ada klaim pending?" & daftar antrian
// verifikasi platform admin.
subscriptionPaymentSchema.index({ companyId: 1, status: 1 });

export type SubscriptionPayment = InferSchemaType<typeof subscriptionPaymentSchema>;

export default models.SubscriptionPayment ||
  model("SubscriptionPayment", subscriptionPaymentSchema);

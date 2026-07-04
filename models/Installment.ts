import { Schema, model, models, type InferSchemaType } from "mongoose";

const installmentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    interestType: { type: String, enum: ["flat", "efektif"], required: true },
    // Pokok pinjaman, suku bunga, dan tenor CUMA dipakai sekali buat
    // menghitung monthlyInstallment saat dibuat — bukan dihitung ulang
    // tiap request, dan sengaja tidak bisa diedit lagi setelah dibuat
    // (lihat PATCH route) karena mengubahnya belakangan jadi ambigu
    // maksudnya apa.
    principal: { type: Number, required: true },
    annualInterestRate: { type: Number, required: true },
    tenorMonths: { type: Number, required: true },
    monthlyInstallment: { type: Number, required: true },
    dayOfMonth: { type: Number, required: true, min: 1, max: 31 },
    // false = lunas (otomatis) ATAU dihentikan manual oleh user.
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

installmentSchema.index({ userId: 1 });

export type Installment = InferSchemaType<typeof installmentSchema>;

export default models.Installment || model("Installment", installmentSchema);

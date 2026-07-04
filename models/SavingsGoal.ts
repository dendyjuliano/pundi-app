import { Schema, model, models, type InferSchemaType } from "mongoose";

const savingsGoalSchema = new Schema(
  {
    // Pembuat goal — dipakai buat cek izin edit/hapus (pembuat + admin
    // keluarga selalu boleh, lihat lib/session.ts canEditGoal).
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // Family pemilik goal ini — dipakai buat query "goal Bersama apa aja
    // yang kelihatan buat anggota keluarga saya", terlepas dari siapa
    // pembuatnya.
    familyId: { type: Schema.Types.ObjectId, ref: "Family", required: true },
    // false (default) = goal Pribadi, cuma kelihatan & bisa dikontribusi
    // pembuatnya sendiri (perilaku lama, tidak berubah). true = goal
    // Bersama, kelihatan & bisa dikontribusi semua anggota familyId ini.
    shared: { type: Boolean, default: false },
    name: { type: String, required: true },
    targetAmount: { type: Number, required: true },
    targetDate: { type: Date },
  },
  { timestamps: true }
);

savingsGoalSchema.index({ userId: 1 });
savingsGoalSchema.index({ familyId: 1, shared: 1 });

export type SavingsGoal = InferSchemaType<typeof savingsGoalSchema>;

export default models.SavingsGoal || model("SavingsGoal", savingsGoalSchema);

import { Schema, model, models, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "member"], default: "member" },
    // Setiap user (admin maupun member) milik tepat satu keluarga. Admin
    // cuma boleh melihat/mengelola user dengan familyId yang sama —
    // ditegakkan di setiap endpoint admin, bukan cuma di UI.
    familyId: { type: Schema.Types.ObjectId, ref: "Family", required: true },
  },
  { timestamps: true }
);

userSchema.index({ familyId: 1 });

export type User = InferSchemaType<typeof userSchema>;

export default models.User || model("User", userSchema);

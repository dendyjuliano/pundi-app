import { Schema, model, models, type InferSchemaType } from "mongoose";

const friendshipSchema = new Schema(
  {
    // Pengirim & penerima request — SENGAJA lintas familyId (beda dari
    // semua fitur lain di app ini yang dibatasi ketat cuma sesama
    // anggota family yang sama). Ini fitur pertama yang sengaja
    // melewati batas itu.
    fromUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    toUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// Cegah dua request pending duplikat dari pasangan & arah yang sama.
friendshipSchema.index({ fromUserId: 1, toUserId: 1 }, { unique: true });
friendshipSchema.index({ toUserId: 1 });

export type Friendship = InferSchemaType<typeof friendshipSchema>;

export default models.Friendship || model("Friendship", friendshipSchema);

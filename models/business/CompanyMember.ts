import { Schema, model, models, type InferSchemaType } from "mongoose";

const companyMemberSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: {
      type: String,
      enum: ["owner", "accountant", "staff"],
      required: true,
    },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Satu user cuma boleh punya satu role per company — ganti role = update
// in place (PATCH), bukan multi-row.
companyMemberSchema.index({ companyId: 1, userId: 1 }, { unique: true });
// Dipakai buat company switcher: "daftar perusahaan saya" tanpa scan semua
// CompanyMember.
companyMemberSchema.index({ userId: 1 });

export type CompanyMember = InferSchemaType<typeof companyMemberSchema>;

export default models.CompanyMember ||
  model("CompanyMember", companyMemberSchema);

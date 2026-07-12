import { Schema, model, models, type InferSchemaType } from "mongoose";

const companySchema = new Schema(
  {
    name: { type: String, required: true },
    legalName: { type: String },
    // Free text, cuma hint buat pilih template Chart of Accounts di fase
    // depan — tidak divalidasi terhadap daftar tertentu.
    industry: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // 1-12, dipakai buat default rentang tanggal laporan ("tahun fiskal
    // berjalan") kalau user tidak kasih from/to eksplisit.
    fiscalYearStartMonth: { type: Number, default: 1, min: 1, max: 12 },
  },
  { timestamps: true }
);

export type Company = InferSchemaType<typeof companySchema>;

export default models.Company || model("Company", companySchema);

import { Schema, model, models, type InferSchemaType } from "mongoose";

const familySchema = new Schema(
  {
    name: { type: String, required: true },
  },
  { timestamps: true }
);

export type Family = InferSchemaType<typeof familySchema>;

export default models.Family || model("Family", familySchema);

import { Schema, model, models, type InferSchemaType } from "mongoose";

const incomeCategorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
  },
  { timestamps: true }
);

incomeCategorySchema.index({ userId: 1 });

export type IncomeCategory = InferSchemaType<typeof incomeCategorySchema>;

export default models.IncomeCategory ||
  model("IncomeCategory", incomeCategorySchema);

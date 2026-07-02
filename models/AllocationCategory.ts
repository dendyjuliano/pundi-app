import { Schema, model, models, type InferSchemaType } from "mongoose";

const allocationCategorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["fixed", "food", "invest", "other"],
      required: true,
    },
  },
  { timestamps: true }
);

allocationCategorySchema.index({ userId: 1 });

export type AllocationCategory = InferSchemaType<
  typeof allocationCategorySchema
>;

export default models.AllocationCategory ||
  model("AllocationCategory", allocationCategorySchema);

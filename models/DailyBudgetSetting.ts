import { Schema, model, models, type InferSchemaType } from "mongoose";

const dailyBudgetSettingSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amountPerDay: { type: Number, required: true },
    effectiveFrom: { type: Date, required: true },
  },
  { timestamps: true }
);

// Matches find({ userId, effectiveFrom: { $lte } }).sort({ effectiveFrom: -1 })
dailyBudgetSettingSchema.index({ userId: 1, effectiveFrom: -1 });

export type DailyBudgetSetting = InferSchemaType<
  typeof dailyBudgetSettingSchema
>;

export default models.DailyBudgetSetting ||
  model("DailyBudgetSetting", dailyBudgetSettingSchema);

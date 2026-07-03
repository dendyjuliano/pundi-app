import { Schema, model, models, type InferSchemaType } from "mongoose";

const savingsGoalSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    targetAmount: { type: Number, required: true },
    targetDate: { type: Date },
  },
  { timestamps: true }
);

savingsGoalSchema.index({ userId: 1 });

export type SavingsGoal = InferSchemaType<typeof savingsGoalSchema>;

export default models.SavingsGoal || model("SavingsGoal", savingsGoalSchema);

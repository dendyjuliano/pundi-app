import { Schema, model, models, type InferSchemaType } from "mongoose";

const pushSubscriptionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
  },
  { timestamps: true }
);

pushSubscriptionSchema.index({ userId: 1 });

export type PushSubscription = InferSchemaType<typeof pushSubscriptionSchema>;

export default models.PushSubscription ||
  model("PushSubscription", pushSubscriptionSchema);

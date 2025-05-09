const mongoose = require("mongoose");
const { Schema } = mongoose;

const orderSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variant: { type: Schema.Types.ObjectId, ref: "Variant" },
    quantity: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    orderId: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processed",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
        "onrefund",
      ],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded", "onrefund", "processed"],
      default: "pending",
    },
    mobile: { type: String },
    address: { type: String },
    store: { type: Schema.Types.ObjectId, ref: "Store" },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;

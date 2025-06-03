const mongoose = require("mongoose");
const { Schema } = mongoose;

const variantSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  offerPrice: {
    type: Number,
  },
  stock: {
    type: Number,
    required: true,
  },
  stockStatus: {
    type: String,
    enum: ["instock", "outofstock"],
    default: "instock",
  },
  attributes: {
    title: String,
    description: String,
  },
  images: [String],
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
  },
  grossPrice: {
    type: Number,
    required: true,
  },
  offer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Offer",
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
} , { timestamps: true });

const Variant = mongoose.model("Variant", variantSchema);
module.exports = Variant;

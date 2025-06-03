const { default: mongoose } = require("mongoose");
const { Schema } = mongoose;

const productSchema = new Schema(
  {
    name: { type: String, required: true },
    brand: { type: Schema.Types.ObjectId, ref: "Brand" },
    category: { type: Schema.Types.ObjectId, ref: "Category" },
    subcategory: { type: Schema.Types.ObjectId, ref: "SubCategory" },
    variants: [{ type: Schema.Types.ObjectId, ref: "Variant" }],
    store: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    activeStatus: { type: Boolean, default: true },
    // References to Variant documents
    // Fields for non-variant products
    
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    label: { type: Schema.Types.ObjectId, ref: "Label" },
    isDeleted: { type: Boolean, default: false },
    offer: { type: Schema.Types.ObjectId, ref: "Offer" },
    priority: { type: Number, enum: [0, 1], default: 0 },
  },
  { timestamps: true }
);

const Product = new mongoose.model("Product", productSchema);
module.exports = Product;

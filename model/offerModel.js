const mongoose = require("mongoose");
const Product = require("./productModel");

const offerSchema = new mongoose.Schema(
  {
    offerType: {
      type: String,
      enum: ["group", "category", "brand", "brandCategory"],
      required: true,
    },
    offerName: {
      type: String,
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: function () {
        return this.offerType === "category" || this.offerType === "brandCategory";
      },
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: function () {
        return this.offerType === "brand" || this.offerType === "brandCategory";
      },
      default: null
    },
    products: {
      type: [String],
      required: function () {
        return this.offerType === "group";
      },
    },
    offerMetric: {
      type: String,
      required: true,
      enum: ["percentage", "fixed"],
    },
    offerValue: {
      type: Number,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    bannerImage: {
      type: String,
      // required: false,
      default:
        "https://img.pikbest.com/origin/10/06/32/66EpIkbEsT5Rb.png!bw700",
    },
    productsCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

//? update document based on offerType
// offerSchema.pre("save", async function (next) {
//   if (this.offerType === "brandCategory") {
//     this.products = [];
//   }
//   if (this.offerType === "brand") {
//     this.category = null;
//     this.products = [];
//   }
//   if (this.offerType === "category") {
//     this.brand = null;
//     this.products = [];
//   }
//   if (this.offerType === "group") {
//     this.brand = null;
//     this.category = null;
//   }
//   next();
// });


const Offer = mongoose.model("Offer", offerSchema);

module.exports = Offer;

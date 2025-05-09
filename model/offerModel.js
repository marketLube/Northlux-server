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
      type: String,
      required: function () {
        return this.offerType === "category";
      },
    },
    brand: {
      type: String,
      required: function () {
        return this.offerType === "brand";
      },
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
offerSchema.pre("save", async function (next) {
  if (this.offerType === "brandCategory") {
    this.products = [];
  }
  if (this.offerType === "brand") {
    this.category = "";
    this.products = [];
  }
  if (this.offerType === "category") {
    this.brand = "";
    this.products = [];
  }
  if (this.offerType === "group") {
    this.brand = "";
    this.category = "";
  }
  next();
});

// offerSchema.pre("findOne", async function (next) {
//   this.populate("products");
//   next();
// });

//? update product offerPrice based on offerType
// offerSchema.pre("save", async function (next) {
//   // // for category
//   // if (this.offerType === "category") {
//   //   const products = await Product.updateMany(
//   //     { category: this.category },
//   //     {
//   //       $set: {
//   //         offerPrice:
//   //           this.offerMetric === "percentage"
//   //             ? { $multiply: ["$productPrice", this.offerValue / 100] }
//   //             : this.offerValue,
//   //       },
//   //     }
//   //   );
//   //   console.log(products);
//   // }

//   // // for brand
//   // if (this.offerType === "brand") {
//   //   const products = await Product.updateMany(
//   //     { brand: this.brand },
//   //     {
//   //       $set: {
//   //         offerPrice:
//   //           this.offerMetric === "percentage"
//   //             ? { $multiply: ["$productPrice", this.offerValue / 100] }
//   //             : this.offerValue,
//   //       },
//   //     }
//   //   );
//   //   console.log(products);
//   // }

//   // // for group
//   // if (this.offerType === "group") {
//   //   const products = await Product.updateMany(
//   //     { _id: { $in: this.products } },
//   //     {
//   //       $set: {
//   //         offerPrice:
//   //           this.offerMetric === "percentage"
//   //             ? { $multiply: ["$productPrice", this.offerValue / 100] }
//   //             : this.offerValue,
//   //       },
//   //     }
//   //   );
//   // }

//   // if (this.offerType === "brandCategory") {
//   //   const products = await Product.updateMany(
//   //     { brand: this.brand, category: this.category },
//   //     {
//   //       $set: {
//   //         offerPrice:
//   //           this.offerMetric === "percentage"
//   //             ? { $multiply: ["$productPrice", this.offerValue / 100] }
//   //             : this.offerValue,
//   //       },
//   //     }
//   //   );
//   //   console.log(products);
//   // }

//   next();
// });

const Offer = mongoose.model("Offer", offerSchema);

module.exports = Offer;

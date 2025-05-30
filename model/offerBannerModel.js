const mongoose = require("mongoose");

const offerBannerSchema = new mongoose.Schema(
  {
    link: {
      type: String,
    },
    image: {
      type: String,
      required: [true, "Banner image is required"],
    },
    section: {
      type: Number,
      required: [true, "Section is required"],
      enum: [1, 2, 3, 4, 5],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("OfferBanner", offerBannerSchema);
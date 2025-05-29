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
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("OfferBanner", offerBannerSchema);
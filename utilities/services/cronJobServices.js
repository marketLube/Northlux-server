const Offer = require("../../model/offerModel");
const Product = require("../../model/productModel");
const Variant = require("../../model/variantsModel");

// Reusable function to delete an offer by ID (core logic from offerController.js)
async function deleteOfferById(offerId) {
  const offer = await Offer.findById(offerId);
  if (!offer) return;
  // Find products associated with the offer
  const products = await Product.find({ offer: offer._id });
  for (const product of products) {
    if (product.variants && product.variants.length > 0) {
      // Update all variants for this product
      await Variant.updateMany({ _id: { $in: product.variants } }, [
        {
          $set: {
            offerPrice: "$price",
            offer: null,
          },
        },
      ]);
      // Update product's offer reference
      await Product.updateOne({ _id: product._id }, { $set: { offer: null } });
    } else {
      // No variants: update product directly
      await Product.updateOne(
        { _id: product._id },
        {
          $set: {
            offerPrice: product.price,
            offer: null,
          },
        }
      );
    }
  }
  await offer.deleteOne();
}

const removeExpiredOffers = async () => {
  try {
    const currentDate = new Date();
    // Find all expired offers
    const expiredOffers = await Offer.find({ endDate: { $lt: currentDate } });
    for (const offer of expiredOffers) {
      await deleteOfferById(offer._id);
      console.log(`Removed expired offer: ${offer.offerName}`);
    }
    console.log("✅ Expired offers removed from Offer model.");
  } catch (error) {
    console.error("❌ Error removing expired offers:", error);
  }
};

module.exports = removeExpiredOffers;

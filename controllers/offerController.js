const catchAsync = require("../utilities/errorHandlings/catchAsync");
const Offer = require("../model/offerModel");
const AppError = require("../utilities/errorHandlings/appError");
const {uploadToCloudinary} = require("../utilities/cloudinaryUpload");
const Product = require("../model/productModel");
const mongoose = require("mongoose");
const Variant = require("../model/variantsModel");

const createOffer = catchAsync(async (req, res, next) => {
  const { bannerImage, ...offerData } = req.body;
  if (typeof offerData.products === "string") {
    try {
      offerData.products = JSON.parse(offerData.products);
    } catch (e) {
      offerData.products = [offerData.products]; // fallback: single id as string
    }
  }



  if (offerData.offerType === "brandCategory") {
    offerData.products = [];
  }
  if (offerData.offerType === "brand") {
    offerData.category = null;
    offerData.products = [];
  }
  if (offerData.offerType === "category") {
    offerData.brand = null;
    offerData.products = [];
  }
  if (offerData.offerType === "group") {
    offerData.brand = null;
    offerData.category = null;
  }

  if (req.files && req.files.length > 0) {
    const imageFile = req.files[0];
    const uploadedImage = await uploadToCloudinary(imageFile.buffer);
    offerData.bannerImage = uploadedImage;
  }

  const newOffer = await Offer.create(offerData);

  const user = req.user;
  const role = req.role;
  let matchQuery = {};

  if (role === "store") {
    matchQuery = { store: new mongoose.Types.ObjectId(user.id) };
  }

  // for category
  if (offerData.offerType === "category") {
    matchQuery = { category: new mongoose.Types.ObjectId(offerData.category) };
  }

  // for brand
  if (offerData.offerType === "brand") {
    matchQuery = { brand: new mongoose.Types.ObjectId(offerData.brand) };
  }

  // for group
  if (offerData.offerType === "group") {
    matchQuery = {
      _id: {
        $in: offerData.products.map((id) => new mongoose.Types.ObjectId(id)),
      },
    };
  }

  // for brandCategory
  if (offerData.offerType === "brandCategory") {
    matchQuery = {
      brand: new mongoose.Types.ObjectId(offerData.brand),
      category: new mongoose.Types.ObjectId(offerData.category),
    };
  }

  const aggregationPipeline = [{ $match: matchQuery }];

  const products = await Product.aggregate(aggregationPipeline);


  for (const product of products) {
    if (product.variants && product.variants.length > 0) {
      // Update all variants for this product
      await Variant.updateMany({ _id: { $in: product.variants } }, [
        {
          $set: {
            offerPrice: {
              $cond: [
                { $eq: [offerData.offerMetric, "percentage"] },
                {
                  $subtract: [
                    "$price",
                    {
                      $multiply: ["$price", Number(offerData.offerValue) / 100],
                    },
                  ],
                },
                { $subtract: ["$price", Number(offerData.offerValue)] },
              ],
            },
            offer: newOffer._id,
          },
        },
      ]);
      // Update product's offer reference
      await Product.updateOne(
        { _id: product._id },
        { $set: { offer: newOffer._id } }
      );
    } else {
      // No variants: update product directly
      await Product.updateOne(
        { _id: product._id },
        {
          $set: {
            offerPrice:
              offerData.offerMetric === "percentage"
                ? product.price -
                  (product.price * Number(offerData.offerValue)) / 100
                : product.price - Number(offerData.offerValue),
            offer: newOffer._id,
          },
        }
      );
    }
  }

  res.status(201).json({
    status: "success",
    data: { newOffer },
  });
});

const getAllOffers = catchAsync(async (req, res, next) => {
  const offers = await Offer.find().populate("category").populate("brand");
  res.status(200).json({
    status: "success",
    data: offers,
  });
});

const deleteOffer = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const offer = await Offer.findById(id);

  if (!offer) {
    return next(new AppError("Offer not found", 404));
  }

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

  res.status(200).json({
    status: "success",
    message: "Offer deleted successfully",
  });
});
module.exports = { createOffer, getAllOffers, deleteOffer };

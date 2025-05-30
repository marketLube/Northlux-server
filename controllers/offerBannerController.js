const OfferBanner = require("../model/offerBannerModel");
const uploadToCloudinary = require("../utilities/cloudinaryUpload");
const AppError = require("../utilities/errorHandlings/appError");
const catchAsync = require("../utilities/errorHandlings/catchAsync");
const path = require("path");
const fs = require("fs");


const createOfferBanner = catchAsync(async (req, res, next) => {
  const {  link, section } = req.body;

  const bannerData = {
    link,
    section: parseInt(section),
  };

  if (req.files && req.files.length > 0) {
    const imageFile = req.files[0];
    const uploadedImage = await uploadToCloudinary(imageFile.buffer);
    bannerData.image = uploadedImage;
  }

  const newBanner = await OfferBanner.create(bannerData);

  res.status(201).json({
    status: "success",
    data: newBanner,
  });
});

const getAllOfferBanners = catchAsync(async (req, res, next) => {
  const banners = await OfferBanner.aggregate([
    {
      $group: {
        _id: "$section",
        banners: { $push: "$$ROOT" }
      }
    },
    {
      $project: {
        _id: 0,
        section: "$_id",
        banners: 1
      }
    },
    {
      $sort: { section: 1 }
    }
  ]);


  res.status(200).json({
    status: "success",
    data: banners,
  });
});

const deleteOfferBanner = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const banner = await OfferBanner.findById(id);

  if (!banner) {
    return next(new AppError("Banner not found", 404));
  }

  if (banner.image) {
    const imagePath = path.join("public", banner.image);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  }

  await banner.deleteOne();

  res.status(200).json({
    status: "success",
    message: "Banner deleted successfully",
  });
});

const updateOfferBanner = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { link, image, section } = req.body;

  const banner = await OfferBanner.findById(id);
  if (!banner) {
    return next(new AppError("Banner not found", 404));
  }

  if (req.files && req.files.length > 0) {
    const imageFile = req.files[0];
    const uploadedImage = await uploadToCloudinary(imageFile.buffer);
    banner.image = uploadedImage;
  }

  banner.link = link || banner.link;
  banner.image = image || banner.image;
  banner.section = section || banner.section;
  await banner.save();

  res.status(200).json({
    status: "success",
    data: banner,
  });
});

module.exports = { createOfferBanner, getAllOfferBanners, deleteOfferBanner, updateOfferBanner };

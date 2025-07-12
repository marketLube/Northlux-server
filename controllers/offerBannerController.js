const OfferBanner = require("../model/offerBannerModel");
const {uploadToCloudinary} = require("../utilities/cloudinaryUpload");
const AppError = require("../utilities/errorHandlings/appError");
const catchAsync = require("../utilities/errorHandlings/catchAsync");
const path = require("path");
const fs = require("fs");


const createOfferBanner = catchAsync(async (req, res, next) => {
  const { link, section } = req.body;

  const bannerData = {
    link,
    section: parseInt(section),
  };

  if (!req.files || req.files.length < 2) {
    return next(new AppError("Both desktop and mobile images are required", 400));
  }

  // Process desktop image
  const desktopImage = req.files.find(file => file.fieldname === 'image');
  if (!desktopImage) {
    return next(new AppError("Desktop image is required", 400));
  }
  const uploadedDesktopImage = await uploadToCloudinary(desktopImage.buffer);
  bannerData.image = uploadedDesktopImage;

  // Process mobile image
  const mobileImage = req.files.find(file => file.fieldname === 'mobileImage');
  if (!mobileImage) {
    return next(new AppError("Mobile image is required", 400));
  }
  const uploadedMobileImage = await uploadToCloudinary(mobileImage.buffer);
  bannerData.mobileImage = uploadedMobileImage;

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
  const { link, section } = req.body;

  const bannerData = {
    link,
    section: parseInt(section),
  };

  if (req.files && req.files.length > 0) {
    // Process desktop image if provided
    const desktopImage = req.files.find(file => file.fieldname === 'image');
    if (desktopImage) {
      const uploadedDesktopImage = await uploadToCloudinary(desktopImage.buffer);
      bannerData.image = uploadedDesktopImage;
    }

    // Process mobile image if provided
    const mobileImage = req.files.find(file => file.fieldname === 'mobileImage');
    if (mobileImage) {
      const uploadedMobileImage = await uploadToCloudinary(mobileImage.buffer);
      bannerData.mobileImage = uploadedMobileImage;
    }
  }

  const updatedBanner = await OfferBanner.findByIdAndUpdate(
    id,
    bannerData,
    { new: true, runValidators: true }
  );

  if (!updatedBanner) {
    return next(new AppError("Banner not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: updatedBanner,
  });
});

module.exports = { createOfferBanner, getAllOfferBanners, deleteOfferBanner, updateOfferBanner };

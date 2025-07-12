const Brand = require("../model/brandModel");
const {uploadToCloudinary} = require("../utilities/cloudinaryUpload");
const AppError = require("../utilities/errorHandlings/appError");
const catchAsync = require("../utilities/errorHandlings/catchAsync");
// const { saveImage } = require("../utilities/imageUpload"); // Use the same helper from categories
const fs = require("fs");
const path = require("path");

// Create a new brand
const createBrand = catchAsync(async (req, res, next) => {
  const { name, description, isPriority } = req.body;

  if (!name) {
    return next(new AppError("Brand name is required", 400));
  }

  const brandData = { name, description, isPriority };

  if (req.files && req.files.length > 0) {
    // Handle main brand image
    const imageFile = req.files.find((file) => file.fieldname === "image");
    if (imageFile) {
      const uploadedImage = await uploadToCloudinary(imageFile.buffer);
      brandData.image = uploadedImage;
    }

    // Handle banner image
    const bannerFile = req.files.find(
      (file) => file.fieldname === "bannerImage"
    );
    if (bannerFile) {
      const uploadedBanner = await uploadToCloudinary(bannerFile.buffer);
      brandData.bannerImage = uploadedBanner;
    }

    const mobileBannerFile = req.files.find(
      (file) => file.fieldname === "mobileBannerImage"
    );
    if (mobileBannerFile) {
      const uploadedMobileBanner = await uploadToCloudinary(
        mobileBannerFile.buffer
      );
      brandData.mobileBannerImage = uploadedMobileBanner;
    }
  }

  const newBrand = await Brand.create(brandData);

  res.status(201).json({
    status: "success",
    data: {
      brand: newBrand,
    },
  });
});

// Get all brands
const getAllBrands = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 18, search } = req.query;


  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);

  let matchStage = { $match: {} };

  
  if (search) {
    matchStage = {
      $match: { name: { $regex: search, $options: "i" } },
    };
  }
  const sortStage = { $sort: { isPriority: -1 , createdAt: -1 } };

  const facetStage = {
    $facet: {
      brands: [
        { $skip: (pageNumber - 1) * limitNumber },
        { $limit: limitNumber },
      ],
      priorityBrandCount: [
        { $match: { isPriority: true } },
        { $count: "count" },
      ],
      totalCount: [{ $count: "count" }],
    },
  };

  const aggregation = await Brand.aggregate([
    matchStage,
    sortStage,
    facetStage,
  ]);

  const brands = aggregation[0].brands;
  const priorityBrandCount = aggregation[0].priorityBrandCount[0]?.count || 0;
  const totalCount = aggregation[0].totalCount[0]?.count || 0;
  const totalPages = Math.ceil(totalCount / limitNumber);
  

  res.status(200).json({
    status: "success",
    results: brands.length,
    totalPages,
    priorityBrandCount,
    currentPage: pageNumber,
    data: {
      brands,
      totalCount,
    },
  });
});

// Get a single brand by ID
const getBrandById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const brand = await Brand.findById(id);

  if (!brand) {
    return next(new AppError("Brand not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      brand,
    },
  });
});

// Update brand with image handling
const updateBrand = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { name, description, isPriority } = req.body;

  const brand = await Brand.findById(id);
  if (!brand) {
    return next(new AppError("Brand not found", 404));
  }

  if (req.files && req.files.length > 0) {
    // Handle main brand image
    const imageFile = req.files.find((file) => file.fieldname === "image");
    if (imageFile) {
      const uploadedImage = await uploadToCloudinary(imageFile.buffer);
      brand.image = uploadedImage;
    }

    // Handle banner image
    const bannerFile = req.files.find(
      (file) => file.fieldname === "bannerImage"
    );
    if (bannerFile) {
      const uploadedBanner = await uploadToCloudinary(bannerFile.buffer);
      brand.bannerImage = uploadedBanner;
    }

    const mobileBannerFile = req.files.find(
      (file) => file.fieldname === "mobileBannerImage"
    );
    if (mobileBannerFile) {
      const uploadedMobileBanner = await uploadToCloudinary(
        mobileBannerFile.buffer
      );
      brand.mobileBannerImage = uploadedMobileBanner;
    }
  }

  brand.name = name || brand.name;
  brand.description = description || brand.description;
  brand.isPriority = isPriority || brand.isPriority;
  await brand.save();

  res.status(200).json({
    status: "success",
    data: {
      brand: brand,
    },
  });
});

// Delete brand with image cleanup
const deleteBrand = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const brand = await Brand.findById(id);
  if (!brand) {
    return next(new AppError("Brand not found", 404));
  }

  // Delete associated image if exists
  if (brand.image) {
    const imagePath = path.join("public", brand.image);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  }

  await brand.deleteOne();

  res.status(200).json({
    status: "success",
    message: "Brand deleted successfully",
  });
});

const searchBrand = catchAsync(async (req, res, next) => {
  const { q } = req.query;
  const brands = await Brand.find({ name: { $regex: q, $options: "i" } });
  res.status(200).json({ brands });
});

module.exports = {
  createBrand,
  getAllBrands,
  getBrandById,
  updateBrand,
  deleteBrand,
  searchBrand,
};

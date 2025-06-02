const { default: mongoose } = require("mongoose");
const catchAsync = require("../utilities/errorHandlings/catchAsync");
const Product = require("../model/productModel");

const getInventory = catchAsync(async (req, res) => {
  let {
    storeId,
    brandId,
    categoryId,
    search,
    page = 1,
    limit = 10,
  } = req.query;

  const role = req.role;

  if (role === "store") {
    storeId = req.user;
  }

  const matchConditions = {
    isDeleted: false,
  };

  if (storeId && storeId !== "All Stores")
    matchConditions.store = new mongoose.Types.ObjectId(storeId);
  if (brandId && brandId !== "All Brands")
    matchConditions.brand = new mongoose.Types.ObjectId(brandId);
  if (categoryId && categoryId !== "All Categories")
    matchConditions.category = new mongoose.Types.ObjectId(categoryId);

  if (search) {
    matchConditions.$or = [
      { name: new RegExp(search, "i") },
      { sku: new RegExp(search, "i") },
      { "variantDetails.sku": new RegExp(search, "i") }
    ];
  }

  const totalCount = await Product.countDocuments(matchConditions);

  const productsWithVariants = await Product.aggregate([
    {
      $lookup: {
        from: "variants",
        localField: "variants",
        foreignField: "_id",
        as: "variantDetails",
      },
    },
    {
      $match: matchConditions,
    },
 
    {
      $lookup: {
        from: "brands",
        localField: "brand",
        foreignField: "_id",
        as: "brandDetails",
      },
    },
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "categoryDetails",
      },
    },
    {
      $lookup: {
        from: "stores",
        localField: "store",
        foreignField: "_id",
        as: "storeDetails",
      },
    },
    {
      $skip: (Number(page) - 1) * Number(limit),
    },
    {
      $limit: Number(limit),
    },
  ]);

  const processedProducts = [];

  for (const product of productsWithVariants) {
    // If product has variants, add each variant as a separate product
    if (product.variantDetails && product.variantDetails.length > 0) {
      for (const variant of product.variantDetails) {
        processedProducts.push({
          _id: variant._id,
          name: `${product.name} - ${variant.attributes?.title || "Variant"}`,
          sku: variant.sku,
          price: variant.price,
          offerPrice: variant.offerPrice,
          stock: variant.stock,
          stockStatus: variant.stockStatus,
          images: variant.images,
          brand: product.brandDetails[0] || null,
          category: product.categoryDetails[0] || null,
          isVariant: true,
          store: product.storeDetails[0] || null,
          grossPrice: variant.grossPrice,
          parentProduct: {
            _id: product._id,
            name: product.name,
          },
        });
      }
    } else {
      // For products without variants, use the product's direct properties

      processedProducts.push({
        _id: product._id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        offerPrice: product.offerPrice,
        stock: product.stock,
        stockStatus: product.stockStatus,
        images: product.images,
        brand: product.brandDetails[0] || null,
        category: product.categoryDetails[0] || null,
        isVariant: false,
        store: product.storeDetails[0] || null,
        grossPrice: product.grossPrice,
      });
    }
  }

  res.status(200).json({
    success: true,
    message: "Inventory fetched successfully",
    data: processedProducts,
    pagination: {
      currentPage: Number(page),
      totalPages: Math.ceil(totalCount / Number(limit)),
      totalCount,
      limit: Number(limit),
    },
  });
});

module.exports = { getInventory };

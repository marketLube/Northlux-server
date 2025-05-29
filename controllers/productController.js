const { groupProductsByLabel } = require("../helpers/aggregation/aggregations");
const {
  updateOne,
  deleteOne,
} = require("../helpers/handlerFactory/handlerFactory");
const Product = require("../model/productModel");
const productModel = require("../model/productModel");
const Variant = require("../model/variantsModel");
const uploadToCloudinary = require("../utilities/cloudinaryUpload");
const AppError = require("../utilities/errorHandlings/appError");
const catchAsync = require("../utilities/errorHandlings/catchAsync");
const mongoose = require("mongoose");
const formatProductResponse = require("../helpers/product/formatProducts");
const categoryModel = require("../model/categoryModel");

const addProduct = catchAsync(async (req, res, next) => {
  const {
    name,
    brand,
    category,
    subcategory,
    description,
    variants: variantsArray,
    sku,
    price,
    offerPrice,
    stock,
    label,
    units,
    stockStatus,
    store,
    grossPrice,
    priority,
    activeStatus,
  } = req.body;



  const queryConditions = [];

  if (sku !== undefined) {
    queryConditions.push({ sku });
  }

  if (name !== undefined) {
    queryConditions.push({ name });
  }

  const productExists = await Product.findOne({
    $or: queryConditions,
  });

  if (productExists) {
    return next(new AppError("Product already exists", 400));
  }

  if (variantsArray && variantsArray.length > 0) {
    try {
      await Promise.all(
        variantsArray.map(async (variant) => {
          const skuExists =
            (await Variant.findOne({
              $or: [
                { sku: variant.sku },
                { "attributes.title": variant.attributes.title },
              ],
            })) ||
            (await Product.findOne({
              $or: [{ sku: variant.sku }],
            }));
          if (skuExists) {
            if (skuExists.sku === variant.sku) {
              return Promise.reject(
                `${variant?.attributes?.title}'s SKU ${variant.sku} already exists`
              );
            } else {
              return Promise.reject(`Variant Title already exists`);
            }
          }
        })
      );
    } catch (err) {
      return next(new AppError(err, 400));
    }
  }

  const createdBy = req.user;
  const productImages = [];
  const variantImagesMap = {};

  // Process uploaded files
  for (const file of req.files) {
    const { fieldname } = file;

    if (fieldname.startsWith("productImages")) {
      const imageIndex = parseInt(fieldname.match(/\[(\d+)\]/)[1]);
      const imageUrl = await uploadToCloudinary(file.buffer);

      productImages[imageIndex] = imageUrl;
    } else if (fieldname.startsWith("variants")) {
      const match = fieldname.match(/variants\[(\d+)\]\[images\]\[(\d+)\]/);
      if (match) {
        const variantIndex = match[1];
        const imageIndex = parseInt(match[2]);

        if (!variantImagesMap[variantIndex]) {
          variantImagesMap[variantIndex] = [];
        }
        const imageUrl = await uploadToCloudinary(file.buffer);
        variantImagesMap[variantIndex][imageIndex] = imageUrl;
      }
    }
  }

  // Clean up variant images
  Object.keys(variantImagesMap).forEach((variantIndex) => {
    variantImagesMap[variantIndex] = variantImagesMap[variantIndex].filter(
      (img) => img
    );
  });

  // Prepare product data
  const productData = {
    name,
    brand,
    category,
    subcategory,
    description,
    images: productImages,
    createdBy,
    label,
    units,
    stockStatus,
    store,
    grossPrice,
    priority,
    activeStatus,
  };

  if (variantsArray && variantsArray.length > 0) {
    // Add variant stock validation
    for (const variant of variantsArray) {
      if (variant.stockStatus === "outofstock" && variant.stock > 0) {
        return next(
          new AppError(
            "Variant stock status cannot be out of stock when stock quantity is greater than 0",
            400
          )
        );
      }
    }

    // Parse the variants from strings to objects
    const parsedVariants = variantsArray;

    // Create variants with proper data structure
    const variantIds = await Promise.all(
      parsedVariants.map(async (variant, index) => {
        const variantData = {
          sku: variant.sku,
          price: variant.price,
          offerPrice: variant.offerPrice,
          stock: variant.stock,
          stockStatus: variant.stockStatus,
          attributes: variant.attributes,
          product: null, // Will be updated after product creation
          images: variantImagesMap[index] || [],
        };

        const newVariant = new Variant(variantData);
        await newVariant.save();
        return newVariant._id;
      })
    );
    productData.variants = variantIds;
  } else {
    // Handle products without variants
    productData.sku = sku;
    productData.price = price;
    productData.offerPrice = offerPrice;
    productData.stock = stock;
  }

  // Create and save the product
  const newProduct = new Product(productData);
  await newProduct.save();

  // Update variants with the product reference
  if (newProduct.variants && newProduct.variants.length > 0) {
    await Variant.updateMany(
      { _id: { $in: newProduct.variants } },
      { $set: { product: newProduct._id } }
    );
  }

  res.status(201).json({
    message: "Product added successfully",
    product: newProduct,
  });
});

const listProducts = catchAsync(async (req, res, next) => {
  let {
    page,
    limit,
    categoryId,
    subcategoryId,
    minPrice,
    maxPrice,
    sort,
    search,
    labelId,
    brandId,
    role,
    store,
    brand,
    category,
    offerId,
    activeStatus,
  } = req.query;


  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;
  const skip = (page - 1) * limit;

  const Role = req.role;

  // Build base filter object
  const filter = {
    isDeleted: { $ne: true },
  };

  if (!Role) {
    filter.activeStatus = true;
  }

  if (offerId) {
    filter.offer = new mongoose.Types.ObjectId(offerId);
  }

  if (req.role === "store") {
    filter.store = new mongoose.Types.ObjectId(req.user);
  }

  if (store && store !== "All Stores") {
    filter.store = new mongoose.Types.ObjectId(store);
  }

  if (brand && brand !== "All Brands") {
    filter.brand = new mongoose.Types.ObjectId(brand);
  }

  if (category && category !== "All Categories") {
    filter.category = new mongoose.Types.ObjectId(category);
  }

  if (categoryId && categoryId !== "All Categories") {
    filter.category = new mongoose.Types.ObjectId(categoryId);
    const subcategories = await categoryModel.find({
      parent: new mongoose.Types.ObjectId(categoryId),
    });
    if (subcategories.length > 0) {
      filter.category = {
        $in: [
          new mongoose.Types.ObjectId(categoryId),
          ...subcategories.map((subcategory) => subcategory._id)
        ]
      };
    } else {
      filter.category = new mongoose.Types.ObjectId(categoryId);
    }
  }

  if (subcategoryId) {
    filter.subcategory = new mongoose.Types.ObjectId(subcategoryId);
  }

  if (brandId) {
    filter.brand = new mongoose.Types.ObjectId(brandId);
  }

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { sku: { $regex: search, $options: "i" } },
    ];
  }

  if (labelId) {
    filter.label = {
      $in: labelId.split(",").map((id) => new mongoose.Types.ObjectId(id)),
    };
  }
  if (activeStatus && activeStatus !== "all") {
    filter.activeStatus = activeStatus === "active" ? true : false;
  }


  // Use aggregation pipeline for proper price handling
  const aggregationPipeline = [
    {
      $lookup: {
        from: "variants",
        localField: "variants",
        foreignField: "_id",
        as: "variantsData",
      },
    },
    {
      $addFields: {
        effectivePrice: {
          $cond: {
            if: { $eq: [sort, "price-high"] },
            then: {
              $cond: {
                if: { $gt: [{ $size: "$variantsData" }, 0] },
                then: { $max: "$variantsData.offerPrice" },
                else: "$offerPrice",
              },
            },
            else: {
              $cond: {
                if: { $gt: [{ $size: "$variantsData" }, 0] },
                then: { $min: "$variantsData.offerPrice" },
                else: "$offerPrice",
              },
            },
          },
        },
        sortedVariants: {
          $cond: {
            if: { $gt: [{ $size: "$variantsData" }, 0] },
            then: {
              $cond: {
                if: { $eq: [sort, "price-high"] },
                then: {
                  $sortArray: {
                    input: "$variantsData",
                    sortBy: { offerPrice: -1 },
                  },
                },
                else: {
                  $sortArray: {
                    input: "$variantsData",
                    sortBy: { offerPrice: 1 },
                  },
                },
              },
            },
            else: [],
          },
        },
      },
    },
    {
      $addFields: {
        // Select the first variant after sorting
        selectedVariant: {
          $cond: {
            if: { $gt: [{ $size: "$sortedVariants" }, 0] },
            then: { $first: "$sortedVariants" },
            else: null,
          },
        },
      },
    },
    {
      $match: {
        ...filter,
        ...(minPrice || maxPrice
          ? {
              effectivePrice: {
                ...(minPrice && { $gte: parseInt(minPrice) }),
                ...(maxPrice && { $lte: parseInt(maxPrice) }),
              },
            }
          : {}),
      },
    },
    {
      $lookup: {
        from: "brands",
        localField: "brand",
        foreignField: "_id",
        as: "brand",
      },
    },
    {
      $lookup: {
        from: "labels",
        localField: "label",
        foreignField: "_id",
        as: "label",
      },
    },
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "category",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "createdBy",
        foreignField: "_id",
        as: "createdBy",
      },
    },
    { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$label", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$createdBy", preserveNullAndEmptyArrays: true } },
    {
      $sort:
        sort == "price-low"
          ? { effectivePrice: 1 }
          : sort == "price-high"
          ? { effectivePrice: -1 }
          : { priority: -1, updatedAt: -1 },
    },
    { $skip: skip },
    { $limit: limit },
    {
      $project: {
        _id: 1,
        name: 1,
        brand: 1,
        category: 1,
        description: 1,
        store: 1,
        sku: 1,
        price: 1,
        offerPrice: 1,
        stock: 1,
        size: 1,
        images: 1,
        createdBy: 1,
        label: 1,
        averageRating: 1,
        totalRatings: 1,
        isDeleted: 1,
        stockStatus: 1,
        grossPrice: 1,
        offer: 1,
        priority: 1,
        createdAt: 1,
        updatedAt: 1,
        effectivePrice: 1,
        activeStatus: 1,
        // Include only the selected variant instead of all variants
        variantsData: {
          $cond: {
            if: { $gt: [{ $size: "$sortedVariants" }, 0] },
            then: ["$selectedVariant"],
            else: [],
          },
        },
      },
    },
  ];

  const countPipeline = [
    {
      $lookup: {
        from: "variants",
        localField: "variants",
        foreignField: "_id",
        as: "variantsData",
      },
    },
    {
      $addFields: {
        effectivePrice: {
          $cond: {
            if: { $gt: [{ $size: "$variantsData" }, 0] },
            then: { $min: "$variantsData.price" },
            else: "$price",
          },
        },
      },
    },
    {
      $match: {
        ...filter,
        ...(minPrice || maxPrice
          ? {
              effectivePrice: {
                ...(minPrice && { $gte: parseInt(minPrice) }),
                ...(maxPrice && { $lte: parseInt(maxPrice) }),
              },
            }
          : {}),
      },
    },
    { $count: "total" },
  ];

  const [products, countResult] = await Promise.all([
    Product.aggregate(aggregationPipeline),
    Product.aggregate(countPipeline),
  ]);

  // Use the count from countResult instead of products.length
  const totalProducts = countResult[0]?.total || 0;
  const formattedProducts = products.map((product) => {
    const formatted = formatProductResponse(product);
    // Add variants data separately
    formatted.variants = product.variantsData || [];
    return formatted;
  });

  res.status(200).json({
    success: true,
    data: {
      products: formattedProducts,
      totalProducts,
      totalPages: Math.ceil(totalProducts / limit),
      currentPage: page,
      filters: {
        categoryId,
        subcategoryId,
        minPrice,
        maxPrice,
        sort,
      },
    },
  });
});

const getProductDetails = catchAsync(async (req, res, next) => {
  const { productId } = req.params;

  // Get product details with populated fields
  const productDetails = await Product.findById(productId)
    .populate("category")
    .populate("createdBy", "username email role")
    .populate("variants")
    .populate("brand")
    .populate("label");

  if (!productDetails) {
    return next(new AppError("Product not found", 404));
  }

  // Get rating distribution

  // Get all ratings with user details

  const updated = productDetails.toObject();
  res.status(200).json(updated);
});

const updateProduct = catchAsync(async (req, res, next) => {
  const { productId } = req.query;
  const updateData = req.body;

  if (updateData.variants) {
    try {
      await Promise.all(
        updateData.variants.map(async (variant) => {
          const queryConditions = [
            { sku: variant.sku },
            { "attributes.title": variant.attributes.title },
          ];

          // Exclude the current variant from the check
          const skuExists = await Variant.findOne({
            $or: queryConditions,
            _id: { $ne: variant._id }, // Exclude the current variant
          });

          const productSkuExists = await Product.findOne({
            sku: variant.sku,
            _id: { $ne: productId }, // Exclude the current variant
          });

          if (skuExists || productSkuExists) {
            if (
              skuExists?.sku === variant.sku ||
              productSkuExists?.sku === variant.sku
            ) {
              return Promise.reject(
                `${variant?.attributes?.title}'s SKU ${variant.sku} already exists`
              );
            } else {
              return Promise.reject(`Variant Title already exists`);
            }
          }
        })
      );
    } catch (err) {
      return next(new AppError(err, 400));
    }
  }



  // Add stock validation for variants
  // if (updateData.variants) {
  //   for (const variant of updateData.variants) {
  //     if (variant.stockStatus === "outofstock" && variant.stock > 0) {
  //       return next(
  //         new AppError(
  //           "Variant stock status cannot be out of stock when stock quantity is greater than 0",
  //           400
  //         )
  //       );
  //     }
  //   }
  // }

  const product = await Product.findById(productId).populate("variants");

  if (!product) {
    return next(new AppError("Product not found", 404));
  }

  const variantImagesMap = {};
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const { fieldname } = file;

      if (fieldname.startsWith("productImages")) {
        const imageIndex = parseInt(fieldname.match(/\[(\d+)\]/)[1]);
        const imageUrl = await uploadToCloudinary(file.buffer);
        if (!updateData.images) updateData.images = [...product.images];
        updateData.images[imageIndex] = imageUrl;
      } else if (fieldname.startsWith("variants")) {
        const match = fieldname.match(/variants\[(\d+)\]\[images\]\[(\d+)\]/);
        if (match) {
          const variantIndex = match[1];
          const imageIndex = parseInt(match[2]);

          if (!variantImagesMap[variantIndex]) {
            // Initialize with existing images if it's an existing variant
            const existingVariant = product.variants[variantIndex];
            variantImagesMap[variantIndex] = existingVariant
              ? [...existingVariant.images]
              : [];
          }
          const imageUrl = await uploadToCloudinary(file.buffer);
          variantImagesMap[variantIndex][imageIndex] = imageUrl;
        }
      }
    }
  }

  let variantIds = [];
  let newVariants = [];
  if (updateData.variants) {
    // Use Promise.all to handle async operations properly
    await Promise.all(
      updateData.variants.map(async (variant, index) => {
        if (variant._id) {
          variantIds.push(variant._id);
          const variantId = variant._id;
          delete variant._id;

          // Update existing variant with new images if any
          if (variantImagesMap[index]) {
            variant.images = variantImagesMap[index].filter((img) => img);
          }

          await Variant.findByIdAndUpdate(variantId, variant, {
            new: true,
            runValidators: true,
          });
        } else {
          // For new variants
          variant.product = productId;
          // Add images from variantImagesMap if any
          if (variantImagesMap[index]) {
            variant.images = variantImagesMap[index].filter((img) => img);
          }
          newVariants.push(variant);
        }
      })
    );
  }

  // Create new variants
  const newVariantIds = await Promise.all(
    newVariants.map(async (variant) => {
      const newVariant = new Variant(variant);
      await newVariant.save();
      return newVariant._id;
    })
  );

  const updatedProduct = await Product.findByIdAndUpdate(
    productId,
    {
      ...updateData,
      variants: [...variantIds, ...newVariantIds],
    },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    message: "Product updated successfully",
    product: updatedProduct,
  });
});

const deleteProduct = catchAsync(async (req, res, next) => {
  const { productId, variantId } = req.query;

  if (variantId) {
    const variant = await Variant.findOneAndDelete({
      _id: variantId,
      product: productId,
    });

    if (!variant) {
      return next(
        new AppError(
          "Variant not found or does not belong to the specified product",
          404
        )
      );
    }
    await productModel.findByIdAndUpdate(productId, {
      $pull: { variants: variantId },
    });
    res.status(200).json({
      message: "Variant deleted successfully",
    });
  } else {
    const product = await Product.findByIdAndDelete(productId);

    if (!product) {
      return next(new AppError("Product not found", 404));
    }

    await Variant.deleteMany({ product: productId });

    res.status(200).json({
      message: "Product and its variants deleted successfully",
    });
  }
});

const getProductsByLabel = catchAsync(async (req, res, next) => {
  const { labelId } = req.params;
  const products = await productModel
    .find({ label: labelId })
    .populate("label");

  res.status(200).json(products);
});

const getGroupedProductsByLabel = catchAsync(async (req, res, next) => {
  const result = await groupProductsByLabel();
  res.status(200).json(result);
});

const searchProducts = catchAsync(async (req, res, next) => {
  let { keyword, page, limit } = req.query;

  page = parseInt(page) || 1;
  limit = parseInt(limit) || 100;
  const skip = (page - 1) * limit;

  const Role = req.role;

  const filter = {
    isDeleted: { $ne: true },
  };

  if (!Role) {
    filter.activeStatus = true;
  }

  if (Role === "store") {
    filter.store = new mongoose.Types.ObjectId(req.user);
  }

  // Create aggregation pipeline for better search
  const aggregationPipeline = [
    {
      $lookup: {
        from: "variants",
        localField: "variants",
        foreignField: "_id",
        as: "variantsData",
      },
    },
    {
      $match: {
        ...filter,
        $or: [
          { name: { $regex: keyword, $options: "i" } },
          // { description: { $regex: keyword, $options: "i" } },
          { "variantsData.sku": { $regex: keyword, $options: "i" } },
        ],
      },
    },
    {
      $lookup: {
        from: "brands",
        localField: "brand",
        foreignField: "_id",
        as: "brand",
      },
    },
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "category",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "createdBy",
        foreignField: "_id",
        as: "createdBy",
      },
    },
    { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$createdBy", preserveNullAndEmptyArrays: true } },
    { $skip: skip },
    { $limit: limit },
  ];

  const countPipeline = [
    {
      $lookup: {
        from: "variants",
        localField: "variants",
        foreignField: "_id",
        as: "variantsData",
      },
    },
    {
      $match: keyword
        ? {
            $or: [
              { name: { $regex: keyword, $options: "i" } },
              // { description: { $regex: keyword, $options: "i" } },
              { "variantsData.sku": { $regex: keyword, $options: "i" } },
            ],
          }
        : {},
    },
    { $count: "total" },
  ];

  const [products, countResult] = await Promise.all([
    Product.aggregate(aggregationPipeline),
    Product.aggregate(countPipeline),
  ]);

  const totalProducts = countResult[0]?.total || 0;
  const formattedProducts = products.map((product) => {
    const formatted = formatProductResponse(product);
    // Add variants data separately
    formatted.variants = product.variantsData || [];
    return formatted;
  });

  res.status(200).json({
    success: true,
    data: {
      products: formattedProducts,
      totalProducts,
      totalPages: Math.ceil(totalProducts / limit),
      currentPage: page,
    },
  });
});

const softDeleteProduct = catchAsync(async (req, res, next) => {
  const { productId } = req.query;

  const product = await Product.findById(productId);

  if (!product) {
    return next(new AppError("Product not found", 404));
  }

  // Update the product status to indicate it's deleted
  await Product.findByIdAndUpdate(productId, {
    isDeleted: true,
    deletedAt: new Date(),
  });

  res.status(200).json({
    status: "success",
    message: "Product has been soft deleted",
  });
});

module.exports = {
  addProduct,
  listProducts,
  getProductDetails,
  updateProduct,
  deleteProduct,
  getProductsByLabel,
  getGroupedProductsByLabel,
  searchProducts,
  softDeleteProduct,
};

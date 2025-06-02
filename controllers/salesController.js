const Product = require("../model/productModel");
const Variant = require("../model/variantsModel");
const Order = require("../model/orderModel");
const catchAsync = require("../utilities/errorHandlings/catchAsync");
const { default: mongoose } = require("mongoose");

const salesReport = catchAsync(async (req, res, next) => {
  let {
    startDate,
    endDate,
    storeId,
    brandId,
    page = 1,
    limit = 10,
    search,
  } = req.query;

  if (req.role === "store") {
    storeId = req.user;
  }

  // Build match conditions for date range and store
  const matchConditions = {
    isDeleted: false,
  };
  if (startDate && endDate) {
    matchConditions.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  if (storeId && storeId !== "All Stores") {
    matchConditions.store = new mongoose.Types.ObjectId(storeId);
  }

  if (brandId && brandId !== "All Brands") {
    matchConditions.brand = new mongoose.Types.ObjectId(brandId);
  }

  // Handle search query
  if (search) {
    matchConditions.$or = [
      { name: new RegExp(search, "i") },
      { sku: new RegExp(search, "i") },
    ];
  }

  // Get total count first
  const totalCount = await Product.countDocuments(matchConditions);

  // Then get paginated products with their variants
  const productsWithVariants = await Product.aggregate([
    {
      $match: matchConditions,
    },
    {
      $lookup: {
        from: "variants",
        localField: "variants",
        foreignField: "_id",
        as: "variantDetails",
      },
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
      $lookup: {
        from: "orders",
        let: { productId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$product", "$$productId"] },
                  { $eq: ["$status", "delivered"] },
                  ...(matchConditions.createdAt ? [
                    { $gte: ["$createdAt", new Date(startDate)] },
                    { $lte: ["$createdAt", new Date(endDate)] }
                  ] : []),
                  ...(storeId && storeId !== "All Stores" ? [
                    { $eq: ["$store", new mongoose.Types.ObjectId(storeId)] }
                  ] : [])
                ]
              }
            }
          }
        ],
        as: "orders"
      }
    },
    {
      $addFields: {
        totalQuantity: {
          $sum: "$orders.quantity"
        }
      }
    },
    {
      $sort: { totalQuantity: -1 }
    },
    {
      $skip: (Number(page) - 1) * Number(limit),
    },
    {
      $limit: Number(limit),
    },
  ]);

  // Process the results to create a flat list of products and variants
  const processedProducts = [];

  for (const product of productsWithVariants) {
    // If product has variants, add each variant as a separate product
    if (product.variantDetails && product.variantDetails.length > 0) {
      for (const variant of product.variantDetails) {
        // Find orders for this variant
        const variantOrders = await Order.find({
          variant: variant._id,
          status: "delivered",
          ...(matchConditions.createdAt
            ? { createdAt: matchConditions.createdAt }
            : {}),
          ...(storeId && storeId !== "All Stores" ? { store: storeId } : {}),
        });

        const totalQuantity = variantOrders.reduce(
          (sum, order) => sum + order.quantity,
          0
        );
        const totalRevenue = variantOrders.reduce(
          (sum, order) => sum + order.totalAmount,
          0
        );

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
          salesMetrics: {
            totalOrders: variantOrders.length,
            totalQuantity,
            totalRevenue,
            averageOrderValue:
              variantOrders.length > 0
                ? totalRevenue / variantOrders.length
                : 0,
          },
        });
      }
    } else {
      // For products without variants, use the product's direct properties
      const productOrders = await Order.find({
        product: product._id,
        status: "delivered",
        ...(matchConditions.createdAt
          ? { createdAt: matchConditions.createdAt }
          : {}),
        ...(storeId && storeId !== "All Stores" ? { store: storeId } : {}),
      });

      const totalQuantity = productOrders.reduce(
        (sum, order) => sum + order.quantity,
        0
      );
      const totalRevenue = productOrders.reduce(
        (sum, order) => sum + order.totalAmount,
        0
      );

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
        salesMetrics: {
          totalOrders: productOrders.length,
          totalQuantity,
          totalRevenue,
          averageOrderValue:
            productOrders.length > 0 ? totalRevenue / productOrders.length : 0,
        },
      });
    }
  }

  // Calculate summary metrics
  const summaryMetrics = processedProducts.reduce(
    (summary, product) => {
      summary.totalProducts += 1;
      summary.totalRevenue += product.salesMetrics.totalRevenue;
      summary.totalOrders += product.salesMetrics.totalOrders;
      summary.totalQuantity += product.salesMetrics.totalQuantity;
      return summary;
    },
    {
      totalProducts: 0,
      totalRevenue: 0,
      totalOrders: 0,
      totalQuantity: 0,
    }
  );

  // Add average metrics
  summaryMetrics.averageOrderValue =
    summaryMetrics.totalOrders > 0
      ? summaryMetrics.totalRevenue / summaryMetrics.totalOrders
      : 0;

  summaryMetrics.averageProductValue =
    summaryMetrics.totalProducts > 0
      ? summaryMetrics.totalRevenue / summaryMetrics.totalProducts
      : 0;

  res.status(200).json({
    success: true,
    message: "Sales report fetched successfully",
    data: {
      products: processedProducts,
      summary: summaryMetrics,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalCount / Number(limit)),
        totalCount,
        limit: Number(limit),
      },
      filters: {
        startDate: startDate || null,
        endDate: endDate || null,
        storeId: storeId || null,
        brandId: brandId || null,
      },
    },
  });
});

module.exports = {
  salesReport,
};

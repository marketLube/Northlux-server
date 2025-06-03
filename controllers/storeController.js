const storeModel = require("../model/storeModel");
const productModel = require("../model/productModel");
const createToken = require("../utilities/createToken");
const AppError = require("../utilities/errorHandlings/appError");
const catchAsync = require("../utilities/errorHandlings/catchAsync");
const mongoose = require("mongoose");
const formatProductResponse = require("../helpers/product/formatProducts");
const Order = require("../model/orderModel");

const createStore = catchAsync(async (req, res, next) => {
  const { store_name, email, address, store_number, login_number, password, activeStatus } =
    req.body;

  if (
    !store_name ||
    !email ||
    !password ||
    !address ||
    !store_number ||
    !login_number ||
    !activeStatus
  ) {
    return next(new AppError("All fields are required", 400));
  }

  const store = new storeModel({
    store_name,
    email,
    password,
    address,
    store_number,
    login_number,
    activeStatus,
  });

  const newStore = await store.save();

  res.status(201).json({
    success: true,
    message: "Store created successfully",
    store: newStore,
  });
});

const loginStore = catchAsync(async (req, res, next) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return next(new AppError("All fields are required", 400));
  }

  const store = await storeModel.findOne({
    login_number: phone,
    password,
  });

  if (!store) {
    return next(new AppError("Invalid phone or password", 401));
  }

  if (!store.activeStatus) {
    return next(new AppError("Store is not active", 401));
  }

  //   const isPasswordCorrect = await store.comparePassword(password);

  // if (!isPasswordCorrect) {
  //   return next(new AppError("Invalid phone or password", 401));
  // }

  const token = createToken(store._id, "store");

  const sotreDate = store.toObject();
  delete sotreDate.password;

  res.status(200).json({
    success: true,
    message: "Store logged in successfully",
    store: sotreDate,
    token,
  });
});

const getAllStores = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10, search = "" } = req.query;

  let match = {};

  if (search) {
    match = {
      $or: [
        { store_name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        {
          $expr: {
            $regexMatch: {
              input: { $toString: "$store_number" },
              regex: search,
              options: "i",
            },
          },
        },
      ],
    };
  }

  const stores = await storeModel.aggregate([
    {
      $match: match,
    },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "store",
        as: "products",
      },
    },
    {
      $addFields: {
        totalProducts: {
          $size: {
            $filter: {
              input: "$products",
              as: "product",
              cond: { $ne: ["$$product.isDeleted", true] }
            }
          }
        }
      }
    },
    {
      $lookup: {
        from: "orders",
        localField: "_id",
        foreignField: "store",
        pipeline: [
          {
            $match: {
              status: "delivered",
            },
          },
          {
            $lookup: {
              from: "variants",
              localField: "variant",
              foreignField: "_id",
              as: "variantDetails",
            },
          },
          {
            $lookup: {
              from: "products",
              localField: "product",
              foreignField: "_id",
              as: "productDetails",
            },
          },
        ],
        as: "orders",
      },
    },
    {
      $addFields: {
        totalDeliveredOrders: { $size: "$orders" },
        totalRevenue: {
          $reduce: {
            input: "$orders",
            initialValue: 0,
            in: { $add: ["$$value", "$$this.totalAmount"] },
          },
        },
        totalProfit: {
          $reduce: {
            input: "$orders",
            initialValue: 0,
            in: {
              $add: [
                "$$value",
                {
                  $subtract: [
                    "$$this.totalAmount",
                    {
                      $multiply: [
                        "$$this.quantity",
                        {
                          $cond: {
                            if: {
                              $gt: [{ $size: "$$this.variantDetails" }, 0],
                            },
                            then: {
                              $arrayElemAt: [
                                "$$this.variantDetails.grossPrice",
                                0,
                              ],
                            },
                            else: {
                              $arrayElemAt: [
                                "$$this.productDetails.grossPrice",
                                0,
                              ],
                            },
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          },
        },
      },
    },
    {
      $addFields: {
        profitPercentage: {
          $cond: {
            if: { $eq: ["$totalRevenue", 0] },
            then: 0,
            else: {
              $multiply: [{ $divide: ["$totalProfit", "$totalRevenue"] }, 100],
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        store_name: 1,
        store_number: 1,
        email: 1,
        address: 1,
        login_number: 1,
        totalProducts: 1,
        totalDeliveredOrders: 1,
        totalRevenue: 1,
        totalProfit: 1,
        profitPercentage: { $round: ["$profitPercentage", 2] },
        createdAt: 1,
        updatedAt: 1,
        password: 1,
        activeStatus: 1,
      },
    },
    {
      $skip: (page - 1) * limit,
    },
    {
      $limit: limit,
    },
  ]);

  // Get total count for pagination
  const totalStores = await storeModel.countDocuments(match);

  res.status(200).json({
    message: "Stores fetched successfully",
    stores,
    pagination: {
      currentPage: Number(page),
      totalPages: Math.ceil(totalStores / limit),
      totalStores,
      limit: Number(limit),
    },
  });
});

const editStore = catchAsync(async (req, res, next) => {
  const { store_name, email, address, store_number, login_number, password, activeStatus } =
    req.body;
  if (!store_name || !email || !address || !store_number || !login_number || activeStatus === undefined || !password) {
    return next(new AppError("All fields are required", 400));
  }
  const { id } = req.params;

  const store = await storeModel.findByIdAndUpdate(id, req.body, {
    new: true,
  });

  res.status(200).json({
    success: true,
    message: "Store updated successfully",
    store,
  });
});

// const getStoreById = catchAsync(async (req, res, next) => {
//   const { id } = req.params;
//   const store = await storeModel.findById(id);
//   res.status(200).json({
//     success: true,
//     message: "Store fetched successfully",
//     store,
//   });
// });

const getStoreAndProducts = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { page = 1, limit = 10, search = "" } = req.query;

  if (!id) {
    return next(new AppError("Store ID is required", 400));
  }

  // Convert string values to numbers
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Build search condition for products
  const searchCondition = search
    ? {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { sku: { $regex: search, $options: "i" } },
        ],
      }
    : {};

  // --- Card Stats Aggregation ---
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  // 1. Total delivered orders (all time)
  const totalSales = await Order.countDocuments({
    store: id,
    status: "delivered",
  });

  // 2. Monthly revenue and profit
  const monthlyOrders = await Order.aggregate([
    {
      $match: {
        store: new mongoose.Types.ObjectId(id),
        status: "delivered",
        createdAt: { $gte: firstDayOfMonth, $lte: lastDayOfMonth },
      },
    },
    {
      $lookup: {
        from: "variants",
        localField: "variant",
        foreignField: "_id",
        as: "variantDetails",
      },
    },
    {
      $lookup: {
        from: "products",
        localField: "product",
        foreignField: "_id",
        as: "productDetails",
      },
    },
    
    {
      $project: {
        totalAmount: 1,
        quantity: 1,
        grossPrice: {
          $cond: {
            if: { $gt: [{ $size: "$variantDetails" }, 0] },
            then: { $arrayElemAt: ["$variantDetails.grossPrice", 0] },
            else: { $arrayElemAt: ["$productDetails.grossPrice", 0] },
          },
        },
      },
    },
  ]);

  let monthlyRevenue = 0;
  let monthlyProfit = 0;
  for (const order of monthlyOrders) {
    monthlyRevenue += order.totalAmount;
    const cost = order.quantity * (order.grossPrice || 0);
    monthlyProfit += order.totalAmount - cost;
  }

  // 3. Total store value (sum of all products' and variants' stock * offerPrice/price)
  const productValues = await productModel.aggregate([
    {
      $match: {
        store: new mongoose.Types.ObjectId(id),
        isDeleted: false,
      },
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
      $project: {
        productValue: {
          $cond: [
            { $gt: [{ $size: "$variantDetails" }, 0] },
            0, // If variants exist, product value is 0 (handled by variants)
            { $multiply: ["$stock", { $ifNull: ["$offerPrice", "$price"] }] },
          ],
        },
        variantValues: {
          $map: {
            input: "$variantDetails",
            as: "variant",
            in: {
              $multiply: [
                "$$variant.stock",
                { $ifNull: ["$$variant.offerPrice", "$$variant.price"] },
              ],
            },
          },
        },
      },
    },
  ]);

  // Sum up all product and variant values
  let totalStoreValue = 0;
  for (const p of productValues) {
    totalStoreValue += p.productValue || 0;
    if (Array.isArray(p.variantValues)) {
      totalStoreValue += p.variantValues.reduce((sum, v) => sum + (v || 0), 0);
    }
  }

  // --- Product List (existing logic) ---
  const result = await productModel.aggregate([
    // Match products for this store
    {
      $match: {
        store: new mongoose.Types.ObjectId(id),
        isDeleted: false,
        ...searchCondition,
      },
    },
    // Facet to get both total count and paginated results in one query
    {
      $facet: {
        // Get total count
        totalCount: [{ $count: "count" }],
        // Get paginated products
        products: [
          { $sort: { updatedAt: -1 } },
          { $skip: skip },
          { $limit: limitNum },
          // Lookup brand details
          {
            $lookup: {
              from: "brands",
              localField: "brand",
              foreignField: "_id",
              as: "brand",
            },
          },
          // Lookup category details
          {
            $lookup: {
              from: "categories",
              localField: "category",
              foreignField: "_id",
              as: "category",
            },
          },
          // Unwind brand and category arrays to objects
          {
            $unwind: {
              path: "$brand",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $unwind: {
              path: "$category",
              preserveNullAndEmptyArrays: true,
            },
          },
          // Project only needed fields
          {
            $project: {
              _id: 1,
              name: 1,
              sku: 1,
              price: 1,
              offerPrice: 1,
              stock: 1,
              images: 1,
              updatedAt: 1,
              "brand._id": 1,
              "brand.name": 1,
              "category._id": 1,
              "category.name": 1,
            },
          },
        ],
      },
    },
  ]);

  const totalProducts = result[0].totalCount[0]?.count || 0;
  const products = result[0].products.map(formatProductResponse);

  res.status(200).json({
    success: true,
    message: "Store products fetched successfully",
    data: {
      products,
      totalProducts,
      currentPage: pageNum,
      totalPages: Math.ceil(totalProducts / limitNum),
      cardStats: {
        totalSales,
        monthlyRevenue,
        monthlyProfit,
        totalStoreValue,
      },
    },
  });
});

const checkStore = catchAsync(async (req, res, next) => {
  const store = await storeModel.findById(req.user);
  if (!store) {
    return next(new AppError("Store not found", 404));
  }
  res.status(200).json({ store });
});

module.exports = {
  createStore,
  loginStore,
  getAllStores,
  editStore,
  // getStoreById,
  getStoreAndProducts,
  checkStore,
};

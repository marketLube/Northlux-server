const storeModel = require("../model/storeModel");
const productModel = require("../model/productModel");
const createToken = require("../utilities/createToken");
const AppError = require("../utilities/errorHandlings/appError");
const catchAsync = require("../utilities/errorHandlings/catchAsync");
const mongoose = require("mongoose");
const formatProductResponse = require("../helpers/product/formatProducts");

const createStore = catchAsync(async (req, res, next) => {
  const { store_name, email, address, store_number, login_number, password } =
    req.body;

  if (
    !store_name ||
    !email ||
    !password ||
    !address ||
    !store_number ||
    !login_number
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
  const { page = 1, limit = 10 } = req.query;
  const stores = await storeModel
    .find()
    .skip((page - 1) * limit)
    .limit(limit);

  res.status(200).json({
    message: "Stores fetched successfully",
    stores,
  });
});

const editStore = catchAsync(async (req, res, next) => {
  const { store_name, email, address, store_number, login_number, password } =
    req.body;
  if (!store_name || !email || !address || !store_number || !login_number) {
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

  const result = await productModel.aggregate([
    // Match products for this store
    {
      $match: {
        store: new mongoose.Types.ObjectId(id),
        // isDeleted: false,
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

const { getAll } = require("../helpers/handlerFactory/handlerFactory");
const formatProductResponse = require("../helpers/product/formatProducts");
const LabelModel = require("../model/labelModel");
const ProductModel = require("../model/productModel");
const catchAsync = require("../utilities/errorHandlings/catchAsync");

const addLabel = catchAsync(async (req, res, next) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Label name is required" });

  const existingLabel = await LabelModel.findOne({ name });
  if (existingLabel)
    return res.status(400).json({ message: "Label already exists" });

  const newLabel = new LabelModel({ name });
  await newLabel.save();

  res
    .status(201)
    .json({ message: "Label created successfully", label: newLabel });
});

const getLabels = getAll(LabelModel);

const editLabel = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { name } = req.body;

  const label = await LabelModel.findByIdAndUpdate(id, { name }, { new: true });
  res.status(200).json({ message: "Label updated successfully", label });
});

const searchLabel = catchAsync(async (req, res, next) => {
  const { q } = req.query;
  const label = await LabelModel.find({ name: { $regex: q, $options: "i" } });
  res.status(200).json({ message: "Label found successfully", label });
});

const groupLabel = catchAsync(async (req, res, next) => {
  const result = await ProductModel.aggregate([
    {
      $match: {
        isDeleted: false,
        activeStatus: true
      }
    },
    {
      $lookup: {
        from: "labels",
        localField: "label",
        foreignField: "_id",
        as: "label"
      }
    },
    {
      $unwind: {
        path: "$label",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: "variants",
        localField: "variants",
        foreignField: "_id",
        as: "variantsData"
      }
    },
    {
      $lookup: {
        from: "stores",
        localField: "store",
        foreignField: "_id",
        as: "store"
      }
    },
    {
      $lookup: {
        from: "brands",
        localField: "brand",
        foreignField: "_id",
        as: "brand"
      }
    },
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "category"
      }
    },
    {
      $lookup: {
        from: "offers",
        localField: "offer",
        foreignField: "_id",
        as: "offer"
      }
    },
    {
      $group: {
        _id: "$label.name",
        products: {
          $push: {
            _id: "$_id",
            name: "$name",
            description: "$description",
            price: "$price",
            variants: "$variantsData",
            store: { $arrayElemAt: ["$store", 0] },
            brand: { $arrayElemAt: ["$brand", 0] },
            category: { $arrayElemAt: ["$category", 0] },
            offer: { $arrayElemAt: ["$offer", 0] },
            images: "$images",
            activeStatus: "$activeStatus",
            isDeleted: "$isDeleted"
          }
        }
      }
    },
    {
      $project: {
        label: "$_id",
        products: 1,
        _id: 0
      }
    }
  ]);

  // Format the products using formatProductResponse
  const formattedResult = result.map(group => ({
    label: group.label,
    products: group.products.map(product => formatProductResponse(product))
  }));

  res.status(200).json({
    status: 'success',
    data: formattedResult
  });
});

module.exports = {
  addLabel,
  getLabels,
  editLabel,
  searchLabel,
  groupLabel,
};

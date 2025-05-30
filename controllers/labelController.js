const { getAll } = require("../helpers/handlerFactory/handlerFactory");
const formatProductResponse = require("../helpers/product/formatProducts");
const LabelModel = require("../model/labelModel");
const ProductModel = require("../model/productModel");
const AppError = require("../utilities/errorHandlings/appError");
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
        labelId: { $first: "$label._id" },
        createdAt:{$first:"$label.createdAt"},
        products: {
          $push: {
            _id: "$_id",
            name: "$name",
            description: "$description",
            price: "$price",
            offerPrice: "$offerPrice",
            variants: "$variantsData",
            store: { $arrayElemAt: ["$store", 0] },
            brand: { $arrayElemAt: ["$brand", 0] },
            category: { $arrayElemAt: ["$category", 0] },
            offer: { $arrayElemAt: ["$offer", 0] },
            images: "$images",
            activeStatus: "$activeStatus",
            isDeleted: "$isDeleted"
          }
        },
      }
    },


  
    {
      $project: {
        label: {
          name: "$_id",
          id: "$labelId",
          createdAt: "$createdAt"
        },
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

  formattedResult.sort((a, b) => {
    const dateDiff = new Date(b.label.createdAt) - new Date(a.label.createdAt);
    if (dateDiff !== 0) return dateDiff;
    return a.label.name.localeCompare(b.label.name);
  });
  res.status(200).json({
    status: 'success',
    data: formattedResult
  });
});


const deleteLabel = catchAsync(async (req, res, next) => {
  const { id } = req.params;


  if(id == "67e10f6c5b3d36dda0b0c4cc"){
    return next(new AppError("You are not authorized to delete this label", 403));
  } 

  const productCount = await ProductModel.countDocuments({ label: id });
  if (productCount > 0) {
    return res.status(400).json({ message: "Label has products, cannot delete" });
  }
  await LabelModel.findByIdAndDelete(id);
  res.status(200).json({ message: "Label deleted successfully" });
});

module.exports = {
  addLabel,
  getLabels,
  editLabel,
  searchLabel,
  groupLabel,
  deleteLabel,
};

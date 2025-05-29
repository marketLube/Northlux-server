const Category = require("../model/categoryModel");
const SubCategory = require("../model/subCategoryModel");
const catchAsync = require("../utilities/errorHandlings/catchAsync");

const createSubCategory = catchAsync(async (req, res) => {
  const { name, category } = req.body;

  const newSubCategory = new SubCategory({ name, category });
  await newSubCategory.save();
  await Category.findByIdAndUpdate(
    category,
    { $addToSet: { subcategories: newSubCategory._id } }
  );
  res.status(201).json({
    success: true,
    message: "Subcategory created successfully",
    subCategory: newSubCategory
  });
});

const getAllSubCategories = catchAsync(async (req, res) => {
  const subCategories = await SubCategory.find();
  res.status(200).json(subCategories);
});  

const getSubCategoryById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const subCategory = await SubCategory.findById(id);
  res.status(200).json(subCategory);
});

const updateSubCategory = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { name, category } = req.body;

  const subCategory = await SubCategory.findById(id);

  if (!subCategory) {
    return res.status(404).json({
      success: false,
      message: "Subcategory not found"
    });
  }

  // If parent category is changed
  if (subCategory.category.toString() !== category) {
    // Remove subcategory from old parent
    await Category.findByIdAndUpdate(
      subCategory.category,
      { $pull: { subcategories: subCategory._id } }
    );

    // Add subcategory to new parent
    await Category.findByIdAndUpdate(
      category,
      { $addToSet: { subcategories: subCategory._id } }
    );
  }

  // Update subcategory fields
  subCategory.name = name;
  subCategory.category = category;
  await subCategory.save();

  res.status(200).json({
    success: true,
    message: "Subcategory updated successfully",
    subCategory
  });
});

module.exports = {
  createSubCategory,
  getAllSubCategories,
  getSubCategoryById,
  updateSubCategory,
};





const subCategoryRouter = require('express').Router();
const { createSubCategory, getAllSubCategories, getSubCategoryById, updateSubCategory } = require('../../controllers/subcategoryController');

subCategoryRouter.post('/', createSubCategory);
subCategoryRouter.get('/', getAllSubCategories);
subCategoryRouter.get('/:id', getSubCategoryById);
subCategoryRouter.patch('/:id', updateSubCategory);

module.exports = subCategoryRouter;

const subCategoryRouter = require('express').Router();
const { createSubCategory, getAllSubCategories, getSubCategoryById, updateSubCategory, deleteSubCategory } = require('../../controllers/subcategoryController');

subCategoryRouter.post('/', createSubCategory);
subCategoryRouter.get('/', getAllSubCategories);
subCategoryRouter.get('/:id', getSubCategoryById);
subCategoryRouter.patch('/:id', updateSubCategory); 
subCategoryRouter.delete('/:id', deleteSubCategory);

module.exports = subCategoryRouter;

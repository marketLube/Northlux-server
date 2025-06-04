const subCategoryRouter = require('express').Router();
const { createSubCategory, getAllSubCategories, getSubCategoryById, updateSubCategory, deleteSubCategory } = require('../../controllers/subcategoryController');
const autheticateToken = require('../../middlewares/authMiddleware');

subCategoryRouter.post('/', autheticateToken(["admin" , "store"]), createSubCategory);
subCategoryRouter.get('/', getAllSubCategories);
subCategoryRouter.get('/:id', getSubCategoryById);
subCategoryRouter.patch('/:id', autheticateToken(["admin" , "store"]), updateSubCategory); 
subCategoryRouter.delete('/:id', autheticateToken(["admin" , "store"]), deleteSubCategory);

module.exports = subCategoryRouter;

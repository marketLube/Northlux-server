const {
  addCategory,
  getAllCategories,
  updateCategoryOffer,
  editCategory,
  removeOfferFromCategory,
  searchCategory,
  deleteCategory,
} = require("../../controllers/categoryController");
const autheticateToken = require("../../middlewares/authMiddleware");
const upload = require("../../middlewares/multer");

const categoryRouter = require("express").Router();

categoryRouter.post(
  "/addcategory",
  autheticateToken(["admin" , "store"]),
  upload.any(),
  addCategory
);
categoryRouter.get("/allcategories", getAllCategories);
categoryRouter.patch(
  "/addoffer/:categoryId",
  autheticateToken(["admin" , "store"]),
  updateCategoryOffer
);
categoryRouter.patch(
  "/editcategory/:categoryId",
  autheticateToken(["admin" , "store"]),
  upload.any(),
  editCategory
);
categoryRouter.patch(
  "/removeoffer/:categoryId",
  autheticateToken(["admin" , "store"]),
  removeOfferFromCategory
);
categoryRouter.get("/search", searchCategory);
categoryRouter.delete(
  "/deletecategory/:categoryId",
  autheticateToken(["admin" , "store"]),
  deleteCategory
);

module.exports = categoryRouter;

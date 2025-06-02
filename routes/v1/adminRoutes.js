const {
  adminRegister,
  AdminLogin,
  adminLogout,
  getSalesDetails,
  monthlyReport,
  AdminDashboard,
  fetchCategoriesAndBrands,
  checkAdmin,
  adminUtilities,
} = require("../../controllers/adminController");
const autheticateToken = require("../../middlewares/authMiddleware");
const {
  getAllStores,
  createStore,
  editStore,
  getStoreAndProducts,
} = require("../../controllers/storeController");
const { searchProducts } = require("../../controllers/productController");
const adminRouter = require("express").Router();

adminRouter.get("/adminutilities", adminUtilities);
adminRouter.get("/getstores", getAllStores);
adminRouter.get(
  "/getstoreandproducts/:id",
  autheticateToken(["admin"]),
  getStoreAndProducts
);
adminRouter.get("/salesreport", autheticateToken(["admin"]), getSalesDetails);
adminRouter.get("/monthlyreport", autheticateToken(["admin"]), monthlyReport);
adminRouter.get(
  "/dashboard",
  autheticateToken(["admin", "store"]),
  AdminDashboard
);
adminRouter.get(
  "/getcategoriesbrands",
  autheticateToken(["admin", "store"]),
  fetchCategoriesAndBrands
);
adminRouter.post("/register", adminRegister);
adminRouter.post("/login", AdminLogin);
adminRouter.post("/logout", adminLogout);
adminRouter.post("/create-store", autheticateToken(["admin"]), createStore);
adminRouter.patch("/edit-store/:id", autheticateToken(["admin"]), editStore);
adminRouter.get("/checkadmin", autheticateToken(["admin"]), checkAdmin);

adminRouter.get(
  "/product/search",
  autheticateToken(["admin", "store"]),
  searchProducts
);

//sales

module.exports = adminRouter;

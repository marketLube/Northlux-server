const {
  createBanner,
  getAllBanners,
  deleteBanner,
  updateBanner,
  getAllBannersByCategory,
} = require("../../controllers/bannerController");
const autheticateToken = require("../../middlewares/authMiddleware");
const upload = require("../../middlewares/multer");

const bannerRouter = require("express").Router();

bannerRouter
  .route("/")
  .post(autheticateToken(["admin" , "store"]), upload.any(), createBanner)
  .get(getAllBanners);

bannerRouter
  .route("/:id")
  .delete(autheticateToken(["admin" , "store"]), deleteBanner)
  .patch(autheticateToken(["admin" , "store"]), upload.any(), updateBanner);

bannerRouter.route("/get-all-banners-by-category").get(getAllBannersByCategory);

module.exports = bannerRouter;

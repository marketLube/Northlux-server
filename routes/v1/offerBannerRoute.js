const {
  createOfferBanner,
  getAllOfferBanners,
  deleteOfferBanner,
  updateOfferBanner,
} = require("../../controllers/offerBannerController");
const autheticateToken = require("../../middlewares/authMiddleware");
const upload = require("../../middlewares/multer");

const offerBannerRouter = require("express").Router();

offerBannerRouter
  .route("/")
  .post(autheticateToken(["admin" , "store"]), upload.any(), createOfferBanner)
  .get(getAllOfferBanners);

offerBannerRouter
  .route("/:id")
  .delete(autheticateToken(["admin" , "store"]), deleteOfferBanner)
  .patch(autheticateToken(["admin" , "store"]), upload.any(), updateOfferBanner);

module.exports = offerBannerRouter;

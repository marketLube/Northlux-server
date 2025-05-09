const {
  createOffer,
  getAllOffers,
  deleteOffer,
} = require("../../controllers/offerController");

const autheticateToken = require("../../middlewares/authMiddleware");
const upload = require("../../middlewares/multer");

const offerRouter = require("express").Router();

offerRouter
  .route("/")
  .post(autheticateToken(["admin", "store"]), upload.any(), createOffer)
  .get(getAllOffers);

offerRouter
  .route("/:id")
  .delete(autheticateToken(["admin", "store"]), deleteOffer);
// Add patch route for updating offers if needed
// .patch(autheticateToken(["admin"]), upload.any(), updateOffer);

module.exports = offerRouter;

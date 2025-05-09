const { loginStore, checkStore } = require("../../controllers/storeController");
const autheticateToken = require("../../middlewares/authMiddleware");

const storeRouter = require("express").Router();

storeRouter.post("/login", loginStore);
storeRouter.get("/checkstore", autheticateToken(["store"]), checkStore);

module.exports = storeRouter;

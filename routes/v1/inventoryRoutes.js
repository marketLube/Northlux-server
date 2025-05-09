const { getInventory } = require("../../controllers/inventoryController");
const autheticateToken = require("../../middlewares/authMiddleware");

const inventoryRouter = require("express").Router();

inventoryRouter.get("/", autheticateToken(["admin", "store"]), getInventory);

module.exports = inventoryRouter;

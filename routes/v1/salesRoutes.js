const express = require("express");
const { salesReport } = require("../../controllers/salesController");
const salesRouter = express.Router();
const autheticateToken = require("../../middlewares/authMiddleware");

salesRouter.get("/report", autheticateToken(["admin", "store"]), salesReport);

module.exports = salesRouter;

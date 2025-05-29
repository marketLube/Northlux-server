const {
  addLabel,
  getLabels,
  editLabel,
  searchLabel,
  groupLabel,
  deleteLabel,
} = require("../../controllers/labelController");
const autheticateToken = require("../../middlewares/authMiddleware");

const labelRouter = require("express").Router();

// labelRouter.get("/group-labels", groupLabels);
labelRouter.get("/group-labels", groupLabel);
labelRouter.get("/getlabels", getLabels);
labelRouter.post("/addlabel", autheticateToken(["admin"]), addLabel);
labelRouter.patch("/editlabel/:id", autheticateToken(["admin"]), editLabel);
labelRouter.get("/search", searchLabel);
labelRouter.delete("/deletelabel/:id", autheticateToken(["admin"]), deleteLabel);
module.exports = labelRouter;

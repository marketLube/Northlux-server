const express = require("express");
const { submitFeedback, getFeedbacks , deleteFeedback } = require("../../controllers/feedbackController");
const feedbackRouter = express.Router();

feedbackRouter.post("/submit-feedback", submitFeedback);
feedbackRouter.get("/get-feedbacks", getFeedbacks);
feedbackRouter.delete("/delete-feedback/:feedbackId", deleteFeedback);
module.exports = feedbackRouter;
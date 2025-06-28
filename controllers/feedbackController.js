const catchAsync = require("../utilities/errorHandlings/catchAsync");
const Feedback = require("../model/feedbackModel");

const submitFeedback = catchAsync(async (req, res) => {
  const { name, phone, email, message } = req.body;
  const feedback = await Feedback.create({ name, phone, email, message });
  res.status(200).json({
    message: "Feedback submitted successfully",
    feedback,
  });
});

const getFeedbacks = catchAsync(async (req, res) => {
    const {page = 1 , limit = 10} = req.query;  
  const feedbacks = await Feedback.find().skip((page - 1) * limit).limit(limit);
  const total = await Feedback.countDocuments();

  const totalPages = Math.ceil(total / limit);
  res.status(200).json({
    message: "Feedbacks fetched successfully",
    feedbacks,
    totalPages,
    currentPage: page,
    totalFeedbacks: total,
  });
});

const deleteFeedback = catchAsync(async (req, res) => {
  const { feedbackId } = req.params;
  await Feedback.findByIdAndDelete(feedbackId);
  res.status(200).json({
    message: "Feedback deleted successfully",
  });
});

module.exports = { submitFeedback, getFeedbacks , deleteFeedback };
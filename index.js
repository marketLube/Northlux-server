const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const apiRouter = require("./routes");
const connectDb = require("./config/dbConnection");
const globalErrorHandler = require("./utilities/errorHandlings/globalErrorHandler");
const AppError = require("./utilities/errorHandlings/appError");
const job = require("./utilities/cronJobs");
require("dotenv").config();

const app = express();

//Database connection
connectDb();

job.start();
//middlewares
app.use(cookieParser());
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5174",
      "http://localhost:5173",
      "https://www.northlux.in",
      "https://branch.northlux.in",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.get("/", (req, res) => {
  res.send("Server Started" + process.env.MONGO_URL);
});

//routes
app.use("/api", apiRouter);

app.all("*", (req, res, next) => {
  next(new AppError(`Cannot find the ${req.originalUrl} on the page !`, 404));
});

//error handling middleware
app.use(globalErrorHandler);

const port = process.env.PORT || 5000;
app.listen(port, (err) => {
  if (err) {
    console.log(err);
  } else {
    console.log(`server starts on port ${port}`);
  }
});

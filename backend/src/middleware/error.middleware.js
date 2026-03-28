// Custom Error Class (clean way to throw errors)
export class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.success = false;

    Error.captureStackTrace(this, this.constructor);
  }
}


// 🔥 Global Error Handler Middleware
export const errorHandler = (err, req, res, next) => {
  console.error("ERROR 💥:", err);

  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // 🔹 Mongoose Invalid ObjectId
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path}`;
  }

  // 🔹 Duplicate key error (MongoDB)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue).join(", ");
    message = `${field} already exists`;
  }

  // 🔹 Validation error (Mongoose)
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
  }

  return res.status(statusCode).json({
    success: false,
    message,
    // show stack only in development
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
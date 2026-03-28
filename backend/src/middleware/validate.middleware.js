import { ApiError } from "./error.middleware.js";

// 🔥 Generic validation middleware
export const validate = (schema) => {
  return (req, res, next) => {
    const data = {
      body: req.body,
      params: req.params,
      query: req.query,
    };

    const { error, value } = schema.validate(data, {
      abortEarly: false, // show all errors
      allowUnknown: true, // allow extra fields
      stripUnknown: true, // remove unknown fields
    });

    if (error) {
      const message = error.details
        .map((err) => err.message)
        .join(", ");

      return next(new ApiError(400, message));
    }

    // Replace req data with validated data
    req.body = value.body;
    req.params = value.params;
    req.query = value.query;

    next();
  };
};
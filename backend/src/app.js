import express from "express";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";

import authRouter from "./routes/auth.routes.js";
import flatRouter from "./routes/flat.routes.js";
import paymentRouter from "./routes/payment.routes.js";
import billRouter from "./routes/bill.routes.js";
import visitorRouter from "./routes/visitor.routes.js";

const app = express();


app.use(helmet()); // Secure headers
app.use(cors({
    origin: "*", // change in production
    credentials: true
}));

/* ================== MIDDLEWARE ================== */

app.use(express.json({ limit: "10kb" })); // prevent large payloads
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());
app.use(morgan("dev"));

/* ================== ROUTES ================== */

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/flats", flatRouter);
app.use("api/v1/payments",paymentRouter);
app.use("/api/v1/bills", billRouter);
app.use("/api/v1/visitors", visitorRouter);

/* ================== HEALTH CHECK ================== */

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "OK",
        message: "Server is running 🚀"
    });
});

/* ================== 404 HANDLER ================== */

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found"
    });
});

/* ================== GLOBAL ERROR HANDLER ================== */

app.use((err, req, res, next) => {
    console.error(err);

    return res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
        errors: err.errors || []
    });
});

export default app;
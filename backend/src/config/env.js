
import dotenv from "dotenv";

dotenv.config();

const requiredEnvVars = [
    "MONGODB_URL",
    "PORT",
    "ACCESS_TOKEN_SECRET",
    "REFRESH_TOKEN_SECRET",
    "ACCESS_TOKEN_EXPIRY",
    "REFRESH_TOKEN_EXPIRY",
];


requiredEnvVars.forEach((key) => {
    if (!process.env[key]) {
        throw new Error(`❌ Missing required environment variable: ${key}`);
    }
});

const env = {
    app: {
        port: process.env.PORT || 5000,
        nodeEnv: process.env.NODE_ENV || "development",
    },

    db: {
        uri: process.env.MONGODB_URL,
    },

    jwt: {
        accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
        refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
        accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY,
        refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY,
    },

    google: {
        clientId: process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN || "",
        user: process.env.GOOGLE_USER || "",
    },

    razorpay: {
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
        razorpayWebHookSecret: process.env.RAZORPAY_WEBHOOK_SECRET
    }
};

export default env;
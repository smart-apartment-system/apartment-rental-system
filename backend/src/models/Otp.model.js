import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    otp: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ["EMAIL_VERIFY", "PASSWORD_RESET", "LOGIN"],
    },
    expiresAt: {
        type: Date,
        required: true,
    },
}, { timestamps: true });

const Otp = mongoose.model("Otp", otpSchema);

export default Otp;
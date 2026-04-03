import mongoose from "mongoose";
import crypto from "crypto";
import UserModel from "../models/User.model.js";
import otpModel from "../models/Otp.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { sendEmail } from "../utils/sendEmail.js";
import { generateOtp, getOtpHtml } from "../utils/otp.js";
import env from "../config/env.js";
import jwt from "jsonwebtoken";


export const registerUser = asyncHandler(async (req, res) => {

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { name, email, username, password, phone, role } = req.body;
        
        if (!email || !password || !username) {
            throw new ApiError(400, "Required fields missing");
        }

        const existingUser = await UserModel.findOne({
            $or: [{ username }, { email }, { phone }],
        });  
        
        if (existingUser) {
            throw new ApiError(400, "User already exists");
        }    
        
        const user = await UserModel.create(
            [
                {
                username,
                email,
                password,
                name,
                role: role || "tenant",
                phone,
                },
            ],
            { session }
        );
        const createdUser = user[0];

        const otp = generateOtp(6);
        const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

        await otpModel.deleteMany(
            { userId: createdUser._id, type: "EMAIL_VERIFY" },
            { session }
        );

        await otpModel.create(
            [
                {
                userId: createdUser._id,
                otp: otpHash,
                type: "EMAIL_VERIFY",
                expiresAt: new Date(Date.now() + 5 * 60 * 1000),
                },
            ],
            { session }
        );
        const html = getOtpHtml(otp, createdUser.name);

        await sendEmail(
            email,
            "OTP Verification",
            `Your OTP code is ${otp}`,
            html
        );
        await session.commitTransaction();
        session.endSession();

        return res.status(201).json(
            new ApiResponse(
                201,
                {
                user: {
                    id: createdUser._id,
                    username: createdUser.username,
                    email: createdUser.email,
                    isEmailVerified: createdUser.isEmailVerified,
                },
                },
                "User registered successfully. Please verify your email."
            )
        );
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw new ApiError(500, error.message || "Registration failed");
    }
});



export const loginUser = asyncHandler(async (req, res) => {
    const { email, password, username, phone } = req.body;

    // Validate input
    if (!(email || username || phone)) {
        throw new ApiError(400, "Email, username or phone is required");
    }

    if (!password) {
        throw new ApiError(400, "Password is required");
    }

    // Find user
    const user = await UserModel.findOne({
        $or: [{ email }, { username }, { phone }],
    }).select("+password");

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials");
    }

    // IMPORTANT: Email verification check
    if (!user.isEmailVerified) {
        throw new ApiError(
        403,
        "Please verify your email before logging in"
        );
    }

    // 🔑 Generate tokens
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    //  Save refresh token
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    //  Cookie options (production safe)
    const options = {
        httpOnly: true,
        secure: env.app.nodeEnv === "production", // better than always true
        sameSite: "Strict",
    };

    // 📤 Response
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
        new ApiResponse(
            200,
            {
            id: user._id,
            username: user.username,
            email: user.email,
            isEmailVerified: user.isEmailVerified,
            },
            "User logged in successfully"
        ));
});

export const verifyEmail = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    const user = await UserModel.findOne({ email });
    if (!user) throw new ApiError(404, "User not found");

    const otpDoc = await otpModel.findOne({
        userId: user._id,
        type: "EMAIL_VERIFY",
    });

    if (!otpDoc) throw new ApiError(400, "OTP not found");


    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    if (otpDoc.otp !== hashedOtp || otpDoc.expiresAt < Date.now()) {
        throw new ApiError(400, "Invalid or expired OTP");
    }


    user.isEmailVerified = true;
    await user.save();


    await otpModel.deleteOne({ _id: otpDoc._id });

    return res.json(new ApiResponse(200, {}, "Email verified successfully"));
});

export const resendEmailOtp = asyncHandler(async(req,res)=>{
    const {email} = req.body;
    if(!email){
        throw new ApiError(400,"Email is required");
    }

    const user = await UserModel.findOne({email});
    if(!user){
        throw new ApiError(404, "User not found");
    }

    if(user.isEmailVerified){
        throw new ApiError(400, "Email is already verified");
    }

    const existingOtp = await otpModel.findOne({
        userId: user._id,
        type: "EMAIL_VERIFY",
    });

    if(existingOtp && existingOtp.expiresAt > Date.now() - 60 * 1000){
        throw new ApiError(429, "Please wait before requesting a new OTP");
    }

    const otp = generateOtp(6);
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    await otpModel.deleteMany({
        userId: user._id,
        type: "EMAIL_VERIFY",
    });

    await otpModel.create({
        userId: user._id,
        otp: otpHash,
        type: "EMAIL_VERIFY",
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    const html = getOtpHtml(otp, user.name);

    await sendEmail(
        user.email,
        "Resend OTP Verification",
        `Your OTP code is ${otp}`,
        html
    );

    return res.json(
        new ApiResponse(200, null, "OTP resent successfully")
    );
});

export const logoutUser = asyncHandler(async(req,res)=>{
    
    const userId = req.user?._id;
    if(!userId){
        throw new ApiError(401, "Unauthorized");
    }

    await UserModel.findByIdAndUpdate(
        userId,
        {
            $unset: { refreshToken: 1 },
        },
        { new: true }
    );

    const options = {
        httpOnly: true,
        secure: env.app.nodeEnv === "production",
        sameSite: env.app.nodeEnv === "production" ? "Strict" : "Lax",
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, null, "Logged out successfully"));
});

export const logoutUserAll = asyncHandler(async (req, res) => {
    const userId = req.user?._id;

    if (!userId) {
        throw new ApiError(401, "Unauthorized");
    }

    // 🧹 Remove refresh token (logout all sessions)
    await UserModel.findByIdAndUpdate(
        userId,
        {
        $unset: { refreshToken: "" },
        },
        { new: true }
    );


    const options = {
        httpOnly: true,
        secure: env.app.nodeEnv === "production",
        sameSite: env.app.nodeEnv === "production" ? "Strict" : "Lax",
        path: "/",
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, null, "Logged out from all devices"));
});


export const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies?.refreshToken || req.header("Authorization")?.replace("Bearer ","");

    if(!incomingRefreshToken){
        throw new ApiError(401, "Refresh token is required");
    }

    try {
        const decoded = jwt.verify(incomingRefreshToken,env.jwt.refreshTokenSecret);

        const user = await UserModel.findById(decoded._id).select("+refreshToken");
        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }

        if (user.refreshToken !== incomingRefreshToken) {
            throw new ApiError(401, "Refresh token mismatch");
        }
        const newAccessToken = user.generateAccessToken();
        const newRefreshToken = user.generateRefreshToken();

        user.refreshToken = newRefreshToken;
        await user.save({ validateBeforeSave: false });

        const options = {
            httpOnly: true,
            secure: env.app.nodeEnv === "production",
            sameSite: env.app.nodeEnv === "production" ? "Strict" : "Lax",
        };
        return res
            .status(200)
            .cookie("accessToken", newAccessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                200,
                { accessToken: newAccessToken },
                "Access token refreshed"
                )
            );
    } catch (error) {
        throw new ApiError(401, "Invalid or expired refresh token");
    }
});

// Password Management

export const forgotPassword = asyncHandler(async(req,res)=>{

});

export const verifyForgotPasswordOtp = asyncHandler(async(req,res)=>{

});

export const resetPassword = asyncHandler(async(req,res)=>{

});


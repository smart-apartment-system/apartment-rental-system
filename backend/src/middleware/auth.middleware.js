import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from 'jsonwebtoken';
import User from "../models/User.model.js";
import mongoose from "mongoose";
import env from "../config/env.js";

export const verifyJWT = asyncHandler(async (req, res, next)=>{

    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","");
    if(!token){
        throw new ApiError(401, "Access token is missing!");
    }

    try {
        const decodedToken = jwt.verify(token,env.jwt.accessTokenSecret );
        const user = await User.findById(decodedToken._id).select(
            "-password -refreshToken -emailVerificationToken -emailVerificationTokenExpiry -forgotPasswordToken -forgotPasswordTokenExpiry "
        );

        if(!user){
            throw new ApiError(401, "User not found");
        }
        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid or expired access token"); 
    }
})



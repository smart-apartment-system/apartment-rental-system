import UserModel from "../models/User.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";

export const registerUser = asyncHandler(async (req, res) => {
    
    const { name,email,username,password,phone,role } = req.body;

    const existingUser = await UserModel.findOne({
        $or:[
            {username},
            {email},
            {phone}
        ]
    });
    if (existingUser) {
        throw new ApiError(400, "Email, username or phone is already taken");
    }

    const user = await UserModel.create({
        username,
        email,
        password,
        name,
        role: role || "tenant",
        phone
    })
        
    return res.status(201).json(
        new ApiResponse(201, user, "User registered successfully")
    );
});



export const loginUser = asyncHandler(async(req,res)=>{
    const {email,password,username,phone} = req.body;

    if (!(email || username || phone)) {
        throw new ApiError(400, "Email, username or phone is required");
    }

    if (!password) {
        throw new ApiError(400, "Password is required");
    }

    const user = await UserModel.findOne({
        $or: [{ email }, { username }, { phone }]
    }).select("+password");

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    const options = {
        httpOnly: true,
        secure: true, 
        sameSite: "Strict"
    };


    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, user, "User logged in successfully")
        );
})
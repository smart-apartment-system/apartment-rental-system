import User from "../models/User.model.js";
import { ApiError } from "../middleware/error.middleware.js";
import bcrypt from "bcrypt";


// 🔹 Get current logged-in user
export const getCurrentUser = asyncHandler(async (req, res) => {


  if (!req.user) {
    throw new ApiError(401, "Unauthorized");
  }

  return res.status(200).json({
    success: true,
    data: req.user.toJSON(), 
  });
});


// 🔹 Get user by ID
export const getUserById = asyncHandler(async (req, res) => {
  const {userId} = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  const user = await User.findById(userId);
  if(!user){
    throw new ApiError(404, "User not found");
  }


  res.status(200).json({
    success: true,
    data: user.toPublicJSON(),
  });
});


// 🔹 Update profile
export const updateProfile = asyncHandler(async (req, res) => {
  const updates = req.body;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    updates,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: "Profile updated",
    data: user.toPublicJSON(),
  });
});


// 🔹 Delete user (soft delete recommended)
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  await user.deleteOne(); // or implement isActive if needed

  res.status(200).json({
    success: true,
    message: "User deleted",
  });
});


// 🔹 Change password
export const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select("+passwordHash");

  const isMatch = await user.comparePassword(oldPassword);

  if (!isMatch) {
    throw new ApiError(400, "Old password is incorrect");
  }

  user.passwordHash = newPassword; // will be hashed by pre-save hook
  await user.save();

  res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
});


// 🔥 ADMIN CONTROLLERS

// 🔹 Get all users
export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-passwordHash");

  res.status(200).json({
    success: true,
    count: users.length,
    data: users,
  });
});


// 🔹 Update user role
export const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true, runValidators: true }
  );

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  res.status(200).json({
    success: true,
    message: "Role updated",
    data: user.toPublicJSON(),
  });
});


// 🔹 Assign flat to user (Admin / Owner)
export const assignFlatToUser = asyncHandler(async (req, res) => {
  const { userId, flatId } = req.body;

  const user = await User.findById(userId);
  const flat = await Flat.findById(flatId);

  if (!user || !flat) {
    throw new ApiError(404, "User or Flat not found");
  }

  // Assign
  user.flatId = flatId;
  flat.tenantId = userId;
  flat.isOccupied = true;

  await user.save();
  await flat.save();

  res.status(200).json({
    success: true,
    message: "Flat assigned successfully",
  });
});
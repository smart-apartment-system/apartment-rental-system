import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/apiError.js";

import { User } from "../../models/user.model.js";
import { Apartment } from "../../models/apartment.model.js";
import { Flat } from "../../models/flat.model.js";
import { Bill } from "../../models/bill.model.js";


// 🔥 1. Overall stats
export const getAdminStats = asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments();
  const totalApartments = await Apartment.countDocuments();
  const totalFlats = await Flat.countDocuments();
  const totalBills = await Bill.countDocuments();

  res.status(200).json({
    success: true,
    data: {
      totalUsers,
      totalApartments,
      totalFlats,
      totalBills,
    },
  });
});


// 🔥 2. Apartment stats
export const getAllApartmentsStats = asyncHandler(async (req, res) => {
  const apartments = await Apartment.find();

  const stats = apartments.map((apt) => ({
    _id: apt._id,
    name: apt.name,
    totalFlats: apt.totalFlats,
    occupiedFlats: apt.occupiedFlats,
    occupancyRate: apt.occupancyRate,
    isActive: apt.isActive,
  }));

  res.status(200).json({
    success: true,
    count: stats.length,
    data: stats,
  });
});


// 🔥 3. User stats
export const getAllUsersStats = asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments();

  const roleStats = await User.aggregate([
    {
      $group: {
        _id: "$role",
        count: { $sum: 1 },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    totalUsers,
    roleStats,
  });
});


// 🔥 4. Revenue stats
export const getSystemRevenue = asyncHandler(async (req, res) => {
  const revenue = await Bill.aggregate([
    {
      $match: { status: "paid" },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$totalAmount" },
      },
    },
  ]);

  const pending = await Bill.aggregate([
    {
      $match: { status: "pending" },
    },
    {
      $group: {
        _id: null,
        pendingAmount: { $sum: "$totalAmount" },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalRevenue: revenue[0]?.totalRevenue || 0,
      pendingAmount: pending[0]?.pendingAmount || 0,
    },
  });
});


// 🔥 5. System health
export const getSystemHealth = asyncHandler(async (req, res) => {
  const activeApartments = await Apartment.countDocuments({ isActive: true });
  const inactiveApartments = await Apartment.countDocuments({ isActive: false });

  const occupiedFlats = await Flat.countDocuments({ isOccupied: true });
  const vacantFlats = await Flat.countDocuments({ isOccupied: false });

  const lateBills = await Bill.countDocuments({ status: "late" });

  res.status(200).json({
    success: true,
    data: {
      apartments: {
        active: activeApartments,
        inactive: inactiveApartments,
      },
      flats: {
        occupied: occupiedFlats,
        vacant: vacantFlats,
      },
      lateBills,
    },
  });
});
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/apiError.js";

import { Flat } from "../../models/flat.model.js";
import { Bill } from "../../models/bill.model.js";
import { User } from "../../models/user.model.js";


// 🔹 1. OWNER STATS
export const getOwnerStats = asyncHandler(async (req, res) => {
  const apartmentId = req.user.apartmentId;

  const totalFlats = await Flat.countDocuments({ apartmentId });
  const occupiedFlats = await Flat.countDocuments({
    apartmentId,
    isOccupied: true,
  });

  const vacantFlats = totalFlats - occupiedFlats;

  const totalRevenue = await Bill.aggregate([
    { $match: { status: "paid" } },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalFlats,
      occupiedFlats,
      vacantFlats,
      revenue: totalRevenue[0]?.total || 0,
    },
  });
});


// 🔹 2. MONTHLY REVENUE
export const getOwnerMonthlyRevenue = asyncHandler(async (req, res) => {
  const revenue = await Bill.aggregate([
    { $match: { status: "paid" } },
    {
      $group: {
        _id: { $month: "$paidOn" },
        total: { $sum: "$totalAmount" },
      },
    },
    { $sort: { "_id": 1 } },
  ]);

  res.status(200).json({
    success: true,
    data: revenue,
  });
});


// 🔹 3. RECENT PAYMENTS
export const getOwnerRecentPayments = asyncHandler(async (req, res) => {
  const payments = await Bill.find({ status: "paid" })
    .sort({ paidOn: -1 })
    .limit(5)
    .populate("tenantId", "name email");

  res.status(200).json({
    success: true,
    data: payments,
  });
});


// 🔹 4. TOP DEFAULTERS (late payers)
export const getOwnerTopDefaulters = asyncHandler(async (req, res) => {
  const defaulters = await Bill.aggregate([
    { $match: { status: "late" } },
    {
      $group: {
        _id: "$tenantId",
        totalLateAmount: { $sum: "$totalAmount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { totalLateAmount: -1 } },
    { $limit: 5 },
  ]);

  res.status(200).json({
    success: true,
    data: defaulters,
  });
});


// 🔹 5. OCCUPANCY TRENDS (basic version)
export const getOwnerOccupancyTrends = asyncHandler(async (req, res) => {
  const totalFlats = await Flat.countDocuments({
    apartmentId: req.user.apartmentId,
  });

  const occupiedFlats = await Flat.countDocuments({
    apartmentId: req.user.apartmentId,
    isOccupied: true,
  });

  const occupancyRate =
    totalFlats === 0 ? 0 : (occupiedFlats / totalFlats) * 100;

  res.status(200).json({
    success: true,
    data: {
      totalFlats,
      occupiedFlats,
      occupancyRate: occupancyRate.toFixed(2),
    },
  });
});
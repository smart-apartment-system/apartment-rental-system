import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/apiError.js";

import { Bill } from "../../models/bill.model.js";
import { User } from "../../models/user.model.js";
import { Flat } from "../../models/flat.model.js";
import { Apartment } from "../../models/apartment.model.js";


// 🔔 Notifications
export const getNotifications = asyncHandler(async (req, res) => {
  let notifications = [];

  if (req.user.role === "tenant") {
    notifications = await Bill.find({
      tenantId: req.user._id,
      status: { $in: ["pending", "late"] },
    })
      .sort({ dueDate: 1 })
      .limit(5);
  }

  if (req.user.role === "owner") {
    notifications = await Bill.find({ status: "late" })
      .limit(5);
  }

  res.status(200).json({
    success: true,
    data: notifications,
  });
});


// 📜 Activity Logs
export const getActivityLogs = asyncHandler(async (req, res) => {
  let logs = [];

  if (req.user.role === "admin") {
    logs = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name email role createdAt");
  }

  if (req.user.role === "tenant") {
    logs = await Bill.find({ tenantId: req.user._id })
      .sort({ updatedAt: -1 })
      .limit(5);
  }

  res.status(200).json({
    success: true,
    data: logs,
  });
});


// 📊 Dashboard Summary
export const getDashboardSummary = asyncHandler(async (req, res) => {
  let data = {};

  // TENANT
  if (req.user.role === "tenant") {
    const totalBills = await Bill.countDocuments({
      tenantId: req.user._id,
    });

    const pendingBills = await Bill.countDocuments({
      tenantId: req.user._id,
      status: "pending",
    });

    const paidBills = await Bill.countDocuments({
      tenantId: req.user._id,
      status: "paid",
    });

    data = { totalBills, pendingBills, paidBills };
  }

  // OWNER
  if (req.user.role === "owner") {
    const totalFlats = await Flat.countDocuments({
      apartmentId: req.user.apartmentId,
    });

    const occupiedFlats = await Flat.countDocuments({
      apartmentId: req.user.apartmentId,
      isOccupied: true,
    });

    data = { totalFlats, occupiedFlats };
  }

  // ADMIN
  if (req.user.role === "admin") {
    const totalUsers = await User.countDocuments();
    const totalApartments = await Apartment.countDocuments();

    data = { totalUsers, totalApartments };
  }

  res.status(200).json({
    success: true,
    data,
  });
});
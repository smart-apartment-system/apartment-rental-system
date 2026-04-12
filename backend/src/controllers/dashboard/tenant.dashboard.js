import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/apiError.js";

import { Bill } from "../../models/bill.model.js";


// 🔹 1. TENANT OVERVIEW
export const getTenantOverview = asyncHandler(async (req, res) => {
  const tenantId = req.user._id;

  const totalBills = await Bill.countDocuments({ tenantId });

  const pendingBills = await Bill.countDocuments({
    tenantId,
    status: "pending",
  });

  const paidBills = await Bill.countDocuments({
    tenantId,
    status: "paid",
  });

  res.status(200).json({
    success: true,
    data: {
      totalBills,
      pendingBills,
      paidBills,
    },
  });
});


// 🔹 2. ALL BILLS
export const getTenantBills = asyncHandler(async (req, res) => {
  const bills = await Bill.find({ tenantId: req.user._id })
    .sort({ dueDate: -1 });

  res.status(200).json({
    success: true,
    count: bills.length,
    data: bills,
  });
});


// 🔹 3. PAYMENT HISTORY
export const getTenantPaymentHistory = asyncHandler(async (req, res) => {
  const payments = await Bill.find({
    tenantId: req.user._id,
    status: "paid",
  })
    .sort({ paidOn: -1 });

  res.status(200).json({
    success: true,
    data: payments,
  });
});


// 🔹 4. DUE SUMMARY
export const getTenantDueSummary = asyncHandler(async (req, res) => {
  const pendingBills = await Bill.find({
    tenantId: req.user._id,
    status: { $in: ["pending", "late"] },
  });

  const totalDue = pendingBills.reduce(
    (sum, bill) => sum + bill.totalAmount,
    0
  );

  res.status(200).json({
    success: true,
    data: {
      totalDue,
      count: pendingBills.length,
    },
  });
});


// 🔹 5. TENANT NOTIFICATIONS
export const getTenantNotifications = asyncHandler(async (req, res) => {
  const notifications = await Bill.find({
    tenantId: req.user._id,
    status: { $in: ["pending", "late"] },
  })
    .sort({ dueDate: 1 })
    .limit(5);

  res.status(200).json({
    success: true,
    data: notifications,
  });
});
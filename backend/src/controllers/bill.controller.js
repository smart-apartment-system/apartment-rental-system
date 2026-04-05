import Bill from "../models/Bill.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";

const BILL_PAGE_SIZE = 20;

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Build a Mongoose filter from allowed query params.
 * Always restricts to isActive: true unless caller overrides.
 */
function buildFilter(query, extra = {}) {
  const filter = { isActive: true, ...extra };

  // ?status=pending|paid|late
  if (query.status && ["pending", "paid", "late"].includes(query.status)) {
    filter.status = query.status;
  }

  // ?month=2026-04
  if (query.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(query.month)) {
    filter.month = query.month;
  }

  // ?flatId=<id>
  if (query.flatId) {
    filter.flatId = query.flatId;
  }

  return filter;
}

/** Parse and clamp pagination query params */
function parsePagination(query) {
  const page  = Math.max(1, parseInt(query.page)  || 1);
  const limit = Math.min(parseInt(query.limit) || BILL_PAGE_SIZE, 100);
  const skip  = (page - 1) * limit;
  return { page, limit, skip };
}


// ─── 1. Create Bill ───────────────────────────────────────────────────────────
/**
 * POST /api/bills
 * Admin only
 */
export const createBill = asyncHandler(async (req, res) => {
  const {
    flatId,
    tenantId,
    month,
    rentAmount,
    electricityBill,
    maintenance,
    dueDate,
    note,
  } = req.body;

  if (!flatId || !tenantId || !month || !rentAmount || !dueDate) {
    throw new ApiError(400, "Required fields: flatId, tenantId, month, rentAmount, dueDate");
  }

  const existingBill = await Bill.findOne({ flatId, tenantId, month });
  if (existingBill) {
    throw new ApiError(409, "Bill already exists for this flat/tenant/month");
  }

  const bill = await Bill.create({
    flatId,
    tenantId,
    month,
    rentAmount,
    electricityBill,
    maintenance,
    dueDate,
    note,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, bill.toPublicJSON(), "Bill created"));
});


// ─── 2. Update Bill ───────────────────────────────────────────────────────────
/**
 * PATCH /api/bills/:billId
 * Admin only — cannot edit a paid or deleted bill
 */
export const updateBill = asyncHandler(async (req, res) => {
  const { billId } = req.params;
  const { rentAmount, electricityBill, maintenance, dueDate, note } = req.body;

  const bill = await Bill.findById(billId);
  if (!bill)          throw new ApiError(404, "Bill not found");
  if (!bill.isActive) throw new ApiError(400, "Cannot update a deleted bill");
  if (bill.paidOn)    throw new ApiError(400, "Cannot update an already paid bill");

  // ✅ Only include fields that were actually sent
  const fieldsToUpdate = {
    ...(rentAmount      !== undefined && { rentAmount }),
    ...(electricityBill !== undefined && { electricityBill }),
    ...(maintenance     !== undefined && { maintenance }),
    ...(dueDate         !== undefined && { dueDate }),
    ...(note            !== undefined && { note }),
  };

  if (Object.keys(fieldsToUpdate).length === 0) {
    throw new ApiError(400, "No valid fields provided for update");
  }

  const updated = await Bill.findByIdAndUpdate(
    billId,
    fieldsToUpdate,
    { new: true, runValidators: true }
  );

  return res.json(new ApiResponse(200, updated.toPublicJSON(), "Bill updated"));
});


// ─── 3. Get All Bills (Admin) ─────────────────────────────────────────────────
/**
 * GET /api/bills?page=1&limit=20&status=pending&month=2026-04&flatId=<id>
 * Admin only — supports filtering + pagination
 */
export const getAllBills = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = buildFilter(req.query);

  const [bills, total] = await Promise.all([
    Bill.find(filter)
      .populate("flatId",   "flatNumber floor")   // only useful fields
      .populate("tenantId", "name email phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Bill.countDocuments(filter),
  ]);

  return res.json(
    new ApiResponse(200, {
      bills: bills.map((b) => b.toPublicJSON()),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    }, "All bills fetched")
  );
});


// ─── 4. Get Single Bill ───────────────────────────────────────────────────────
/**
 * GET /api/bills/:billId
 * Admin or the bill's own tenant
 */
export const getBillById = asyncHandler(async (req, res) => {
  const { billId } = req.params;

  const bill = await Bill.findById(billId)
    .populate("flatId",   "flatNumber floor")
    .populate("tenantId", "name email phone");

  if (!bill)          throw new ApiError(404, "Bill not found");
  if (!bill.isActive) throw new ApiError(404, "Bill not found");

  const isAdmin = req.user?.role === "admin";
  const isSelf  = req.user?._id.toString() === bill.tenantId._id.toString();
  if (!isAdmin && !isSelf) throw new ApiError(403, "Access denied");

  return res.json(new ApiResponse(200, bill.toPublicJSON(), "Bill details"));
});


// ─── 5. Get Tenant Bills ──────────────────────────────────────────────────────
/**
 * GET /api/bills/tenant/:tenantId?page=1&limit=20&status=pending&month=2026-04
 * Admin or the tenant themselves
 */
export const getTenantBills = asyncHandler(async (req, res) => {
  const { tenantId } = req.params;

  const isAdmin = req.user?.role === "admin";
  const isSelf  = req.user?._id.toString() === tenantId;
  if (!isAdmin && !isSelf) throw new ApiError(403, "Access denied");

  const { page, limit, skip } = parsePagination(req.query);
  const filter = buildFilter(req.query, { tenantId });

  const [bills, total] = await Promise.all([
    Bill.find(filter)
      .populate("flatId", "flatNumber floor")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Bill.countDocuments(filter),
  ]);

  return res.json(
    new ApiResponse(200, {
      bills: bills.map((b) => b.toPublicJSON()),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    }, "Tenant bills")
  );
});


// ─── 6. Get Bills Summary (Admin Dashboard) ───────────────────────────────────
/**
 * GET /api/bills/summary
 * Returns counts grouped by status for the current month
 */
export const getBillsSummary = asyncHandler(async (req, res) => {
  const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const month        = req.query.month || currentMonth;

  const summary = await Bill.aggregate([
    { $match: { isActive: true, month } },
    {
      $group: {
        _id:        "$status",
        count:      { $sum: 1 },
        totalAmount:{ $sum: "$totalAmount" },
      },
    },
  ]);

  // Shape into { pending, paid, late } with defaults
  const result = { pending: 0, paid: 0, late: 0, totalRevenue: 0 };
  for (const row of summary) {
    result[row._id]    = row.count;
    result.totalRevenue += row.totalAmount;
  }

  return res.json(new ApiResponse(200, { month, ...result }, "Bills summary"));
});


// ─── 7. Mark as Paid (Admin override) ────────────────────────────────────────
/**
 * PATCH /api/bills/:billId/mark-paid
 * Admin only — manual override outside of payment gateway flow
 */
export const markAsPaid = asyncHandler(async (req, res) => {
  const { billId } = req.params;

  const bill = await Bill.findById(billId);
  if (!bill)          throw new ApiError(404, "Bill not found");
  if (!bill.isActive) throw new ApiError(400, "Bill is deleted");
  if (bill.paidOn)    throw new ApiError(400, "Bill is already marked as paid");

  bill.paidOn = new Date();
  await bill.save();

  return res.json(new ApiResponse(200, bill.toPublicJSON(), "Bill marked as paid"));
});


// ─── 8. Delete Bill (Soft) ────────────────────────────────────────────────────
/**
 * DELETE /api/bills/:billId
 * Admin only — soft delete
 */
export const deleteBill = asyncHandler(async (req, res) => {
  const { billId } = req.params;

  const bill = await Bill.findById(billId);
  if (!bill)          throw new ApiError(404, "Bill not found");
  if (!bill.isActive) throw new ApiError(400, "Bill is already deleted");

  // ✅ Prevent deleting a paid bill without explicit intent
  if (bill.paidOn) {
    throw new ApiError(400, "Cannot delete a paid bill. Contact support if this is an error.");
  }

  bill.isActive = false;
  await bill.save();

  return res.json(new ApiResponse(200, null, "Bill deleted"));
});
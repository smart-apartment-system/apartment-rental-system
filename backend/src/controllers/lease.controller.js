import { Lease } from "../models/lease.model.js";
import { Flat } from "../models/flat.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";

const LEASE_PAGE_SIZE = 20;


// ─── Helper ───────────────────────────────────────────────────────────────────
function parsePagination(query) {
  const page  = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(parseInt(query.limit) || LEASE_PAGE_SIZE, 100);
  const skip  = (page - 1) * limit;

  return { page, limit, skip };
}


// ─── 1. Create Lease ──────────────────────────────────────────────────────────
export const createLease = asyncHandler(async (req, res) => {
  const { tenantId, flatId, startDate, endDate, rentAmount } = req.body;

  if (!tenantId || !flatId || !startDate || !endDate || !rentAmount) {
    throw new ApiError(400, "Required fields missing");
  }

  // Prevent duplicate active lease
  const existing = await Lease.findOne({
    flatId,
    status: "active",
  });

  if (existing) {
    throw new ApiError(400, "Flat already has an active lease");
  }

  const lease = await Lease.create({
    tenantId,
    flatId,
    startDate,
    endDate,
    rentAmount,
    createdBy: req.user._id,
  });

  // Mark flat as occupied
  await Flat.findByIdAndUpdate(flatId, {
    isOccupied: true,
    tenantId,
  });

  return res.status(201).json(
    new ApiResponse(201, lease, "Lease created")
  );
});


// ─── 2. Get Lease by Tenant ───────────────────────────────────────────────────
export const getLeaseByTenant = asyncHandler(async (req, res) => {
  const { tenantId } = req.params;

  const leases = await Lease.find({ tenantId })
    .populate("flatId", "flatNumber floor")
    .sort({ createdAt: -1 });

  return res.json(
    new ApiResponse(200, leases, "Tenant leases fetched")
  );
});


// ─── 3. Get Lease by Flat ─────────────────────────────────────────────────────
export const getLeaseByFlat = asyncHandler(async (req, res) => {
  const { flatId } = req.params;

  const leases = await Lease.find({ flatId })
    .populate("tenantId", "name email")
    .sort({ createdAt: -1 });

  return res.json(
    new ApiResponse(200, leases, "Flat leases fetched")
  );
});


// ─── 4. Get Active Leases ─────────────────────────────────────────────────────
export const getActiveLeases = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);

  const [leases, total] = await Promise.all([
    Lease.find({ status: "active" })
      .populate("tenantId", "name email")
      .populate("flatId", "flatNumber floor")
      .skip(skip)
      .limit(limit),

    Lease.countDocuments({ status: "active" }),
  ]);

  return res.json(
    new ApiResponse(200, {
      leases,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    }, "Active leases fetched")
  );
});


// ─── 5. Terminate Lease ───────────────────────────────────────────────────────
export const terminateLease = asyncHandler(async (req, res) => {
  const { leaseId } = req.params;

  const lease = await Lease.findById(leaseId);
  if (!lease) throw new ApiError(404, "Lease not found");

  if (lease.status !== "active") {
    throw new ApiError(400, "Lease already inactive");
  }

  lease.status = "terminated";
  lease.terminatedAt = new Date();

  await lease.save();

  // Free the flat
  await Flat.findByIdAndUpdate(lease.flatId, {
    isOccupied: false,
    tenantId: null,
  });

  return res.json(
    new ApiResponse(200, lease, "Lease terminated")
  );
});


// ─── 6. Renew Lease ───────────────────────────────────────────────────────────
export const renewLease = asyncHandler(async (req, res) => {
  const { leaseId } = req.params;
  const { newEndDate } = req.body;

  const lease = await Lease.findById(leaseId);
  if (!lease) throw new ApiError(404, "Lease not found");

  if (lease.status !== "active") {
    throw new ApiError(400, "Only active lease can be renewed");
  }

  lease.endDate = newEndDate;

  await lease.save();

  return res.json(
    new ApiResponse(200, lease, "Lease renewed")
  );
});


// ─── 7. Lease History ─────────────────────────────────────────────────────────
export const getLeaseHistory = asyncHandler(async (req, res) => {
  const { tenantId } = req.params;

  const leases = await Lease.find({
    tenantId,
    status: { $in: ["terminated", "expired"] },
  })
    .populate("flatId", "flatNumber floor")
    .sort({ createdAt: -1 });

  return res.json(
    new ApiResponse(200, leases, "Lease history fetched")
  );
});
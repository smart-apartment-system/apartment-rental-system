import { MaintenanceRequest } from "../models/maintenanceRequest.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";

const PAGE_SIZE = 20;


// ─── Helper ───────────────────────────────────────────────────────────────────
function parsePagination(query) {
  const page  = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(parseInt(query.limit) || PAGE_SIZE, 100);
  const skip  = (page - 1) * limit;

  return { page, limit, skip };
}


// ─── 1. Create Request ────────────────────────────────────────────────────────
export const createMaintenanceRequest = asyncHandler(async (req, res) => {
  const { flatId, title, description, priority } = req.body;

  if (!flatId || !title || !description) {
    throw new ApiError(400, "Required fields missing");
  }

  const request = await MaintenanceRequest.create({
    flatId,
    tenantId: req.user._id,
    title,
    description,
    priority,
  });

  return res.status(201).json(
    new ApiResponse(201, request, "Request created")
  );
});


// ─── 2. Get All Requests (by Apartment) ───────────────────────────────────────
export const getAllRequestsByApartment = asyncHandler(async (req, res) => {
  const { apartmentId } = req.params;
  const { page, limit, skip } = parsePagination(req.query);

  const [requests, total] = await Promise.all([
    MaintenanceRequest.find({ apartmentId })
      .populate("tenantId", "name email")
      .populate("flatId", "flatNumber")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    MaintenanceRequest.countDocuments({ apartmentId }),
  ]);

  return res.json(
    new ApiResponse(200, {
      requests,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    }, "Apartment requests")
  );
});


// ─── 3. Get Requests by Tenant ────────────────────────────────────────────────
export const getRequestsByTenant = asyncHandler(async (req, res) => {
  const requests = await MaintenanceRequest.find({
    tenantId: req.user._id,
  }).sort({ createdAt: -1 });

  return res.json(
    new ApiResponse(200, requests, "Tenant requests")
  );
});


// ─── 4. Assign Request to Staff ───────────────────────────────────────────────
export const assignRequestToStaff = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const { staffId } = req.body;

  const request = await MaintenanceRequest.findById(requestId);
  if (!request) throw new ApiError(404, "Request not found");

  request.assignedTo = staffId;
  request.status = "in_progress";

  await request.save();

  return res.json(
    new ApiResponse(200, request, "Assigned to staff")
  );
});


// ─── 5. Update Status ─────────────────────────────────────────────────────────
export const updateRequestStatus = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const { status } = req.body;

  const request = await MaintenanceRequest.findById(requestId);
  if (!request) throw new ApiError(404, "Request not found");

  request.status = status;

  if (status === "resolved") {
    request.resolvedAt = new Date();
  }

  await request.save();

  return res.json(
    new ApiResponse(200, request, "Status updated")
  );
});


// ─── 6. Add Remarks ───────────────────────────────────────────────────────────
export const addRemarks = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const { remark } = req.body;

  const request = await MaintenanceRequest.findById(requestId);
  if (!request) throw new ApiError(404, "Request not found");

  request.remarks.push({
    text: remark,
    addedBy: req.user._id,
    date: new Date(),
  });

  await request.save();

  return res.json(
    new ApiResponse(200, request, "Remark added")
  );
});


// ─── 7. Upload Attachment ─────────────────────────────────────────────────────
export const uploadAttachment = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const { fileUrl } = req.body;

  const request = await MaintenanceRequest.findById(requestId);
  if (!request) throw new ApiError(404, "Request not found");

  request.attachments.push({
    fileUrl,
    uploadedAt: new Date(),
  });

  await request.save();

  return res.json(
    new ApiResponse(200, request, "Attachment uploaded")
  );
});


// ─── 8. Mark Resolved ─────────────────────────────────────────────────────────
export const markResolved = asyncHandler(async (req, res) => {
  const { requestId } = req.params;

  const request = await MaintenanceRequest.findById(requestId);
  if (!request) throw new ApiError(404, "Request not found");

  request.status = "resolved";
  request.resolvedAt = new Date();

  await request.save();

  return res.json(
    new ApiResponse(200, request, "Request resolved")
  );
});


// ─── 9. Delete Request ────────────────────────────────────────────────────────
export const deleteRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;

  const request = await MaintenanceRequest.findById(requestId);
  if (!request) throw new ApiError(404, "Request not found");

  const isOwner = req.user._id.toString() === request.tenantId.toString();
  const isAdmin = req.user.role === "admin";

  if (!isOwner && !isAdmin) {
    throw new ApiError(403, "Not allowed");
  }

  await request.deleteOne();

  return res.json(
    new ApiResponse(200, null, "Request deleted")
  );
});
import { AuditLog } from "../models/auditLog.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";

const LOG_PAGE_SIZE = 20;


// ─── Helper ───────────────────────────────────────────────────────────────────

function buildFilter(query, extra = {}) {
  const filter = { ...extra };

  // ?action=CREATE|UPDATE|DELETE|PAYMENT
  if (query.action) {
    filter.action = query.action;
  }

  // ?entity=Bill|User|Flat
  if (query.entity) {
    filter.entity = query.entity;
  }

  // ?userId=<id>
  if (query.userId) {
    filter.userId = query.userId;
  }

  return filter;
}

function parsePagination(query) {
  const page  = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(parseInt(query.limit) || LOG_PAGE_SIZE, 100);
  const skip  = (page - 1) * limit;

  return { page, limit, skip };
}


// ─── 1. Get All Logs (Admin) ──────────────────────────────────────────────────
export const getAllLogs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = buildFilter(req.query);

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate("userId", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AuditLog.countDocuments(filter),
  ]);

  return res.json(
    new ApiResponse(200, {
      logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    }, "All logs fetched")
  );
});


// ─── 2. Get Logs by User ──────────────────────────────────────────────────────
export const getLogsByUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const { page, limit, skip } = parsePagination(req.query);

  const [logs, total] = await Promise.all([
    AuditLog.find({ userId })
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AuditLog.countDocuments({ userId }),
  ]);

  return res.json(
    new ApiResponse(200, {
      logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    }, "User logs fetched")
  );
});


// ─── 3. Get Logs by Entity ────────────────────────────────────────────────────
export const getLogsByEntity = asyncHandler(async (req, res) => {
  const { entity, entityId } = req.query;

  if (!entity) {
    throw new ApiError(400, "Entity is required");
  }

  const filter = {
    entity,
    ...(entityId && { entityId }),
  };

  const logs = await AuditLog.find(filter)
    .populate("userId", "name email")
    .sort({ createdAt: -1 });

  return res.json(
    new ApiResponse(200, logs, "Entity logs fetched")
  );
});


// ─── 4. Get Recent Logs ───────────────────────────────────────────────────────
export const getRecentLogs = asyncHandler(async (req, res) => {
  const logs = await AuditLog.find()
    .populate("userId", "name email")
    .sort({ createdAt: -1 })
    .limit(10);

  return res.json(
    new ApiResponse(200, logs, "Recent logs fetched")
  );
});
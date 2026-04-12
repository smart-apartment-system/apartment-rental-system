import { Document } from "../models/document.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";

const DOC_PAGE_SIZE = 20;


// ─── Helper ───────────────────────────────────────────────────────────────────

function parsePagination(query) {
  const page  = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(parseInt(query.limit) || DOC_PAGE_SIZE, 100);
  const skip  = (page - 1) * limit;

  return { page, limit, skip };
}


// ─── 1. Upload Document ───────────────────────────────────────────────────────
/**
 * POST /api/documents
 */
export const uploadDocument = asyncHandler(async (req, res) => {
  const { type, fileUrl } = req.body;

  if (!type || !fileUrl) {
    throw new ApiError(400, "type and fileUrl are required");
  }

  const document = await Document.create({
    userId: req.user._id,
    type,
    fileUrl,
  });

  return res.status(201).json(
    new ApiResponse(201, document, "Document uploaded")
  );
});


// ─── 2. Get User Documents ────────────────────────────────────────────────────
/**
 * GET /api/documents/user?page=1&limit=20
 */
export const getUserDocuments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);

  const [docs, total] = await Promise.all([
    Document.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    Document.countDocuments({ userId: req.user._id }),
  ]);

  return res.json(
    new ApiResponse(200, {
      documents: docs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    }, "User documents fetched")
  );
});


// ─── 3. Get Document By ID ────────────────────────────────────────────────────
export const getDocumentById = asyncHandler(async (req, res) => {
  const { documentId } = req.params;

  const document = await Document.findById(documentId);

  if (!document) {
    throw new ApiError(404, "Document not found");
  }

  const isAdmin = req.user.role === "admin";
  const isOwner = req.user._id.toString() === document.userId.toString();

  if (!isAdmin && !isOwner) {
    throw new ApiError(403, "Access denied");
  }

  return res.json(
    new ApiResponse(200, document, "Document fetched")
  );
});


// ─── 4. Verify Document (Admin) ───────────────────────────────────────────────
export const verifyDocument = asyncHandler(async (req, res) => {
  const { documentId } = req.params;

  const document = await Document.findById(documentId);

  if (!document) {
    throw new ApiError(404, "Document not found");
  }

  document.status = "verified";
  document.verifiedBy = req.user._id;

  await document.save();

  return res.json(
    new ApiResponse(200, document, "Document verified")
  );
});


// ─── 5. Reject Document (Admin) ───────────────────────────────────────────────
export const rejectDocument = asyncHandler(async (req, res) => {
  const { documentId } = req.params;
  const { reason } = req.body;

  const document = await Document.findById(documentId);

  if (!document) {
    throw new ApiError(404, "Document not found");
  }

  document.status = "rejected";
  document.rejectionReason = reason;

  await document.save();

  return res.json(
    new ApiResponse(200, document, "Document rejected")
  );
});


// ─── 6. Delete Document ───────────────────────────────────────────────────────
export const deleteDocument = asyncHandler(async (req, res) => {
  const { documentId } = req.params;

  const document = await Document.findById(documentId);

  if (!document) {
    throw new ApiError(404, "Document not found");
  }

  const isOwner = req.user._id.toString() === document.userId.toString();
  const isAdmin = req.user.role === "admin";

  if (!isOwner && !isAdmin) {
    throw new ApiError(403, "Not allowed to delete this document");
  }

  await document.deleteOne();

  return res.json(
    new ApiResponse(200, null, "Document deleted")
  );
});
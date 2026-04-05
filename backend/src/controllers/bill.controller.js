import Bill from "../models/Bill.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";

const BILL_PAGE_SIZE = 20;

export const createBill = asyncHandler(async (req, res) => {
    const {
        flatId,
        tenantId,
        month,
        rentAmount,
        electricityBill,
        maintenance,
        dueDate,
    } = req.body;

    if (!flatId || !tenantId || !month || !rentAmount || !dueDate) {
        throw new ApiError(400, "Required fields missing");
    }

    const existingBill = await Bill.findOne({ flatId, tenantId, month });
    if (existingBill) {
        throw new ApiError(400, "Bill already exists for this month");
    }

    const bill = await Bill.create({
        flatId,
        tenantId,
        month,
        rentAmount,
        electricityBill,
        maintenance,
        dueDate,
    });

    return res
        .status(201)
        .json(new ApiResponse(201, bill.toPublicJSON(), "Bill created"));
});


export const updateBill = asyncHandler(async (req, res) => {
    const { billId } = req.params;
    const { rentAmount, electricityBill, maintenance, dueDate } = req.body;

    const bill = await Bill.findById(billId);
    if (!bill) throw new ApiError(404, "Bill not found");
    if (!bill.isActive) throw new ApiError(400, "Cannot update a deleted bill");
    if (bill.paidOn) throw new ApiError(400, "Cannot update an already paid bill");

    const updated = await Bill.findByIdAndUpdate(
        billId,
        {
        ...(rentAmount !== undefined && { rentAmount }),
        ...(electricityBill !== undefined && { electricityBill }),
        ...(maintenance !== undefined && { maintenance }),
        ...(dueDate !== undefined && { dueDate }),
        },
        { new: true, runValidators: true }
    );

    return res.json(new ApiResponse(200, updated.toPublicJSON(), "Bill updated"));
});



export const getAllBills = asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(parseInt(req.query.limit) || BILL_PAGE_SIZE, 100);
    const skip = (page - 1) * limit;

    const [bills, total] = await Promise.all([
        Bill.find({ isActive: true })
        .populate("flatId")
        .populate("tenantId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
        Bill.countDocuments({ isActive: true }),
    ]);

    return res.json(
        new ApiResponse(200, {
        bills: bills.map((b) => b.toPublicJSON()),
        pagination: { total, page, limit, pages: Math.ceil(total / limit) },
        }, "All bills fetched")
    );
});


export const getTenantBills = asyncHandler(async (req, res) => {
    const { tenantId } = req.params;

    const isAdmin = req.user?.role === "admin";
    const isSelf = req.user?._id.toString() === tenantId;

    if (!isAdmin && !isSelf) {
        throw new ApiError(403, "Access denied");
    }

    const bills = await Bill.find({ tenantId, isActive: true })
        .sort({ createdAt: -1 });

    return res.json(
        new ApiResponse(200, bills.map((b) => b.toPublicJSON()), "Tenant bills")
    );
});



export const markAsPaid = asyncHandler(async (req, res) => {
    const { billId } = req.params;

    const bill = await Bill.findById(billId);
    if (!bill) throw new ApiError(404, "Bill not found");
    if (!bill.isActive) throw new ApiError(400, "Bill is deleted");
    if (bill.paidOn) throw new ApiError(400, "Bill is already marked as paid");

    bill.paidOn = new Date();
    await bill.save();

    return res.json(new ApiResponse(200, bill.toPublicJSON(), "Bill marked as paid"));
});



export const deleteBill = asyncHandler(async (req, res) => {
    const { billId } = req.params;

    const bill = await Bill.findById(billId);
    if (!bill) throw new ApiError(404, "Bill not found");
    if (!bill.isActive) throw new ApiError(400, "Bill is already deleted");

    bill.isActive = false;
    await bill.save();

    return res.json(new ApiResponse(200, null, "Bill deleted"));
});
import Visitor from "../models/Visitor.model.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import mongoose from "mongoose";

export const createVisitorEntry  = asyncHandler(async(req,res)=>{
    const { flatId, visitorName, phone, purpose, vehicleNumber } = req.body;

    if (!flatId || !visitorName || !phone || !purpose) {
        throw new ApiError(400, "All required fields must be provided");
    }
    const existing = await Visitor.findOne({
        phone,
        status: { $in: ["pending", "approved", "checked-in"] }
    });

    if (existing) {
        throw new ApiError(400, "Visitor already has an active request");
    }
    const newVisitor = await Visitor.create({
        flatId,
        visitorName: visitorName.trim(),
        phone,
        purpose: purpose.trim(),
        vehicleNumber,
    });

    return res.status(201).json(
        new ApiResponse(201, newVisitor.toPublicJSON(), "Visitor entry created successfully")
    );
});

export const approveVisitor = asyncHandler(async(req,res)=>{
    const {visitorId} = req.params;

    if(!mongoose.Types.ObjectId.isValid(visitorId)){
        throw new ApiError(400, "Invalid Visitor id");
    }

    const visitor = await Visitor.findById(visitorId);
    if(!visitor){
        throw new ApiError(404, "Visitor not found");
    }

    if (visitor.status !== "pending") {
        throw new ApiError(400, `Cannot approve visitor with status: ${visitor.status}`);
    }

    visitor.status = "approved";
    visitor.approvedBy= req.user._id;

    await visitor.save();

    return res.status(200).json(
        new ApiResponse(200, visitor.toPublicJSON(), "Visitor approved successfully")
    );
});

export const rejectVisitor = asyncHandler(async(req,res)=>{
    const {visitorId} = req.params;

    if(!mongoose.Types.ObjectId.isValid(visitorId)){
        throw new ApiError(400, "Invalid Visitor id");
    }

    const visitor = await Visitor.findById(visitorId);
    if(!visitor){
        throw new ApiError(404, "Visitor not found");
    }

    if (visitor.status !== "pending") {
        throw new ApiError(400, `Cannot reject visitor with status: ${visitor.status}`);
    }

    visitor.status = "rejected";
    visitor.approvedBy = req.user._id;

    await visitor.save();

    return res.status(200).json(
        new ApiResponse(200, visitor.toPublicJSON(), "Visitor rejected successfully")
    );

});

export const checkInVisitor  = asyncHandler(async(req,res)=>{
    const {visitorId} = req.params;

    if(!mongoose.Types.ObjectId.isValid(visitorId)){
        throw new ApiError(400, "Invalid Visitor id");
    }

    const visitor = await Visitor.findOneAndUpdate(
        { _id: visitorId, status: "approved" },
        { status: "checked-in", entryTime: new Date() },
        { new: true }
    );

    if (!visitor) {
        throw new ApiError(400, "Visitor not approved or already checked-in");
    }

    return res.status(200).json(
        new ApiResponse(200, visitor.toPublicJSON(), "Visitor checked in successfully")
    );
});

export const checkOutVisitor = asyncHandler(async(req,res)=>{
    const {visitorId} = req.params;

    if (!mongoose.Types.ObjectId.isValid(visitorId)) {
        throw new ApiError(400, "Invalid Visitor ID");
    }

    if (!visitor) {
        throw new ApiError(404, "Visitor not found");
    }

    if (visitor.status !== "checked-in") {
        throw new ApiError(400, `Cannot check-out visitor with status: ${visitor.status}`);
    }

    await visitor.markExit();

    return res.status(200).json(
        new ApiResponse(200, visitor.toPublicJSON(), "Visitor checked out successfully")
    );
});

export const getVisitorsByFlat = asyncHandler(async(req,res)=>{
    const { flatId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(flatId)) {
        throw new ApiError(400, "Invalid Flat ID");
    }

    const visitors = await Visitor.find({ flatId })
        .sort({ createdAt: -1 });

    const data = visitors.map(v => v.toPublicJSON());

    return res.status(200).json(
        new ApiResponse(200, data, "Visitors fetched successfully")
    );
});

export const getActiveVisitors = asyncHandler(async(req,res)=>{
    const visitors = await Visitor.find({
        status: "checked-in",
        exitTime: null
    }).sort({ entryTime: -1 });

    const data = visitors.map(v => v.toPublicJSON());

    return res.status(200).json(
        new ApiResponse(200, data, "Active visitors fetched successfully")
    );
});



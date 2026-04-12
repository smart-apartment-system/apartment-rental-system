import mongoose from "mongoose";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";
import Staff from "../models/Staff.model";
import { ApiResponse } from "../utils/apiResponse";
import Apartment from "../models/Apartment.model.js";


export const createStaff = asyncHandler(async(req,res)=>{
    const { name, role, phone, apartmentId, shift, salary } = req.body;

    if (!name || !phone || !apartmentId) {
        throw new ApiError(400, "Required fields missing");
    }

    if (!mongoose.Types.ObjectId.isValid(apartmentId)) {
        throw new ApiError(400, "Invalid Apartment ID");
    }

    const existingApartment = await Apartment.findById(apartmentId);
    if (!existingApartment) {
        throw new ApiError(404, "Apartment not found");
    }

    const existingStaff = await Staff.findOne({
        phone,
        apartmentId,
        isActive: true
    });

    if (existingStaff) {
        throw new ApiError(400, "Staff already exists in this apartment");
    }

    const staff = await Staff.create({
        name: name.trim(),
        role,
        phone,
        apartmentId,
        shift,
        salary
    });

    return res.status(201).json(
        new ApiResponse(201, staff.toPublicJSON(), "Staff created successfully")
    );

});

export const getAllStaff= asyncHandler(async(req,res)=>{
    const { role, isActive } = req.query;

    const filter = {};

    if(role){
        filter.role = role;
    }

    if(isActive != undefined){
        filter.isActive = isActive === "true";
    }

    const staffList = await Staff.find(filter).sort({createdAt: -1});

    const data = staffList.map(staff => staff.toPublicJSON());

    return res.status(200).json(
        new ApiResponse(200, data, "Staff fetched successfully")
    );
});

export const getStaffByApartment = asyncHandler(async(req,res)=>{
    
});

export const updateStaff = asyncHandler(async(req,res)=>{

});

export const deleteStaff = asyncHandler(async(req,res)=>{

});

export const toggleStaffStatus = asyncHandler(async(req,res)=>{

});

